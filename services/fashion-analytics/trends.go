package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/dataclient"
	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Fashion Trend Monitoring ---

type trendRequest struct {
	APIKeyID int64          `json:"api_key_id"`
	Sales    []wbapi.WBSale `json:"sales"`
}

type attributeTrend struct {
	Attribute  string  `json:"attribute"`
	Dimension  string  `json:"dimension"` // material, style, color, category, season, fit
	SalesWeek1 int     `json:"sales_week1"`
	SalesWeek2 int     `json:"sales_week2"`
	GrowthPct  float64 `json:"growth_pct"`
	TotalSales int     `json:"total_sales_30d"`
	Status     string  `json:"status"` // rising, declining, stable
}

type trendResponse struct {
	Rising    []attributeTrend `json:"rising"`
	Declining []attributeTrend `json:"declining"`
	Stable    []attributeTrend `json:"stable"`
	Total     int              `json:"total_attributes_tracked"`
}

func handleTrendMonitor(w http.ResponseWriter, r *http.Request) {
	var req trendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	if len(req.Sales) == 0 && req.APIKeyID > 0 {
		data, err := dataclient.FetchData(r.Header.Get("Authorization"))
		if err != nil {
			httpError(w, "failed to fetch data: "+err.Error(), http.StatusBadGateway)
			return
		}
		req.Sales = data.Sales
	}

	now := time.Now()
	day7ago := now.AddDate(0, 0, -7)
	day14ago := now.AddDate(0, 0, -14)
	day30ago := now.AddDate(0, 0, -30)

	dict := fashion.DefaultDictionary()
	termIndex := dict.AllTerms()

	// Track sales per attribute per time bucket.
	type attrAgg struct {
		dimension string
		week1     int // last 7 days
		week2     int // 8-14 days ago
		total30d  int // full 30 days
	}
	attrs := map[string]*attrAgg{}

	for _, s := range req.Sales {
		if s.NmId == 0 || (s.SaleID != "" && s.SaleID[0] == 'R') {
			continue
		}
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil || saleDate.Before(day30ago) {
			continue
		}

		// Extract attributes from product name.
		tokens := strings.Fields(strings.ToLower(s.Subject))
		seen := map[string]bool{} // avoid double-counting per sale

		for _, tok := range tokens {
			dim, ok := termIndex[tok]
			if !ok {
				continue
			}
			if seen[tok] {
				continue
			}
			seen[tok] = true

			agg, ok := attrs[tok]
			if !ok {
				agg = &attrAgg{dimension: string(dim)}
				attrs[tok] = agg
			}

			agg.total30d++
			if saleDate.After(day7ago) {
				agg.week1++
			} else if saleDate.After(day14ago) {
				agg.week2++
			}
		}
	}

	// Build trends.
	var allTrends []attributeTrend
	for attr, agg := range attrs {
		if agg.total30d < 3 { // minimum threshold
			continue
		}

		growth := 0.0
		if agg.week2 > 0 {
			growth = (float64(agg.week1) - float64(agg.week2)) / float64(agg.week2) * 100
		} else if agg.week1 > 0 {
			growth = 100 // new trend
		}

		status := "stable"
		if growth > 30 {
			status = "rising"
		} else if growth < -20 {
			status = "declining"
		}

		allTrends = append(allTrends, attributeTrend{
			Attribute:  attr,
			Dimension:  agg.dimension,
			SalesWeek1: agg.week1,
			SalesWeek2: agg.week2,
			GrowthPct:  math.Round(growth*10) / 10,
			TotalSales: agg.total30d,
			Status:     status,
		})
	}

	// Sort by growth rate.
	sort.Slice(allTrends, func(i, j int) bool {
		return allTrends[i].GrowthPct > allTrends[j].GrowthPct
	})

	// Split into categories.
	resp := trendResponse{Total: len(allTrends)}
	for _, t := range allTrends {
		switch t.Status {
		case "rising":
			resp.Rising = append(resp.Rising, t)
		case "declining":
			resp.Declining = append(resp.Declining, t)
		default:
			resp.Stable = append(resp.Stable, t)
		}
	}

	jsonResponse(w, http.StatusOK, resp)
}
