package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var (
	cfg *config.Config

	mu             sync.RWMutex
	positionHistory = map[int64]map[string][]positionRecord{} // nmID -> keyword -> history
)

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
	var results []positionResult

	for _, keyword := range req.Keywords {
		found := map[int64]bool{}
		for page := 1; page <= 5; page++ { // Search up to 5 pages
			searchResult, err := client.SearchProducts(keyword, page)
			if err != nil {
				break
			}
			for pos, p := range searchResult.Data.Products {
				if nmIDSet[p.ID] && !found[p.ID] {
					found[p.ID] = true
					globalPos := (page-1)*100 + pos + 1
					results = append(results, positionResult{
						NmID:     p.ID,
						Keyword:  keyword,
						Position: globalPos,
						Page:     page,
						Found:    true,
					})

					// Save to history
					mu.Lock()
					if positionHistory[p.ID] == nil {
						positionHistory[p.ID] = map[string][]positionRecord{}
					}
					positionHistory[p.ID][keyword] = append(positionHistory[p.ID][keyword], positionRecord{
						Position:  globalPos,
						Page:      page,
						CheckedAt: time.Now(),
					})
					mu.Unlock()
				}
			}
		}

		// Mark not found
		for _, nmID := range req.NmIDs {
			if !found[nmID] {
				results = append(results, positionResult{
					NmID:    nmID,
					Keyword: keyword,
					Found:   false,
				})
			}
		}
	}

	jsonResponse(w, http.StatusOK, results)
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
	ProductName string `json:"product_name"`
	Category    string `json:"category"`
	Brand       string `json:"brand"`
}

func handleSuggestKeywords(w http.ResponseWriter, r *http.Request) {
	var req suggestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	// Generate keyword suggestions based on product info
	suggestions := generateKeywordSuggestions(req.ProductName, req.Category, req.Brand)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"product_name": req.ProductName,
		"suggestions":  suggestions,
	})
}

func generateKeywordSuggestions(name, category, brand string) []string {
	suggestions := []string{}

	if name != "" {
		suggestions = append(suggestions, name)
	}
	if category != "" {
		suggestions = append(suggestions, category)
		if brand != "" {
			suggestions = append(suggestions, category+" "+brand)
		}
	}
	if brand != "" {
		suggestions = append(suggestions, brand)
	}
	if name != "" && brand != "" {
		suggestions = append(suggestions, brand+" "+name)
	}

	return suggestions
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
