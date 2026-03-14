package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Competitor position tracking ---

// In-memory storage for competitor position snapshots.
var (
	compMu       sync.RWMutex
	compHistory  = map[string][]competitorSnapshot{} // "keyword" -> snapshots
)

type competitorSnapshot struct {
	Keyword    string              `json:"keyword"`
	CheckedAt  time.Time           `json:"checked_at"`
	TopResults []competitorEntry   `json:"top_results"`
}

type competitorEntry struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Position  int     `json:"position"`
	Price     float64 `json:"price"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
}

type compTrackRequest struct {
	Keywords []string `json:"keywords"`
	MyNmIDs  []int64  `json:"my_nm_ids"`
	TopN     int      `json:"top_n,omitempty"` // how many competitors to track per keyword (default 10)
}

type compPositionEntry struct {
	NmID     int64  `json:"nm_id"`
	Name     string `json:"name"`
	Brand    string `json:"brand"`
	Position int    `json:"position"`
	IsOwn    bool   `json:"is_own"` // true if this is user's product
}

type compKeywordReport struct {
	Keyword    string              `json:"keyword"`
	YourPos    []compPositionEntry `json:"your_positions"`
	TopComp    []compPositionEntry `json:"top_competitors"`
	Changes    []compChange        `json:"changes,omitempty"`
}

type compChange struct {
	NmID    int64  `json:"nm_id"`
	Brand   string `json:"brand"`
	OldPos  int    `json:"old_position"`
	NewPos  int    `json:"new_position"`
	Delta   int    `json:"delta"` // negative = improved
	Status  string `json:"status"` // "rose", "dropped", "new_entrant", "left_top"
}

func handleCompetitorPositions(w http.ResponseWriter, r *http.Request) {
	var req compTrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	topN := req.TopN
	if topN <= 0 || topN > 50 {
		topN = 10
	}

	myIDs := map[int64]bool{}
	for _, id := range req.MyNmIDs {
		myIDs[id] = true
	}

	client := wbapi.NewClient("")

	type indexedReport struct {
		idx    int
		report compKeywordReport
	}

	var wg sync.WaitGroup
	ch := make(chan indexedReport, len(req.Keywords))

	for i, kw := range req.Keywords {
		wg.Add(1)
		go func(idx int, keyword string) {
			defer wg.Done()
			searchLimiter <- struct{}{}
			defer func() { <-searchLimiter }()

			report := analyzeCompetitors(client, keyword, myIDs, topN)
			ch <- indexedReport{idx: idx, report: report}
		}(i, kw)
	}

	wg.Wait()
	close(ch)

	reports := make([]compKeywordReport, len(req.Keywords))
	for ir := range ch {
		reports[ir.idx] = ir.report
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"reports": reports,
	})
}

func analyzeCompetitors(client *wbapi.Client, keyword string, myIDs map[int64]bool, topN int) compKeywordReport {
	report := compKeywordReport{Keyword: keyword}

	// Fetch first 2 pages (200 results) for competitor analysis.
	var allProducts []wbapi.WBSearchProduct
	for page := 1; page <= 2; page++ {
		sr := cachedSearchProducts(client, keyword, page)
		if sr == nil {
			break
		}
		allProducts = append(allProducts, sr.Data.Products...)
	}

	// Build current top entries.
	var currentTop []competitorEntry
	for pos, p := range allProducts {
		globalPos := pos + 1
		entry := competitorEntry{
			NmID:      p.ID,
			Name:      p.Name,
			Brand:     p.Brand,
			Position:  globalPos,
			Price:     float64(p.SalePriceU) / 100,
			Rating:    p.Rating,
			Feedbacks: p.Feedbacks,
		}

		if myIDs[p.ID] {
			report.YourPos = append(report.YourPos, compPositionEntry{
				NmID:     p.ID,
				Name:     p.Name,
				Brand:    p.Brand,
				Position: globalPos,
				IsOwn:    true,
			})
		} else if len(report.TopComp) < topN {
			report.TopComp = append(report.TopComp, compPositionEntry{
				NmID:     p.ID,
				Name:     p.Name,
				Brand:    p.Brand,
				Position: globalPos,
				IsOwn:    false,
			})
		}

		if len(currentTop) < topN+len(myIDs) {
			currentTop = append(currentTop, entry)
		}
	}

	// Compare with previous snapshot to detect changes.
	compMu.RLock()
	prevSnapshots := compHistory[keyword]
	compMu.RUnlock()

	if len(prevSnapshots) > 0 {
		prev := prevSnapshots[len(prevSnapshots)-1]
		report.Changes = detectChanges(prev.TopResults, currentTop)
	}

	// Save current snapshot.
	snapshot := competitorSnapshot{
		Keyword:    keyword,
		CheckedAt:  time.Now(),
		TopResults: currentTop,
	}

	compMu.Lock()
	compHistory[keyword] = append(compHistory[keyword], snapshot)
	// Keep last 30 snapshots per keyword.
	if len(compHistory[keyword]) > 30 {
		compHistory[keyword] = compHistory[keyword][len(compHistory[keyword])-30:]
	}
	compMu.Unlock()

	return report
}

func detectChanges(old, new []competitorEntry) []compChange {
	oldPos := map[int64]competitorEntry{}
	for _, e := range old {
		oldPos[e.NmID] = e
	}

	newPos := map[int64]competitorEntry{}
	for _, e := range new {
		newPos[e.NmID] = e
	}

	var changes []compChange

	// Check products in new top.
	for _, n := range new {
		o, wasInOld := oldPos[n.NmID]
		if !wasInOld {
			changes = append(changes, compChange{
				NmID:   n.NmID,
				Brand:  n.Brand,
				NewPos: n.Position,
				Status: "new_entrant",
			})
		} else if n.Position != o.Position {
			delta := n.Position - o.Position
			status := "dropped"
			if delta < 0 {
				status = "rose"
			}
			changes = append(changes, compChange{
				NmID:   n.NmID,
				Brand:  n.Brand,
				OldPos: o.Position,
				NewPos: n.Position,
				Delta:  delta,
				Status: status,
			})
		}
	}

	// Check products that left the top.
	for _, o := range old {
		if _, stillIn := newPos[o.NmID]; !stillIn {
			changes = append(changes, compChange{
				NmID:   o.NmID,
				Brand:  o.Brand,
				OldPos: o.Position,
				Status: "left_top",
			})
		}
	}

	// Sort: biggest movers first.
	sort.Slice(changes, func(i, j int) bool {
		ai := abs(changes[i].Delta)
		aj := abs(changes[j].Delta)
		if ai != aj {
			return ai > aj
		}
		return changes[i].NmID < changes[j].NmID
	})

	return changes
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
