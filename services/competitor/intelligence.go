package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Competitive Intelligence: Monitoring & Novelty Tracking ---

var (
	intelMu      sync.RWMutex
	intelHistory = map[string][]intelSnapshot{} // keyword -> snapshots
)

type intelSnapshot struct {
	Keyword   string            `json:"keyword"`
	TakenAt   time.Time         `json:"taken_at"`
	Products  []intelProduct    `json:"products"`
}

type intelProduct struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Price     float64 `json:"price"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
	Position  int     `json:"position"`
}

// --- Monitor Keywords Request ---

type monitorRequest struct {
	Keywords []string `json:"keywords"`
	MyNmIDs  []int64  `json:"my_nm_ids,omitempty"`
}

type monitorReport struct {
	Keyword      string           `json:"keyword"`
	NewEntrants  []noveltyItem    `json:"new_entrants"`
	PriceChanges []priceChange    `json:"price_changes"`
	RankChanges  []rankChange     `json:"rank_changes"`
	MarketStats  marketStats      `json:"market_stats"`
}

type noveltyItem struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Position  int     `json:"position"`
	Price     float64 `json:"price"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
}

type priceChange struct {
	NmID     int64   `json:"nm_id"`
	Brand    string  `json:"brand"`
	OldPrice float64 `json:"old_price"`
	NewPrice float64 `json:"new_price"`
	ChangePct float64 `json:"change_pct"`
	Direction string  `json:"direction"` // increased, decreased
}

type rankChange struct {
	NmID     int64  `json:"nm_id"`
	Brand    string `json:"brand"`
	OldPos   int    `json:"old_position"`
	NewPos   int    `json:"new_position"`
	Delta    int    `json:"delta"`
	Status   string `json:"status"` // rose, dropped
}

type marketStats struct {
	TotalProducts int     `json:"total_products"`
	AvgPrice      float64 `json:"avg_price"`
	MedianPrice   float64 `json:"median_price"`
	AvgRating     float64 `json:"avg_rating"`
	AvgFeedbacks  float64 `json:"avg_feedbacks"`
	UniqueBrands  int     `json:"unique_brands"`
}

func handleMonitorKeywords(w http.ResponseWriter, r *http.Request) {
	var req monitorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	myIDs := map[int64]bool{}
	for _, id := range req.MyNmIDs {
		myIDs[id] = true
	}

	client := wbapi.NewClient("")
	var reports []monitorReport

	for _, kw := range req.Keywords {
		report := buildMonitorReport(client, kw, myIDs)
		reports = append(reports, report)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"reports": reports,
		"total":   len(reports),
	})
}

func buildMonitorReport(client *wbapi.Client, keyword string, myIDs map[int64]bool) monitorReport {
	report := monitorReport{Keyword: keyword}

	// Fetch current top-100.
	result, err := client.SearchProducts(keyword, 1)
	if err != nil {
		return report
	}

	var currentProducts []intelProduct
	var prices []float64
	var totalRating float64
	var totalFeedbacks int
	brands := map[string]bool{}

	for pos, p := range result.Data.Products {
		if myIDs[p.ID] {
			continue
		}
		price := float64(p.SalePriceU) / 100
		ip := intelProduct{
			NmID:      p.ID,
			Name:      p.Name,
			Brand:     p.Brand,
			Price:     price,
			Rating:    p.Rating,
			Feedbacks: p.Feedbacks,
			Position:  pos + 1,
		}
		currentProducts = append(currentProducts, ip)
		prices = append(prices, price)
		totalRating += p.Rating
		totalFeedbacks += p.Feedbacks
		brands[p.Brand] = true
	}

	n := len(currentProducts)
	if n == 0 {
		return report
	}

	// Market stats.
	sort.Float64s(prices)
	avgPrice := 0.0
	for _, p := range prices {
		avgPrice += p
	}
	avgPrice /= float64(n)

	report.MarketStats = marketStats{
		TotalProducts: n,
		AvgPrice:      math.Round(avgPrice*100) / 100,
		MedianPrice:   prices[n/2],
		AvgRating:     math.Round(totalRating/float64(n)*100) / 100,
		AvgFeedbacks:  math.Round(float64(totalFeedbacks)/float64(n)*100) / 100,
		UniqueBrands:  len(brands),
	}

	// Compare with previous snapshot.
	intelMu.RLock()
	prevSnapshots := intelHistory[keyword]
	intelMu.RUnlock()

	if len(prevSnapshots) > 0 {
		prev := prevSnapshots[len(prevSnapshots)-1]
		prevMap := map[int64]intelProduct{}
		for _, p := range prev.Products {
			prevMap[p.NmID] = p
		}

		currentMap := map[int64]bool{}
		for _, p := range currentProducts {
			currentMap[p.NmID] = true
		}

		// New entrants.
		for _, p := range currentProducts {
			if _, wasThere := prevMap[p.NmID]; !wasThere {
				report.NewEntrants = append(report.NewEntrants, noveltyItem{
					NmID: p.NmID, Name: p.Name, Brand: p.Brand,
					Position: p.Position, Price: p.Price,
					Rating: p.Rating, Feedbacks: p.Feedbacks,
				})
			}
		}

		// Price and rank changes.
		for _, cur := range currentProducts {
			prev, ok := prevMap[cur.NmID]
			if !ok {
				continue
			}

			// Price change.
			if prev.Price > 0 && cur.Price != prev.Price {
				changePct := (cur.Price - prev.Price) / prev.Price * 100
				dir := "decreased"
				if changePct > 0 {
					dir = "increased"
				}
				report.PriceChanges = append(report.PriceChanges, priceChange{
					NmID: cur.NmID, Brand: cur.Brand,
					OldPrice: prev.Price, NewPrice: cur.Price,
					ChangePct: math.Round(changePct*10) / 10,
					Direction: dir,
				})
			}

			// Rank change.
			if cur.Position != prev.Position {
				delta := cur.Position - prev.Position
				status := "rose"
				if delta > 0 {
					status = "dropped"
				}
				report.RankChanges = append(report.RankChanges, rankChange{
					NmID: cur.NmID, Brand: cur.Brand,
					OldPos: prev.Position, NewPos: cur.Position,
					Delta: delta, Status: status,
				})
			}
		}

		// Sort: biggest movers first.
		sort.Slice(report.RankChanges, func(i, j int) bool {
			return absInt(report.RankChanges[i].Delta) > absInt(report.RankChanges[j].Delta)
		})
		sort.Slice(report.PriceChanges, func(i, j int) bool {
			return math.Abs(report.PriceChanges[i].ChangePct) > math.Abs(report.PriceChanges[j].ChangePct)
		})
	}

	// Save current snapshot.
	snap := intelSnapshot{
		Keyword:  keyword,
		TakenAt:  time.Now(),
		Products: currentProducts,
	}

	intelMu.Lock()
	intelHistory[keyword] = append(intelHistory[keyword], snap)
	if len(intelHistory[keyword]) > 30 {
		intelHistory[keyword] = intelHistory[keyword][len(intelHistory[keyword])-30:]
	}
	intelMu.Unlock()

	return report
}

