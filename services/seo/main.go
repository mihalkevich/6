package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

const (
	maxSearchPages     = 10                // search depth (was 5)
	maxConcurrent      = 5                 // parallel keyword searches
	searchCacheTTL     = 15 * time.Minute  // cache WB search results
	historyMaxAge      = 90 * 24 * time.Hour // keep 90 days of history
	rateLimitDelay     = 200 * time.Millisecond // min delay between WB requests
	rateLimitJitter    = 300 * time.Millisecond // random jitter on top
)

var (
	cfg *config.Config

	mu              sync.RWMutex
	positionHistory = map[int64]map[string][]positionRecord{} // nmID -> keyword -> history

	// In-memory search cache: "keyword:page" -> cached result
	cacheMu     sync.RWMutex
	searchCache = map[string]cachedSearch{}

	// Rate limiter for WB Search API
	searchLimiter = make(chan struct{}, maxConcurrent)
)

type cachedSearch struct {
	result    *wbapi.WBSearchResult
	fetchedAt time.Time
}

type positionRecord struct {
	Position  int       `json:"position"`
	Page      int       `json:"page"`
	CheckedAt time.Time `json:"checked_at"`
}

func main() {
	cfg = config.Load()

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

// --- Check Positions ---

type checkRequest struct {
	NmIDs    []int64  `json:"nm_ids"`
	Keywords []string `json:"keywords"`
}

type positionResult struct {
	NmID     int64  `json:"nm_id"`
	Keyword  string `json:"keyword"`
	Position int    `json:"position"` // 0 = not found
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

	// Process keywords in parallel with semaphore
	type kwResult struct {
		results []positionResult
	}

	var wg sync.WaitGroup
	resultsCh := make(chan kwResult, len(req.Keywords))

	for _, keyword := range req.Keywords {
		wg.Add(1)
		go func(kw string) {
			defer wg.Done()
			searchLimiter <- struct{}{}        // acquire semaphore
			defer func() { <-searchLimiter }() // release semaphore

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

				// Early exit: all products found — no need to check more pages
				if len(found) == len(req.NmIDs) {
					allFound = true
					break
				}
			}

			// Mark not found
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

// cachedSearchProducts returns cached WB search results or fetches fresh ones.
func cachedSearchProducts(client *wbapi.Client, keyword string, page int) *wbapi.WBSearchResult {
	cacheKey := fmt.Sprintf("%s:%d", keyword, page)

	cacheMu.RLock()
	cached, ok := searchCache[cacheKey]
	cacheMu.RUnlock()

	if ok && time.Since(cached.fetchedAt) < searchCacheTTL {
		return cached.result
	}

	// Rate limit: add delay with jitter to avoid WB anti-bot
	jitter := time.Duration(rand.Int63n(int64(rateLimitJitter)))
	time.Sleep(rateLimitDelay + jitter)

	result, err := client.SearchProducts(keyword, page)
	if err != nil {
		log.Printf("WB search error keyword=%q page=%d: %v", keyword, page, err)
		return nil
	}

	cacheMu.Lock()
	searchCache[cacheKey] = cachedSearch{result: result, fetchedAt: time.Now()}
	cacheMu.Unlock()

	return result
}

// savePositionHistory saves a position record and rotates old entries.
func savePositionHistory(nmID int64, keyword string, position, page int) {
	mu.Lock()
	defer mu.Unlock()

	if positionHistory[nmID] == nil {
		positionHistory[nmID] = map[string][]positionRecord{}
	}
	positionHistory[nmID][keyword] = append(positionHistory[nmID][keyword], positionRecord{
		Position:  position,
		Page:      page,
		CheckedAt: time.Now(),
	})

	// Rotate: remove records older than historyMaxAge
	cutoff := time.Now().Add(-historyMaxAge)
	records := positionHistory[nmID][keyword]
	start := 0
	for start < len(records) && records[start].CheckedAt.Before(cutoff) {
		start++
	}
	if start > 0 {
		positionHistory[nmID][keyword] = records[start:]
	}
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

	mu.Lock()
	if positionHistory[req.NmID] == nil {
		positionHistory[req.NmID] = map[string][]positionRecord{}
	}
	for _, kw := range req.Keywords {
		if _, exists := positionHistory[req.NmID][kw]; !exists {
			positionHistory[req.NmID][kw] = []positionRecord{}
		}
	}
	mu.Unlock()

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
	Trend   string           `json:"trend"` // improving, declining, stable, new
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	// Get nm_id from query param
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

	mu.RLock()
	kwMap := positionHistory[nmID]
	mu.RUnlock()

	var entries []historyEntry
	for kw, records := range kwMap {
		trend := "new"
		if len(records) >= 2 {
			last := records[len(records)-1].Position
			prev := records[len(records)-2].Position
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
			Records: records,
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

	// Also compute total count.
	total := 0
	for _, g := range groups {
		total += len(g.Keywords)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"product_name":    req.ProductName,
		"suggestion_groups": groups,
		"total_keywords":  total,
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
