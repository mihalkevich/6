package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/database"
	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

//go:embed migrations.sql
var migrationSQL string

const (
	maxSearchPages  = 10
	maxConcurrent   = 5
	searchCacheTTL  = 15 * time.Minute
	historyMaxAge   = 90 * 24 * time.Hour
	rateLimitDelay  = 200 * time.Millisecond
	rateLimitJitter = 300 * time.Millisecond
)

var (
	cfg *config.Config
	db  *pgxpool.Pool
	rdb *redis.Client

	// Rate limiter for WB Search API
	searchLimiter = make(chan struct{}, maxConcurrent)
)

type positionRecord struct {
	Position  int       `json:"position"`
	Page      int       `json:"page"`
	CheckedAt time.Time `json:"checked_at"`
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

	rdb, err = database.ConnectRedis(ctx, cfg.RedisURL)
	if err != nil {
		log.Printf("Redis unavailable, using in-memory search cache: %v", err)
	}

	// Cleanup old position records on startup
	go cleanupOldPositions()

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("POST /api/seo/check-positions", authMw(http.HandlerFunc(handleCheckPositions)))
	mux.Handle("POST /api/seo/track-keywords", authMw(http.HandlerFunc(handleTrackKeywords)))
	mux.Handle("GET /api/seo/history", authMw(http.HandlerFunc(handleHistory)))
	mux.Handle("POST /api/seo/suggest-keywords", authMw(http.HandlerFunc(handleSuggestKeywords)))
	mux.Handle("POST /api/seo/cluster-keywords", authMw(http.HandlerFunc(handleClusterKeywords)))
	mux.Handle("POST /api/seo/keyword-stats", authMw(http.HandlerFunc(handleKeywordStats)))

	// Phase 3: Positions Pro
	mux.Handle("POST /api/seo/check-positions-regional", authMw(http.HandlerFunc(handleCheckPositionsRegional)))
	mux.Handle("GET /api/seo/regions", authMw(http.HandlerFunc(handleListRegions)))
	mux.Handle("POST /api/seo/competitor-positions", authMw(http.HandlerFunc(handleCompetitorPositions)))
	mux.Handle("POST /api/seo/forecast", authMw(http.HandlerFunc(handleForecast)))
	mux.Handle("POST /api/seo/history/enhanced", authMw(http.HandlerFunc(handleEnhancedHistory)))

	// Phase 5: Card Optimization
	mux.Handle("POST /api/seo/card-audit", authMw(http.HandlerFunc(handleCardAudit)))
	mux.Handle("POST /api/seo/generate-title", authMw(http.HandlerFunc(handleGenerateTitle)))
	mux.Handle("POST /api/seo/generate-description", authMw(http.HandlerFunc(handleGenerateDescription)))
	mux.Handle("POST /api/seo/photo-recommendations", authMw(http.HandlerFunc(handlePhotoRecommendations)))
	mux.Handle("POST /api/seo/card-snapshot", authMw(http.HandlerFunc(handleSaveSnapshot)))
	mux.Handle("POST /api/seo/card-snapshots", authMw(http.HandlerFunc(handleGetSnapshots)))
	mux.Handle("POST /api/seo/card-compare", authMw(http.HandlerFunc(handleCompareSnapshots)))

	log.Printf("SEO & Keywords service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// cleanupOldPositions removes position records older than 90 days.
func cleanupOldPositions() {
	cutoff := time.Now().Add(-historyMaxAge)
	_, err := db.Exec(context.Background(),
		`DELETE FROM keyword_positions WHERE checked_at < $1`, cutoff)
	if err != nil {
		log.Printf("Position cleanup error: %v", err)
	} else {
		log.Println("Old position records cleaned up")
	}
}

// --- Check Positions ---

type checkRequest struct {
	NmIDs    []int64  `json:"nm_ids"`
	Keywords []string `json:"keywords"`
}

type positionResult struct {
	NmID     int64  `json:"nm_id"`
	Keyword  string `json:"keyword"`
	Position int    `json:"position"`
	Page     int    `json:"page"`
	Found    bool   `json:"found"`
}

func handleCheckPositions(w http.ResponseWriter, r *http.Request) {
	var req checkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	nmIDSet := map[int64]bool{}
	for _, id := range req.NmIDs {
		nmIDSet[id] = true
	}

	client := wbapi.NewClient("")

	type kwResult struct {
		results []positionResult
	}

	var wg sync.WaitGroup
	resultsCh := make(chan kwResult, len(req.Keywords))

	for _, keyword := range req.Keywords {
		wg.Add(1)
		go func(kw string) {
			defer wg.Done()
			searchLimiter <- struct{}{}
			defer func() { <-searchLimiter }()

			var kwResults []positionResult
			found := map[int64]bool{}
			allFound := false

			for page := 1; page <= maxSearchPages; page++ {
				searchResult := cachedSearchProducts(client, kw, page)
				if searchResult == nil {
					break
				}
				for pos, p := range searchResult.Data.Products {
					if nmIDSet[p.ID] && !found[p.ID] {
						found[p.ID] = true
						globalPos := (page-1)*100 + pos + 1
						kwResults = append(kwResults, positionResult{
							NmID:     p.ID,
							Keyword:  kw,
							Position: globalPos,
							Page:     page,
							Found:    true,
						})

						savePositionHistory(p.ID, kw, globalPos, page)
					}
				}

				if len(found) == len(req.NmIDs) {
					allFound = true
					break
				}
			}

			if !allFound {
				for _, nmID := range req.NmIDs {
					if !found[nmID] {
						kwResults = append(kwResults, positionResult{
							NmID:    nmID,
							Keyword: kw,
							Found:   false,
						})
					}
				}
			}

			resultsCh <- kwResult{results: kwResults}
		}(keyword)
	}

	wg.Wait()
	close(resultsCh)

	var results []positionResult
	for kr := range resultsCh {
		results = append(results, kr.results...)
	}

	jsonResponse(w, http.StatusOK, results)
}

// cachedSearchProducts returns cached WB search results (Redis or in-memory fallback).
func cachedSearchProducts(client *wbapi.Client, keyword string, page int) *wbapi.WBSearchResult {
	cacheKey := fmt.Sprintf("wb:search:%s:%d", keyword, page)

	// Try Redis cache
	if rdb != nil {
		cached, err := rdb.Get(context.Background(), cacheKey).Bytes()
		if err == nil {
			var result wbapi.WBSearchResult
			if json.Unmarshal(cached, &result) == nil {
				return &result
			}
		}
	}

	jitter := time.Duration(rand.Int63n(int64(rateLimitJitter)))
	time.Sleep(rateLimitDelay + jitter)

	result, err := client.SearchProducts(keyword, page)
	if err != nil {
		log.Printf("WB search error keyword=%q page=%d: %v", keyword, page, err)
		return nil
	}

	// Cache in Redis
	if rdb != nil {
		if data, err := json.Marshal(result); err == nil {
			rdb.Set(context.Background(), cacheKey, data, searchCacheTTL)
		}
	}

	return result
}

// savePositionHistory persists a position record to PostgreSQL.
func savePositionHistory(nmID int64, keyword string, position, page int) {
	_, err := db.Exec(context.Background(),
		`INSERT INTO keyword_positions (nm_id, keyword, position, page, checked_at)
		 VALUES ($1, $2, $3, $4, NOW())`,
		nmID, keyword, position, page,
	)
	if err != nil {
		log.Printf("Failed to save position: %v", err)
	}
}

// getPositionHistory loads position history from PostgreSQL.
func getPositionHistory(nmID int64) map[string][]positionRecord {
	rows, err := db.Query(context.Background(),
		`SELECT keyword, position, page, checked_at
		 FROM keyword_positions WHERE nm_id = $1
		 ORDER BY keyword, checked_at`, nmID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	result := map[string][]positionRecord{}
	for rows.Next() {
		var kw string
		var r positionRecord
		if err := rows.Scan(&kw, &r.Position, &r.Page, &r.CheckedAt); err != nil {
			continue
		}
		result[kw] = append(result[kw], r)
	}
	return result
}

// --- Track Keywords ---

type trackRequest struct {
	NmID     int64    `json:"nm_id"`
	Keywords []string `json:"keywords"`
}

func handleTrackKeywords(w http.ResponseWriter, r *http.Request) {
	var req trackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	// Insert placeholder records with position=0 for tracking
	for _, kw := range req.Keywords {
		db.Exec(r.Context(),
			`INSERT INTO keyword_positions (nm_id, keyword, position, page, checked_at)
			 SELECT $1, $2, 0, 0, NOW()
			 WHERE NOT EXISTS (
			   SELECT 1 FROM keyword_positions WHERE nm_id = $1 AND keyword = $2
			 )`,
			req.NmID, kw,
		)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"nm_id":            req.NmID,
		"tracked_keywords": req.Keywords,
		"status":           "tracking",
	})
}

// --- History ---

type historyEntry struct {
	Keyword string           `json:"keyword"`
	Records []positionRecord `json:"records"`
	Trend   string           `json:"trend"`
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	nmIDStr := r.URL.Query().Get("nm_id")
	if nmIDStr == "" {
		httpError(w, "nm_id query param required", http.StatusBadRequest)
		return
	}

	var nmID int64
	if _, err := json.Number(nmIDStr).Int64(); err != nil {
		httpError(w, "invalid nm_id", http.StatusBadRequest)
		return
	}
	n, _ := json.Number(nmIDStr).Int64()
	nmID = n

	kwMap := getPositionHistory(nmID)

	var entries []historyEntry
	for kw, records := range kwMap {
		// Filter out placeholder records (position=0)
		var real []positionRecord
		for _, r := range records {
			if r.Position > 0 {
				real = append(real, r)
			}
		}

		trend := "new"
		if len(real) >= 2 {
			last := real[len(real)-1].Position
			prev := real[len(real)-2].Position
			if last < prev {
				trend = "improving"
			} else if last > prev {
				trend = "declining"
			} else {
				trend = "stable"
			}
		}
		entries = append(entries, historyEntry{
			Keyword: kw,
			Records: real,
			Trend:   trend,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Keyword < entries[j].Keyword
	})

	jsonResponse(w, http.StatusOK, entries)
}

// --- Suggest Keywords ---

type suggestRequest struct {
	ProductName string   `json:"product_name"`
	Category    string   `json:"category"`
	Brand       string   `json:"brand"`
	Materials   []string `json:"materials,omitempty"`
	Style       string   `json:"style,omitempty"`
	Season      string   `json:"season,omitempty"`
	Color       string   `json:"color,omitempty"`
	Occasion    string   `json:"occasion,omitempty"`
	Gender      string   `json:"gender,omitempty"`
}

func handleSuggestKeywords(w http.ResponseWriter, r *http.Request) {
	var req suggestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	dict := fashion.DefaultDictionary()
	hints := fashion.GeneratorHints{
		Materials: req.Materials,
		Style:     req.Style,
		Season:    req.Season,
		Color:     req.Color,
		Occasion:  req.Occasion,
		Gender:    req.Gender,
	}

	groups := dict.GenerateKeywords(req.ProductName, req.Category, req.Brand, hints)

	total := 0
	for _, g := range groups {
		total += len(g.Keywords)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"product_name":      req.ProductName,
		"suggestion_groups": groups,
		"total_keywords":    total,
	})
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
