package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// In-memory store; replace with DB in production.
var (
	cfg *config.Config

	mu          sync.RWMutex
	salesData   = map[int64][]wbapi.WBSale{}  // userID -> sales
	ordersData  = map[int64][]wbapi.WBOrder{} // userID -> orders
	stocksData  = map[int64][]wbapi.WBStock{} // userID -> stocks
	lastSync    = map[int64]time.Time{}

	// Simulated API key store — in production, fetched from auth service.
	userAPIKeys = map[int64]string{} // userID -> WB API key
)

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()

	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	// Register API key for collection
	mux.Handle("POST /api/collector/register-key", authMw(http.HandlerFunc(handleRegisterKey)))
	// Trigger manual sync
	mux.Handle("POST /api/collector/sync", authMw(http.HandlerFunc(handleSync)))
	// Get collected data
	mux.Handle("GET /api/collector/sales", authMw(http.HandlerFunc(handleGetSales)))
	mux.Handle("GET /api/collector/orders", authMw(http.HandlerFunc(handleGetOrders)))
	mux.Handle("GET /api/collector/stocks", authMw(http.HandlerFunc(handleGetStocks)))
	// Status
	mux.Handle("GET /api/collector/status", authMw(http.HandlerFunc(handleStatus)))

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

	mu.Lock()
	userAPIKeys[userID] = req.APIKey
	mu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]string{"status": "registered"})
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	mu.RLock()
	apiKey, ok := userAPIKeys[userID]
	mu.RUnlock()

	if !ok {
		httpError(w, "no API key registered, call POST /api/collector/register-key first", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient(apiKey)
	dateFrom := time.Now().AddDate(0, 0, -30)

	// Fetch all data concurrently
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

	mu.Lock()
	salesData[userID] = res.sales
	ordersData[userID] = res.orders
	stocksData[userID] = res.stocks
	lastSync[userID] = time.Now()
	mu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "synced",
		"sales":   len(res.sales),
		"orders":  len(res.orders),
		"stocks":  len(res.stocks),
		"synced_at": time.Now().Format(time.RFC3339),
	})
}

func handleGetSales(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	data := salesData[userID]
	mu.RUnlock()
	jsonResponse(w, http.StatusOK, data)
}

func handleGetOrders(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	data := ordersData[userID]
	mu.RUnlock()
	jsonResponse(w, http.StatusOK, data)
}

func handleGetStocks(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	data := stocksData[userID]
	mu.RUnlock()
	jsonResponse(w, http.StatusOK, data)
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	_, hasKey := userAPIKeys[userID]
	ls := lastSync[userID]
	salesCount := len(salesData[userID])
	ordersCount := len(ordersData[userID])
	stocksCount := len(stocksData[userID])
	mu.RUnlock()

	status := "not_configured"
	if hasKey {
		status = "ready"
	}
	if !ls.IsZero() {
		status = "synced"
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":    status,
		"last_sync": ls.Format(time.RFC3339),
		"sales":     salesCount,
		"orders":    ordersCount,
		"stocks":    stocksCount,
	})
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
