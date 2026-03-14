package main

import (
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
)

var cfg *config.Config

// Service registry: prefix -> backend URL
var serviceRoutes = map[string]string{
	"/api/auth":          envOrDefault("AUTH_SERVICE_URL", "http://localhost:8081"),
	"/api/me":            envOrDefault("AUTH_SERVICE_URL", "http://localhost:8081"),
	"/api/keys":          envOrDefault("AUTH_SERVICE_URL", "http://localhost:8081"),
	"/api/collector":     envOrDefault("COLLECTOR_SERVICE_URL", "http://localhost:8082"),
	"/api/stock":         envOrDefault("STOCK_SERVICE_URL", "http://localhost:8083"),
	"/api/sales":         envOrDefault("SALES_SERVICE_URL", "http://localhost:8084"),
	"/api/competitors":   envOrDefault("COMPETITOR_SERVICE_URL", "http://localhost:8085"),
	"/api/seo":           envOrDefault("SEO_SERVICE_URL", "http://localhost:8086"),
	"/api/notifications": envOrDefault("NOTIFICATION_SERVICE_URL", "http://localhost:8087"),
}

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok","service":"gateway"}`)
	})

	// Service status
	mux.HandleFunc("GET /api/services", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{
			"services": [
				{"name": "auth", "prefix": "/api/auth", "description": "Authentication & API Keys"},
				{"name": "collector", "prefix": "/api/collector", "description": "WB Data Collector"},
				{"name": "stock-analytics", "prefix": "/api/stock", "description": "Stock & Supply Analysis"},
				{"name": "sales-analytics", "prefix": "/api/sales", "description": "Sales Dashboard, Funnels, ABC, Trends"},
				{"name": "competitor", "prefix": "/api/competitors", "description": "Competitor Analysis & Price Compare"},
				{"name": "seo", "prefix": "/api/seo", "description": "SEO & Keyword Position Tracking"},
				{"name": "notifications", "prefix": "/api/notifications", "description": "Alerts & Notifications"}
			]
		}`)
	})

	// Proxy all /api/* requests to appropriate services
	mux.HandleFunc("/api/", handleProxy)

	// CORS middleware
	handler := corsMiddleware(mux)

	log.Printf("API Gateway starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, handler))
}

func handleProxy(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Find matching service
	var targetURL string
	for prefix, svcURL := range serviceRoutes {
		if strings.HasPrefix(path, prefix) {
			targetURL = svcURL
			break
		}
	}

	if targetURL == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		io.WriteString(w, `{"error":"service not found"}`)
		return
	}

	target, err := url.Parse(targetURL)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		io.WriteString(w, `{"error":"invalid service URL"}`)
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		io.WriteString(w, `{"error":"service unavailable: `+err.Error()+`"}`)
	}

	proxy.ServeHTTP(w, r)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
