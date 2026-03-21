package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/database"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

//go:embed migrations.sql
var migrationSQL string

const (
	maxConcurrent   = 3
	maxSearchPages  = 10
	rateLimitDelay  = 200 * time.Millisecond
	rateLimitJitter = 300 * time.Millisecond
	batchSize       = 50
)

var (
	cfg           *config.Config
	db            *pgxpool.Pool
	searchLimiter = make(chan struct{}, maxConcurrent)
)

type kwGroup struct {
	keyword string
	items   []trackedKeyword
	nmIDs   map[int64]bool
}

type trackedKeyword struct {
	ID             int64  `json:"id"`
	UserID         int64  `json:"user_id"`
	NmID           int64  `json:"nm_id"`
	Keyword        string `json:"keyword"`
	AlertThreshold int    `json:"alert_threshold"`
	LastPosition   int    `json:"last_position"`
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

	interval := cfg.CollectorInterval // reuse COLLECTOR_INTERVAL (default 30 min)
	if envInterval := os.Getenv("SCHEDULER_INTERVAL"); envInterval != "" {
		if d, err := time.ParseDuration(envInterval); err == nil {
			interval = d
		}
	}

	// HTTP health endpoint
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "scheduler"})
		})
		mux.HandleFunc("POST /api/scheduler/run-now", func(w http.ResponseWriter, r *http.Request) {
			go runCheckCycle()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "triggered"})
		})
		log.Printf("Scheduler health endpoint on :%s", cfg.HTTPPort)
		http.ListenAndServe(":"+cfg.HTTPPort, mux)
	}()

	log.Printf("Scheduler started, interval=%s", interval)

	// Run immediately on startup, then on ticker
	runCheckCycle()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		runCheckCycle()
	}
}

func runCheckCycle() {
	start := time.Now()
	log.Println("Scheduler: starting position check cycle")

	ctx := context.Background()

	// Find keywords due for checking
	rows, err := db.Query(ctx,
		`SELECT id, user_id, nm_id, keyword, alert_threshold, last_position
		 FROM tracked_keywords
		 WHERE is_active = TRUE
		   AND (last_checked_at IS NULL
		        OR last_checked_at + (check_interval_min || ' minutes')::interval <= NOW())
		 ORDER BY last_checked_at ASC NULLS FIRST
		 LIMIT $1`, batchSize,
	)
	if err != nil {
		log.Printf("Scheduler: failed to fetch due keywords: %v", err)
		return
	}

	var keywords []trackedKeyword
	for rows.Next() {
		var tk trackedKeyword
		if err := rows.Scan(&tk.ID, &tk.UserID, &tk.NmID, &tk.Keyword,
			&tk.AlertThreshold, &tk.LastPosition); err != nil {
			continue
		}
		keywords = append(keywords, tk)
	}
	rows.Close()

	if len(keywords) == 0 {
		log.Println("Scheduler: no keywords due for checking")
		return
	}

	log.Printf("Scheduler: checking %d keywords", len(keywords))

	// Group by keyword to avoid redundant searches
	groups := map[string]*kwGroup{}
	for _, tk := range keywords {
		g, ok := groups[tk.Keyword]
		if !ok {
			g = &kwGroup{
				keyword: tk.Keyword,
				nmIDs:   map[int64]bool{},
			}
			groups[tk.Keyword] = g
		}
		g.items = append(g.items, tk)
		g.nmIDs[tk.NmID] = true
	}

	// Check positions for each keyword group concurrently
	client := wbapi.NewClient("")
	var wg sync.WaitGroup

	for _, g := range groups {
		wg.Add(1)
		go func(group *kwGroup) {
			defer wg.Done()
			searchLimiter <- struct{}{}
			defer func() { <-searchLimiter }()

			checkKeywordGroup(ctx, client, group)
		}(g)
	}

	wg.Wait()

	log.Printf("Scheduler: check cycle completed in %s", time.Since(start))
}

func checkKeywordGroup(ctx context.Context, client *wbapi.Client, group *kwGroup) {
	found := map[int64]int{} // nmID -> position

	for page := 1; page <= maxSearchPages; page++ {
		jitter := time.Duration(rand.Int63n(int64(rateLimitJitter)))
		time.Sleep(rateLimitDelay + jitter)

		result, err := client.SearchProducts(group.keyword, page)
		if err != nil {
			log.Printf("Scheduler: search error keyword=%q page=%d: %v", group.keyword, page, err)
			break
		}

		for pos, p := range result.Data.Products {
			if group.nmIDs[p.ID] {
				globalPos := (page-1)*100 + pos + 1
				if _, ok := found[p.ID]; !ok {
					found[p.ID] = globalPos
				}
			}
		}

		// Early exit if all products found
		if len(found) == len(group.nmIDs) {
			break
		}
	}

	// Process results for each tracked item
	for _, tk := range group.items {
		newPos, ok := found[tk.NmID]
		if !ok {
			newPos = 0 // not found
		}

		// Save position to history
		if newPos > 0 {
			db.Exec(ctx,
				`INSERT INTO keyword_positions (user_id, nm_id, keyword, position, page, checked_at)
				 VALUES ($1, $2, $3, $4, $5, NOW())`,
				tk.UserID, tk.NmID, tk.Keyword, newPos, (newPos-1)/100+1,
			)
		}

		// Update tracked keyword
		db.Exec(ctx,
			`UPDATE tracked_keywords SET last_checked_at = NOW(), last_position = $1
			 WHERE id = $2`,
			newPos, tk.ID,
		)

		// Check if alert is needed
		if tk.LastPosition > 0 && newPos > 0 {
			posChange := newPos - tk.LastPosition
			if posChange > tk.AlertThreshold {
				// Position dropped significantly
				generatePositionAlert(ctx, tk, newPos, "warning")
			} else if posChange > tk.AlertThreshold*3 {
				// Major drop
				generatePositionAlert(ctx, tk, newPos, "critical")
			}
		} else if tk.LastPosition > 0 && newPos == 0 {
			// Product disappeared from search
			generatePositionAlert(ctx, tk, 0, "critical")
		}
	}
}

func generatePositionAlert(ctx context.Context, tk trackedKeyword, newPos int, severity string) {
	title := fmt.Sprintf("Позиция упала: «%s»", tk.Keyword)
	message := fmt.Sprintf("NmID %d: позиция по «%s» изменилась с %d на %d.",
		tk.NmID, tk.Keyword, tk.LastPosition, newPos)

	if newPos == 0 {
		title = fmt.Sprintf("Товар пропал из поиска: «%s»", tk.Keyword)
		message = fmt.Sprintf("NmID %d больше не найден по запросу «%s» (была позиция %d).",
			tk.NmID, tk.Keyword, tk.LastPosition)
		severity = "critical"
	}

	// Insert directly to alerts table (shared PostgreSQL)
	_, err := db.Exec(ctx,
		`INSERT INTO alerts (user_id, alert_type, title, message, severity)
		 VALUES ($1, $2, $3, $4, $5)`,
		tk.UserID, "position_drop", title, message, severity,
	)
	if err != nil {
		log.Printf("Scheduler: failed to create alert: %v", err)
		// Fallback: try notification service
		sendAlertToNotificationService(tk.UserID, title, message, severity)
	}
}

func sendAlertToNotificationService(userID int64, title, message, severity string) {
	log.Printf("Scheduler alert [user=%d severity=%s]: %s — %s", userID, severity, title, message)
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
