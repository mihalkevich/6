package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"sync"

	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Keyword Clustering ---

type KeywordCluster struct {
	Type     string   `json:"type"`
	Keywords []string `json:"keywords"`
}

type clusterKeywordsRequest struct {
	Keywords []string `json:"keywords"`
}

type clusterKeywordsResponse struct {
	Clusters []KeywordCluster `json:"clusters"`
	Total    int              `json:"total_keywords"`
}

func handleClusterKeywords(w http.ResponseWriter, r *http.Request) {
	var req clusterKeywordsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	dict := fashion.DefaultDictionary()
	groups := map[string][]string{
		"base":       {},
		"attributed": {},
		"long_tail":  {},
		"brand":      {},
		"synonym":    {},
		"occasion":   {},
		"other":      {},
	}

	for _, kw := range req.Keywords {
		kwLow := strings.ToLower(kw)
		clusterType := classifyKeyword(dict, kwLow)
		groups[clusterType] = append(groups[clusterType], kw)
	}

	var clusters []KeywordCluster
	order := []string{"base", "attributed", "long_tail", "brand", "synonym", "occasion", "other"}
	for _, t := range order {
		if len(groups[t]) > 0 {
			clusters = append(clusters, KeywordCluster{
				Type:     t,
				Keywords: groups[t],
			})
		}
	}

	jsonResponse(w, http.StatusOK, clusterKeywordsResponse{
		Clusters: clusters,
		Total:    len(req.Keywords),
	})
}

// classifyKeyword determines the cluster type based on how many
// dictionary dimensions appear in the keyword.
func classifyKeyword(dict *fashion.Dictionary, kw string) string {
	terms := dict.AllTerms()

	// Check for occasion prepositions.
	for _, prep := range fashion.OccasionPrepositions {
		if strings.Contains(kw, prep) {
			return "occasion"
		}
	}

	// Check for synonyms (non-category terms that have synonym entries).
	words := strings.Fields(kw)
	hasCat := false
	isSynonym := false
	attrCount := 0

	for _, w := range words {
		dim, ok := terms[w]
		if !ok {
			// Check multi-word matches against known categories.
			continue
		}
		switch dim {
		case fashion.DimCategory:
			// Check if this category is a synonym of another.
			syns := dict.SynonymsFor(w)
			if len(syns) > 0 {
				// It's a real category too, but could be used as synonym base.
				hasCat = true
			} else {
				hasCat = true
			}
		case fashion.DimMaterial, fashion.DimStyle, fashion.DimSeason,
			fashion.DimColor, fashion.DimLength, fashion.DimFit:
			attrCount++
		case fashion.DimGender:
			// Gender alone doesn't add to attribute count.
		}
	}

	// Also try multi-word term matching.
	for term, dim := range terms {
		if !strings.Contains(term, " ") {
			continue
		}
		if strings.Contains(kw, term) {
			switch dim {
			case fashion.DimColor, fashion.DimFit:
				attrCount++
			case fashion.DimCategory:
				hasCat = true
			}
		}
	}

	// Check if it's a synonym-based keyword by looking for synonym categories.
	if !hasCat {
		for _, w := range words {
			syns := dict.SynonymsFor(w)
			if len(syns) > 0 {
				isSynonym = true
				break
			}
		}
	}

	if isSynonym {
		return "synonym"
	}

	switch {
	case attrCount >= 2:
		return "long_tail"
	case attrCount == 1:
		return "attributed"
	case hasCat && attrCount == 0:
		return "base"
	default:
		return "other"
	}
}

// --- Keyword Stats / Competitiveness ---

type KeywordStat struct {
	Keyword       string   `json:"keyword"`
	TotalProducts int      `json:"total_products"`
	Competition   string   `json:"competition"` // high, medium, low
	TopBrands     []string `json:"top_brands"`
	AvgPrice      float64  `json:"avg_price"`
	AvgRating     float64  `json:"avg_rating"`
}

type keywordStatsRequest struct {
	Keywords []string `json:"keywords"`
}

type keywordStatsResponse struct {
	Stats []KeywordStat `json:"stats"`
}

func handleKeywordStats(w http.ResponseWriter, r *http.Request) {
	var req keywordStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	// Limit to 20 keywords per request.
	if len(req.Keywords) > 20 {
		req.Keywords = req.Keywords[:20]
	}

	client := wbapi.NewClient("")

	type indexedStat struct {
		idx  int
		stat KeywordStat
	}

	var wg sync.WaitGroup
	ch := make(chan indexedStat, len(req.Keywords))

	for i, kw := range req.Keywords {
		wg.Add(1)
		go func(idx int, keyword string) {
			defer wg.Done()
			searchLimiter <- struct{}{}
			defer func() { <-searchLimiter }()

			stat := analyzeKeyword(client, keyword)
			ch <- indexedStat{idx: idx, stat: stat}
		}(i, kw)
	}

	wg.Wait()
	close(ch)

	stats := make([]KeywordStat, len(req.Keywords))
	for is := range ch {
		stats[is.idx] = is.stat
	}

	jsonResponse(w, http.StatusOK, keywordStatsResponse{Stats: stats})
}

// analyzeKeyword fetches the first page of WB search results and computes stats.
func analyzeKeyword(client *wbapi.Client, keyword string) KeywordStat {
	stat := KeywordStat{Keyword: keyword}

	result := cachedSearchProducts(client, keyword, 1)
	if result == nil || len(result.Data.Products) == 0 {
		stat.Competition = "low"
		return stat
	}

	products := result.Data.Products
	stat.TotalProducts = len(products)

	// Competition level.
	switch {
	case stat.TotalProducts >= 80:
		stat.Competition = "high"
	case stat.TotalProducts >= 30:
		stat.Competition = "medium"
	default:
		stat.Competition = "low"
	}

	// Top brands (up to 3).
	brandCount := map[string]int{}
	var totalPrice, totalRating float64
	for _, p := range products {
		if p.Brand != "" {
			brandCount[p.Brand]++
		}
		totalPrice += float64(p.SalePriceU) / 100
		totalRating += p.Rating
	}

	n := float64(len(products))
	stat.AvgPrice = totalPrice / n
	stat.AvgRating = totalRating / n

	type brandEntry struct {
		name  string
		count int
	}
	var brands []brandEntry
	for name, count := range brandCount {
		brands = append(brands, brandEntry{name, count})
	}
	sort.Slice(brands, func(i, j int) bool {
		return brands[i].count > brands[j].count
	})
	for i, b := range brands {
		if i >= 3 {
			break
		}
		stat.TopBrands = append(stat.TopBrands, b.name)
	}

	return stat
}
