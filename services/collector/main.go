package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var (
	cfg            *config.Config
	authServiceURL string

	mu         sync.RWMutex
	salesData  = map[int64][]wbapi.WBSale{}
	ordersData = map[int64][]wbapi.WBOrder{}
	stocksData = map[int64][]wbapi.WBStock{}
	lastSync   = map[int64]time.Time{}

	userAPIKeys = map[int64]string{} // userID -> WB API key (cached)
)

func main() {
	cfg = config.Load()
	authServiceURL = envOrDefault("AUTH_SERVICE_URL", "http://localhost:8081")

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	// Register API key directly
	mux.Handle("POST /api/collector/register-key", authMw(http.HandlerFunc(handleRegisterKey)))
	// Sync data from WB (accepts api_key_id or uses cached key)
	mux.Handle("POST /api/collector/sync", authMw(http.HandlerFunc(handleSync)))
	// Get collected data — support both GET and POST
	mux.Handle("GET /api/collector/sales", authMw(http.HandlerFunc(handleGetSales)))
	mux.Handle("POST /api/collector/sales", authMw(http.HandlerFunc(handleGetSales)))
	mux.Handle("GET /api/collector/orders", authMw(http.HandlerFunc(handleGetOrders)))
	mux.Handle("POST /api/collector/orders", authMw(http.HandlerFunc(handleGetOrders)))
	mux.Handle("GET /api/collector/stocks", authMw(http.HandlerFunc(handleGetStocks)))
	mux.Handle("POST /api/collector/stocks", authMw(http.HandlerFunc(handleGetStocks)))
	// Status
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

	mu.Lock()
	userAPIKeys[userID] = req.APIKey
	mu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]string{"status": "registered"})
}

type syncRequest struct {
	APIKeyID int64 `json:"api_key_id"`
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req syncRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Try to resolve API key: first from api_key_id via auth service, then cached
	apiKey := ""
	if req.APIKeyID > 0 {
		resolved, err := resolveKeyFromAuth(req.APIKeyID, r.Header.Get("Authorization"))
		if err != nil {
			log.Printf("Failed to resolve key %d from auth: %v", req.APIKeyID, err)
		} else {
			apiKey = resolved
			mu.Lock()
			userAPIKeys[userID] = apiKey
			mu.Unlock()
		}
	}

	if apiKey == "" {
		mu.RLock()
		apiKey = userAPIKeys[userID]
		mu.RUnlock()
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

	mu.Lock()
	salesData[userID] = res.sales
	ordersData[userID] = res.orders
	stocksData[userID] = res.stocks
	lastSync[userID] = time.Now()
	mu.Unlock()

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
	mu.RLock()
	data := salesData[userID]
	mu.RUnlock()
	if data == nil {
		data = []wbapi.WBSale{}
	}
	jsonResponse(w, http.StatusOK, data)
}

func handleGetOrders(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	data := ordersData[userID]
	mu.RUnlock()
	if data == nil {
		data = []wbapi.WBOrder{}
	}
	jsonResponse(w, http.StatusOK, data)
}

func handleGetStocks(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	mu.RLock()
	data := stocksData[userID]
	mu.RUnlock()
	if data == nil {
		data = []wbapi.WBStock{}
	}
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

// resolveKeyFromAuth calls the auth service to decrypt a WB API key by ID.
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
