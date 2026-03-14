package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

var (
	cfg *config.Config

	mu     sync.RWMutex
	alerts = map[int64][]alert{} // userID -> alerts
	nextID atomic.Int64
)

type alert struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Type      string    `json:"type"` // stock_low, price_change, position_drop, competitor_new, sales_drop
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Severity  string    `json:"severity"` // critical, warning, info
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("GET /api/notifications", authMw(http.HandlerFunc(handleList)))
	mux.Handle("POST /api/notifications", authMw(http.HandlerFunc(handleCreate)))
	mux.Handle("POST /api/notifications/mark-read", authMw(http.HandlerFunc(handleMarkRead)))
	mux.Handle("GET /api/notifications/unread-count", authMw(http.HandlerFunc(handleUnreadCount)))
	mux.Handle("POST /api/notifications/generate", authMw(http.HandlerFunc(handleGenerate)))

	log.Printf("Notification service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

func handleList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	mu.RLock()
	userAlerts := alerts[userID]
	mu.RUnlock()

	if userAlerts == nil {
		userAlerts = []alert{}
	}

	// Sort newest first
	sort.Slice(userAlerts, func(i, j int) bool {
		return userAlerts[i].CreatedAt.After(userAlerts[j].CreatedAt)
	})

	jsonResponse(w, http.StatusOK, userAlerts)
}

type createRequest struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	id := nextID.Add(1)
	mu.Lock()
	a := alert{
		ID:        id,
		UserID:    userID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Severity:  req.Severity,
		IsRead:    false,
		CreatedAt: time.Now(),
	}
	alerts[userID] = append(alerts[userID], a)
	mu.Unlock()

	jsonResponse(w, http.StatusCreated, a)
}

type markReadRequest struct {
	IDs []int64 `json:"ids"`
	All bool    `json:"all"`
}

func handleMarkRead(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req markReadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	mu.Lock()
	idSet := map[int64]bool{}
	for _, id := range req.IDs {
		idSet[id] = true
	}
	for i := range alerts[userID] {
		if req.All || idSet[alerts[userID][i].ID] {
			alerts[userID][i].IsRead = true
		}
	}
	mu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	mu.RLock()
	count := 0
	for _, a := range alerts[userID] {
		if !a.IsRead {
			count++
		}
	}
	mu.RUnlock()

	jsonResponse(w, http.StatusOK, map[string]int{"unread": count})
}

// --- Generate alerts from analytics data ---

type generateRequest struct {
	StockAnalysis []struct {
		NmID        int64   `json:"nm_id"`
		Name        string  `json:"name"`
		DaysOfStock float64 `json:"days_of_stock"`
		Urgency     string  `json:"urgency"`
	} `json:"stock_analysis"`
	SalesTrends []struct {
		NmID       int64   `json:"nm_id"`
		Name       string  `json:"name"`
		Trend      string  `json:"trend"`
		GrowthRate float64 `json:"growth_rate_pct"`
	} `json:"sales_trends"`
	PositionChanges []struct {
		NmID     int64  `json:"nm_id"`
		Keyword  string `json:"keyword"`
		OldPos   int    `json:"old_position"`
		NewPos   int    `json:"new_position"`
	} `json:"position_changes"`
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req generateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var generated []alert

	// Stock alerts
	for _, s := range req.StockAnalysis {
		if s.Urgency == "critical" {
			generated = append(generated, createAlert(userID, "stock_low", "critical",
				"Критически мало остатков: "+s.Name,
				formatf("Товар %s — осталось на %.0f дней. Срочно нужна поставка!", s.Name, s.DaysOfStock),
			))
		} else if s.Urgency == "warning" {
			generated = append(generated, createAlert(userID, "stock_low", "warning",
				"Остатки заканчиваются: "+s.Name,
				formatf("Товар %s — осталось на %.0f дней. Запланируйте поставку.", s.Name, s.DaysOfStock),
			))
		}
	}

	// Sales trend alerts
	for _, t := range req.SalesTrends {
		if t.Trend == "declining" && t.GrowthRate < -30 {
			generated = append(generated, createAlert(userID, "sales_drop", "warning",
				"Падение продаж: "+t.Name,
				formatf("Продажи %s упали на %.0f%% за последние 2 недели.", t.Name, -t.GrowthRate),
			))
		}
	}

	// Position change alerts
	for _, p := range req.PositionChanges {
		if p.NewPos > p.OldPos+10 {
			generated = append(generated, createAlert(userID, "position_drop", "warning",
				formatf("Позиция упала: %s", p.Keyword),
				formatf("NmID %d: позиция по \"%s\" упала с %d на %d.", p.NmID, p.Keyword, p.OldPos, p.NewPos),
			))
		}
	}

	mu.Lock()
	alerts[userID] = append(alerts[userID], generated...)
	mu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"generated": len(generated),
		"alerts":    generated,
	})
}

func createAlert(userID int64, alertType, severity, title, message string) alert {
	id := nextID.Add(1)
	return alert{
		ID:        id,
		UserID:    userID,
		Type:      alertType,
		Title:     title,
		Message:   message,
		Severity:  severity,
		IsRead:    false,
		CreatedAt: time.Now(),
	}
}

func formatf(format string, args ...interface{}) string {
	return fmt.Sprintf(format, args...)
}

// --- Helpers ---

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
