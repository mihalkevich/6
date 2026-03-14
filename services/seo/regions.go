package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Multi-region position tracking ---

type regionCheckRequest struct {
	NmIDs    []int64  `json:"nm_ids"`
	Keywords []string `json:"keywords"`
	Regions  []string `json:"regions,omitempty"` // region names; empty = all known regions
}

type regionPositionResult struct {
	NmID     int64  `json:"nm_id"`
	Keyword  string `json:"keyword"`
	Region   string `json:"region"`
	Position int    `json:"position"`
	Page     int    `json:"page"`
	Found    bool   `json:"found"`
}

type regionSummary struct {
	NmID     int64              `json:"nm_id"`
	Keyword  string             `json:"keyword"`
	BestPos  int                `json:"best_position"`
	WorstPos int                `json:"worst_position"`
	AvgPos   float64            `json:"avg_position"`
	ByRegion []regionPositionResult `json:"by_region"`
}

func handleCheckPositionsRegional(w http.ResponseWriter, r *http.Request) {
	var req regionCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.NmIDs) == 0 || len(req.Keywords) == 0 {
		httpError(w, "nm_ids and keywords required", http.StatusBadRequest)
		return
	}

	// Resolve regions.
	regions := resolveRegions(req.Regions)
	if len(regions) == 0 {
		httpError(w, "no valid regions specified", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient("")
	nmIDSet := map[int64]bool{}
	for _, id := range req.NmIDs {
		nmIDSet[id] = true
	}

	// Run searches: one goroutine per keyword×region combination.
	type result struct {
		items []regionPositionResult
	}
	var wg sync.WaitGroup
	ch := make(chan result, len(req.Keywords)*len(regions))

	for _, kw := range req.Keywords {
		for _, reg := range regions {
			wg.Add(1)
			go func(keyword string, region wbapi.Region) {
				defer wg.Done()
				searchLimiter <- struct{}{}
				defer func() { <-searchLimiter }()

				items := searchRegion(client, keyword, region, nmIDSet)
				ch <- result{items: items}
			}(kw, reg)
		}
	}

	wg.Wait()
	close(ch)

	var allResults []regionPositionResult
	for r := range ch {
		allResults = append(allResults, r.items...)
	}

	// Build summaries: group by nmID+keyword.
	summaries := buildRegionSummaries(allResults)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"results":   allResults,
		"summaries": summaries,
		"regions":   regionNames(regions),
	})
}

func searchRegion(client *wbapi.Client, keyword string, region wbapi.Region, nmIDSet map[int64]bool) []regionPositionResult {
	found := map[int64]bool{}
	var results []regionPositionResult

	for page := 1; page <= maxSearchPages; page++ {
		sr := cachedSearchRegion(client, keyword, page, region.Dest)
		if sr == nil {
			break
		}
		for pos, p := range sr.Data.Products {
			if nmIDSet[p.ID] && !found[p.ID] {
				found[p.ID] = true
				globalPos := (page-1)*100 + pos + 1
				results = append(results, regionPositionResult{
					NmID:     p.ID,
					Keyword:  keyword,
					Region:   region.Name,
					Position: globalPos,
					Page:     page,
					Found:    true,
				})
			}
		}
		if len(found) == len(nmIDSet) {
			break
		}
	}

	// Mark not found.
	for nmID := range nmIDSet {
		if !found[nmID] {
			results = append(results, regionPositionResult{
				NmID:    nmID,
				Keyword: keyword,
				Region:  region.Name,
				Found:   false,
			})
		}
	}
	return results
}

// cachedSearchRegion wraps cachedSearchProducts with region support.
func cachedSearchRegion(client *wbapi.Client, keyword string, page, dest int) *wbapi.WBSearchResult {
	cacheKey := fmt.Sprintf("%s:%d:%d", keyword, page, dest)

	cacheMu.RLock()
	cached, ok := searchCache[cacheKey]
	cacheMu.RUnlock()

	if ok && time.Since(cached.fetchedAt) < searchCacheTTL {
		return cached.result
	}

	jitter := time.Duration(rand.Int63n(int64(rateLimitJitter)))
	time.Sleep(rateLimitDelay + jitter)

	result, err := client.SearchProductsRegion(keyword, page, dest)
	if err != nil {
		log.Printf("WB search error keyword=%q page=%d dest=%d: %v", keyword, page, dest, err)
		return nil
	}

	cacheMu.Lock()
	searchCache[cacheKey] = cachedSearch{result: result, fetchedAt: time.Now()}
	cacheMu.Unlock()

	return result
}

func buildRegionSummaries(results []regionPositionResult) []regionSummary {
	type key struct {
		nmID    int64
		keyword string
	}
	grouped := map[key][]regionPositionResult{}
	for _, r := range results {
		k := key{r.NmID, r.Keyword}
		grouped[k] = append(grouped[k], r)
	}

	var summaries []regionSummary
	for k, items := range grouped {
		s := regionSummary{
			NmID:     k.nmID,
			Keyword:  k.keyword,
			ByRegion: items,
		}

		var sum, count int
		best, worst := 0, 0
		for _, item := range items {
			if !item.Found {
				continue
			}
			count++
			sum += item.Position
			if best == 0 || item.Position < best {
				best = item.Position
			}
			if item.Position > worst {
				worst = item.Position
			}
		}

		if count > 0 {
			s.BestPos = best
			s.WorstPos = worst
			s.AvgPos = float64(sum) / float64(count)
		}

		summaries = append(summaries, s)
	}
	return summaries
}

func resolveRegions(names []string) []wbapi.Region {
	if len(names) == 0 {
		return wbapi.KnownRegions
	}
	nameSet := map[string]bool{}
	for _, n := range names {
		nameSet[n] = true
	}
	var regions []wbapi.Region
	for _, r := range wbapi.KnownRegions {
		if nameSet[r.Name] {
			regions = append(regions, r)
		}
	}
	return regions
}

func regionNames(regions []wbapi.Region) []string {
	names := make([]string, len(regions))
	for i, r := range regions {
		names[i] = r.Name
	}
	return names
}

// handleListRegions returns the list of available regions.
func handleListRegions(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"regions": wbapi.KnownRegions,
	})
}
