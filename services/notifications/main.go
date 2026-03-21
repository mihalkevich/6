package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/database"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

//go:embed migrations.sql
var migrationSQL string

var (
	cfg *config.Config
	db  *pgxpool.Pool
)

type alert struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Severity  string    `json:"severity"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func main() {
	cfg = config.Load()
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

	mux.Handle("GET /api/notifications", authMw(http.HandlerFunc(handleList)))
	mux.Handle("POST /api/notifications", authMw(http.HandlerFunc(handleCreate)))
	mux.Handle("POST /api/notifications/mark-read", authMw(http.HandlerFunc(handleMarkRead)))
	mux.Handle("GET /api/notifications/unread-count", authMw(http.HandlerFunc(handleUnreadCount)))
	mux.Handle("POST /api/notifications/generate", authMw(http.HandlerFunc(handleGenerate)))

	// Phase 7: Smart Alerts & Channels
	mux.Handle("POST /api/notifications/smart-alerts", authMw(http.HandlerFunc(handleSmartAlerts)))
	mux.Handle("POST /api/notifications/channels", authMw(http.HandlerFunc(handleConfigureChannels)))
	mux.Handle("GET /api/notifications/channels", authMw(http.HandlerFunc(handleGetChannels)))
	mux.Handle("POST /api/notifications/dispatch", authMw(http.HandlerFunc(handleDispatch)))
	mux.Handle("POST /api/notifications/test-channel", authMw(http.HandlerFunc(handleTestChannel)))
	mux.Handle("GET /api/notifications/rules", authMw(http.HandlerFunc(handleGetRules)))
	mux.Handle("POST /api/notifications/rules", authMw(http.HandlerFunc(handleUpdateRules)))
	mux.Handle("POST /api/notifications/digest", authMw(http.HandlerFunc(handleDigest)))

	log.Printf("Notification service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

func handleList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rows, err := db.Query(r.Context(),
		`SELECT id, user_id, alert_type, title, message, severity, is_read, created_at
		 FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`, userID,
	)
	if err != nil {
		jsonResponse(w, http.StatusOK, []alert{})
		return
	}
	defer rows.Close()

	var alerts []alert
	for rows.Next() {
		var a alert
		if err := rows.Scan(&a.ID, &a.UserID, &a.Type, &a.Title, &a.Message, &a.Severity, &a.IsRead, &a.CreatedAt); err != nil {
			continue
		}
		alerts = append(alerts, a)
	}
	if alerts == nil {
		alerts = []alert{}
	}
	jsonResponse(w, http.StatusOK, alerts)
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

	a := alert{
		UserID:    userID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Severity:  req.Severity,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	err := db.QueryRow(r.Context(),
		`INSERT INTO alerts (user_id, alert_type, title, message, severity)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		a.UserID, a.Type, a.Title, a.Message, a.Severity,
	).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		httpError(w, "database error", http.StatusInternalServerError)
		return
	}

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

	if req.All {
		db.Exec(r.Context(),
			`UPDATE alerts SET is_read = TRUE WHERE user_id = $1`, userID)
	} else if len(req.IDs) > 0 {
		db.Exec(r.Context(),
			`UPDATE alerts SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)`,
			userID, req.IDs)
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var count int
	db.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_read = FALSE`, userID,
	).Scan(&count)

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
		NmID    int64  `json:"nm_id"`
		Keyword string `json:"keyword"`
		OldPos  int    `json:"old_position"`
		NewPos  int    `json:"new_position"`
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

	for _, s := range req.StockAnalysis {
		if s.Urgency == "critical" {
			generated = append(generated, createAlertObj(userID, "stock_low", "critical",
				"Критически мало остатков: "+s.Name,
				fmt.Sprintf("Товар %s — осталось на %.0f дней. Срочно нужна поставка!", s.Name, s.DaysOfStock),
			))
		} else if s.Urgency == "warning" {
			generated = append(generated, createAlertObj(userID, "stock_low", "warning",
				"Остатки заканчиваются: "+s.Name,
				fmt.Sprintf("Товар %s — осталось на %.0f дней. Запланируйте поставку.", s.Name, s.DaysOfStock),
			))
		}
	}

	for _, t := range req.SalesTrends {
		if t.Trend == "declining" && t.GrowthRate < -30 {
			generated = append(generated, createAlertObj(userID, "sales_drop", "warning",
				"Падение продаж: "+t.Name,
				fmt.Sprintf("Продажи %s упали на %.0f%% за последние 2 недели.", t.Name, -t.GrowthRate),
			))
		}
	}

	for _, p := range req.PositionChanges {
		if p.NewPos > p.OldPos+10 {
			generated = append(generated, createAlertObj(userID, "position_drop", "warning",
				fmt.Sprintf("Позиция упала: %s", p.Keyword),
				fmt.Sprintf("NmID %d: позиция по \"%s\" упала с %d на %d.", p.NmID, p.Keyword, p.OldPos, p.NewPos),
			))
		}
	}

	// Persist all generated alerts
	generated = persistAlerts(r.Context(), generated)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"generated": len(generated),
		"alerts":    generated,
	})
}

func createAlertObj(userID int64, alertType, severity, title, message string) alert {
	return alert{
		UserID:    userID,
		Type:      alertType,
		Title:     title,
		Message:   message,
		Severity:  severity,
		IsRead:    false,
		CreatedAt: time.Now(),
	}
}

// persistAlerts saves alerts to PostgreSQL and returns them with IDs.
func persistAlerts(ctx context.Context, alerts []alert) []alert {
	for i := range alerts {
		err := db.QueryRow(ctx,
			`INSERT INTO alerts (user_id, alert_type, title, message, severity)
			 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
			alerts[i].UserID, alerts[i].Type, alerts[i].Title, alerts[i].Message, alerts[i].Severity,
		).Scan(&alerts[i].ID, &alerts[i].CreatedAt)
		if err != nil {
			log.Printf("Failed to persist alert: %v", err)
		}
	}
	return alerts
}

// getRecentAlerts loads recent alerts for deduplication checks.
func getRecentAlerts(ctx context.Context, userID int64, since time.Time) []alert {
	rows, err := db.Query(ctx,
		`SELECT id, alert_type, title, message, severity, is_read, created_at
		 FROM alerts WHERE user_id = $1 AND created_at > $2 ORDER BY created_at DESC`,
		userID, since,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var result []alert
	for rows.Next() {
		var a alert
		a.UserID = userID
		if err := rows.Scan(&a.ID, &a.Type, &a.Title, &a.Message, &a.Severity, &a.IsRead, &a.CreatedAt); err != nil {
			continue
		}
		result = append(result, a)
	}
	return result
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
