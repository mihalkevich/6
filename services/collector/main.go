package main

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/database"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

//go:embed migrations.sql
var migrationSQL string

var (
	cfg            *config.Config
	db             *pgxpool.Pool
	authServiceURL string
)

func main() {
	cfg = config.Load()
	authServiceURL = envOrDefault("AUTH_SERVICE_URL", "http://localhost:8081")
	ctx := context.Background()

	var err error
	db, err = database.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(ctx, db, migrationSQL); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("POST /api/collector/register-key", authMw(http.HandlerFunc(handleRegisterKey)))
	mux.Handle("POST /api/collector/sync", authMw(http.HandlerFunc(handleSync)))
	mux.Handle("GET /api/collector/sales", authMw(http.HandlerFunc(handleGetSales)))
	mux.Handle("POST /api/collector/sales", authMw(http.HandlerFunc(handleGetSales)))
	mux.Handle("GET /api/collector/orders", authMw(http.HandlerFunc(handleGetOrders)))
	mux.Handle("POST /api/collector/orders", authMw(http.HandlerFunc(handleGetOrders)))
	mux.Handle("GET /api/collector/stocks", authMw(http.HandlerFunc(handleGetStocks)))
	mux.Handle("POST /api/collector/stocks", authMw(http.HandlerFunc(handleGetStocks)))
	mux.Handle("GET /api/collector/status", authMw(http.HandlerFunc(handleStatus)))
	mux.Handle("POST /api/collector/status", authMw(http.HandlerFunc(handleStatus)))

	log.Printf("Collector service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

type registerKeyReq struct {
	APIKey string `json:"api_key"`
}

func handleRegisterKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	var req registerKeyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.APIKey == "" {
		httpError(w, "api_key required", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(r.Context(),
		`INSERT INTO sync_status (user_id, wb_api_key) VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET wb_api_key = $2`,
		userID, req.APIKey,
	)
	if err != nil {
		httpError(w, "database error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "registered"})
}

type syncRequest struct {
	APIKeyID int64 `json:"api_key_id"`
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req syncRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Resolve API key
	apiKey := ""
	if req.APIKeyID > 0 {
		resolved, err := resolveKeyFromAuth(req.APIKeyID, r.Header.Get("Authorization"))
		if err != nil {
			log.Printf("Failed to resolve key %d from auth: %v", req.APIKeyID, err)
		} else {
			apiKey = resolved
			// Cache key in sync_status
			db.Exec(r.Context(),
				`INSERT INTO sync_status (user_id, wb_api_key) VALUES ($1, $2)
				 ON CONFLICT (user_id) DO UPDATE SET wb_api_key = $2`,
				userID, apiKey,
			)
		}
	}

	if apiKey == "" {
		// Try cached key from DB
		db.QueryRow(r.Context(),
			`SELECT wb_api_key FROM sync_status WHERE user_id = $1`, userID,
		).Scan(&apiKey)
	}

	if apiKey == "" {
		httpError(w, "no API key: add a key in Settings, then sync", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient(apiKey)
	dateFrom := time.Now().AddDate(0, 0, -30)

	type result struct {
		sales  []wbapi.WBSale
		orders []wbapi.WBOrder
		stocks []wbapi.WBStock
		err    error
	}

	ch := make(chan result, 1)
	go func() {
		var res result
		var wg sync.WaitGroup
		var salesErr, ordersErr, stocksErr error

		wg.Add(3)
		go func() {
			defer wg.Done()
			res.sales, salesErr = client.GetSales(dateFrom)
		}()
		go func() {
			defer wg.Done()
			res.orders, ordersErr = client.GetOrders(dateFrom)
		}()
		go func() {
			defer wg.Done()
			res.stocks, stocksErr = client.GetStocks(dateFrom)
		}()
		wg.Wait()

		if salesErr != nil {
			res.err = salesErr
		} else if ordersErr != nil {
			res.err = ordersErr
		} else if stocksErr != nil {
			res.err = stocksErr
		}
		ch <- res
	}()

	res := <-ch
	if res.err != nil {
		httpError(w, "sync failed: "+res.err.Error(), http.StatusBadGateway)
		return
	}

	ctx := r.Context()

	// Persist sales
	for _, s := range res.sales {
		saleDate := parseWBDate(s.Date)
		isReturn := len(s.SaleID) > 0 && s.SaleID[0] == 'R'
		db.Exec(ctx,
			`INSERT INTO sales (user_id, sale_id, nm_id, supplier_article, tech_size, barcode,
			 total_price, discount_percent, for_pay, finished_price, price_with_disc,
			 warehouse_name, country_name, region_name, subject, category, brand,
			 sale_date, is_return)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
			 ON CONFLICT (user_id, sale_id) DO NOTHING`,
			userID, s.SaleID, s.NmId, s.SupplierArticle, s.TechSize, s.Barcode,
			s.TotalPrice, s.DiscountPercent, s.ForPay, s.FinishedPrice, s.PriceWithDisc,
			s.WarehouseName, s.CountryName, s.RegionName, s.Subject, s.Category, s.Brand,
			saleDate, isReturn,
		)
	}

	// Persist orders
	for _, o := range res.orders {
		orderDate := parseWBDate(o.Date)
		db.Exec(ctx,
			`INSERT INTO orders (user_id, odid, nm_id, supplier_article, tech_size, barcode,
			 total_price, discount_percent, warehouse_name, oblast, subject, category, brand,
			 order_date, is_cancel)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
			 ON CONFLICT (user_id, odid) DO NOTHING`,
			userID, o.Odid, o.NmId, o.SupplierArticle, o.TechSize, o.Barcode,
			o.TotalPrice, o.DiscountPercent, o.WarehouseName, o.Oblast,
			o.Subject, o.Category, o.Brand, orderDate, o.IsCancel,
		)
	}

	// Persist stocks (upsert — replace current snapshot)
	// First delete old stocks for this user, then insert fresh
	db.Exec(ctx, `DELETE FROM stocks WHERE user_id = $1`, userID)
	for _, st := range res.stocks {
		db.Exec(ctx,
			`INSERT INTO stocks (user_id, nm_id, supplier_article, tech_size, barcode,
			 warehouse_name, quantity, quantity_full, quantity_not_in_orders,
			 in_way_to_client, in_way_from_client, subject, category, brand,
			 price, discount, updated_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
			userID, st.NmId, st.SupplierArticle, st.TechSize, st.Barcode,
			st.WarehouseName, st.Quantity, st.QuantityFull, st.QuantityNotInOrders,
			st.InWayToClient, st.InWayFromClient, st.Subject, st.Category, st.Brand,
			st.Price, st.Discount,
		)
	}

	// Update sync status
	db.Exec(ctx,
		`INSERT INTO sync_status (user_id, last_sync_at, sales_count, orders_count, stocks_count)
		 VALUES ($1, NOW(), $2, $3, $4)
		 ON CONFLICT (user_id) DO UPDATE SET
		   last_sync_at = NOW(), sales_count = $2, orders_count = $3, stocks_count = $4`,
		userID, len(res.sales), len(res.orders), len(res.stocks),
	)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":    "synced",
		"sales":     len(res.sales),
		"orders":    len(res.orders),
		"stocks":    len(res.stocks),
		"synced_at": time.Now().Format(time.RFC3339),
	})
}

func handleGetSales(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rows, err := db.Query(r.Context(),
		`SELECT sale_id, nm_id, supplier_article, tech_size, barcode,
		 total_price, discount_percent, for_pay, finished_price, price_with_disc,
		 warehouse_name, country_name, region_name, subject, category, brand,
		 sale_date, is_return
		 FROM sales WHERE user_id = $1 ORDER BY sale_date DESC`, userID,
	)
	if err != nil {
		jsonResponse(w, http.StatusOK, []wbapi.WBSale{})
		return
	}
	defer rows.Close()

	var sales []wbapi.WBSale
	for rows.Next() {
		var s wbapi.WBSale
		var saleDate time.Time
		var isReturn bool
		err := rows.Scan(
			&s.SaleID, &s.NmId, &s.SupplierArticle, &s.TechSize, &s.Barcode,
			&s.TotalPrice, &s.DiscountPercent, &s.ForPay, &s.FinishedPrice, &s.PriceWithDisc,
			&s.WarehouseName, &s.CountryName, &s.RegionName, &s.Subject, &s.Category, &s.Brand,
			&saleDate, &isReturn,
		)
		if err != nil {
			continue
		}
		s.Date = saleDate.Format("2006-01-02T15:04:05")
		if isReturn && len(s.SaleID) > 0 && s.SaleID[0] != 'R' {
			s.SaleID = "R" + s.SaleID
		}
		sales = append(sales, s)
	}
	if sales == nil {
		sales = []wbapi.WBSale{}
	}
	jsonResponse(w, http.StatusOK, sales)
}

func handleGetOrders(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rows, err := db.Query(r.Context(),
		`SELECT odid, nm_id, supplier_article, tech_size, barcode,
		 total_price, discount_percent, warehouse_name, oblast,
		 subject, category, brand, order_date, is_cancel
		 FROM orders WHERE user_id = $1 ORDER BY order_date DESC`, userID,
	)
	if err != nil {
		jsonResponse(w, http.StatusOK, []wbapi.WBOrder{})
		return
	}
	defer rows.Close()

	var orders []wbapi.WBOrder
	for rows.Next() {
		var o wbapi.WBOrder
		var orderDate time.Time
		err := rows.Scan(
			&o.Odid, &o.NmId, &o.SupplierArticle, &o.TechSize, &o.Barcode,
			&o.TotalPrice, &o.DiscountPercent, &o.WarehouseName, &o.Oblast,
			&o.Subject, &o.Category, &o.Brand, &orderDate, &o.IsCancel,
		)
		if err != nil {
			continue
		}
		o.Date = orderDate.Format("2006-01-02T15:04:05")
		orders = append(orders, o)
	}
	if orders == nil {
		orders = []wbapi.WBOrder{}
	}
	jsonResponse(w, http.StatusOK, orders)
}

func handleGetStocks(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rows, err := db.Query(r.Context(),
		`SELECT nm_id, supplier_article, tech_size, barcode,
		 warehouse_name, quantity, quantity_full, quantity_not_in_orders,
		 in_way_to_client, in_way_from_client, subject, category, brand,
		 price, discount
		 FROM stocks WHERE user_id = $1`, userID,
	)
	if err != nil {
		jsonResponse(w, http.StatusOK, []wbapi.WBStock{})
		return
	}
	defer rows.Close()

	var stocks []wbapi.WBStock
	for rows.Next() {
		var s wbapi.WBStock
		err := rows.Scan(
			&s.NmId, &s.SupplierArticle, &s.TechSize, &s.Barcode,
			&s.WarehouseName, &s.Quantity, &s.QuantityFull, &s.QuantityNotInOrders,
			&s.InWayToClient, &s.InWayFromClient, &s.Subject, &s.Category, &s.Brand,
			&s.Price, &s.Discount,
		)
		if err != nil {
			continue
		}
		stocks = append(stocks, s)
	}
	if stocks == nil {
		stocks = []wbapi.WBStock{}
	}
	jsonResponse(w, http.StatusOK, stocks)
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var hasKey bool
	var lastSync *time.Time
	var salesCount, ordersCount, stocksCount int

	err := db.QueryRow(r.Context(),
		`SELECT wb_api_key != '', last_sync_at, sales_count, orders_count, stocks_count
		 FROM sync_status WHERE user_id = $1`, userID,
	).Scan(&hasKey, &lastSync, &salesCount, &ordersCount, &stocksCount)

	status := "not_configured"
	lastSyncStr := ""
	if err == nil {
		if hasKey {
			status = "ready"
		}
		if lastSync != nil {
			status = "synced"
			lastSyncStr = lastSync.Format(time.RFC3339)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":    status,
		"last_sync": lastSyncStr,
		"sales":     salesCount,
		"orders":    ordersCount,
		"stocks":    stocksCount,
	})
}

func resolveKeyFromAuth(keyID int64, authHeader string) (string, error) {
	body, _ := json.Marshal(map[string]int64{"key_id": keyID})
	req, err := http.NewRequest("POST", authServiceURL+"/api/keys/resolve", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", authHeader)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("auth service unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("auth returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		WBToken string `json:"wb_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.WBToken, nil
}

func parseWBDate(s string) time.Time {
	// Try common WB date formats
	for _, layout := range []string{
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
	} {
		if t, err := time.Parse(layout, strings.TrimSpace(s)); err == nil {
			return t
		}
	}
	return time.Now()
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func httpError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonResponse(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