// --- Competitor Watchlist ---

type watchlistRequest struct {
	CompetitorNmIDs []int64  `json:"competitor_nm_ids"`
	Keywords        []string `json:"keywords"`
}

type watchlistEntry struct {
	NmID          int64             `json:"nm_id"`
	Name          string            `json:"name"`
	Brand         string            `json:"brand"`
	Positions     map[string]int    `json:"positions_by_keyword"` // keyword -> position
	AvgPosition   float64           `json:"avg_position"`
	Price         float64           `json:"price"`
	Rating        float64           `json:"rating"`
	Feedbacks     int               `json:"feedbacks"`
	Found         bool              `json:"found"`
}

func handleWatchlist(w http.ResponseWriter, r *http.Request) {
	var req watchlistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.CompetitorNmIDs) == 0 || len(req.Keywords) == 0 {
		httpError(w, "competitor_nm_ids and keywords required", http.StatusBadRequest)
		return
	}

	targetIDs := map[int64]bool{}
	for _, id := range req.CompetitorNmIDs {
		targetIDs[id] = true
	}

	client := wbapi.NewClient("")
	entries := map[int64]*watchlistEntry{}

	for _, kw := range req.Keywords {
		for page := 1; page <= 5; page++ {
			result, err := client.SearchProducts(kw, page)
			if err != nil {
				break
			}
			for pos, p := range result.Data.Products {
				if !targetIDs[p.ID] {
					continue
				}
				e, ok := entries[p.ID]
				if !ok {
					e = &watchlistEntry{
						NmID:      p.ID,
						Name:      p.Name,
						Brand:     p.Brand,
						Price:     float64(p.SalePriceU) / 100,
						Rating:    p.Rating,
						Feedbacks: p.Feedbacks,
						Positions: map[string]int{},
						Found:     true,
					}
					entries[p.ID] = e
				}
				globalPos := (page-1)*100 + pos + 1
				e.Positions[kw] = globalPos
			}
		}
	}

	// Build result with avg positions.
	var result []watchlistEntry
	for _, id := range req.CompetitorNmIDs {
		e, ok := entries[id]
		if !ok {
			result = append(result, watchlistEntry{NmID: id, Found: false, Positions: map[string]int{}})
			continue
		}
		if len(e.Positions) > 0 {
			sum := 0
			for _, pos := range e.Positions {
				sum += pos
			}
			e.AvgPosition = math.Round(float64(sum)/float64(len(e.Positions))*10) / 10
		}
		result = append(result, *e)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"competitors": result,
		"keywords":    req.Keywords,
		"total":       len(result),
	})
}

func absInt(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
