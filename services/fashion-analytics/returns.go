package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Return Analysis ---

type returnRequest struct {
	Sales  []wbapi.WBSale  `json:"sales"`
	Orders []wbapi.WBOrder `json:"orders"`
}

type productReturnAnalysis struct {
	NmID              int64              `json:"nm_id"`
	Name              string             `json:"name"`
	Brand             string             `json:"brand"`
	TotalSales        int                `json:"total_sales"`
	TotalReturns      int                `json:"total_returns"`
	ReturnRate        float64            `json:"return_rate_pct"`
	BuyoutRate        float64            `json:"buyout_rate_pct"`
	SizeBreakdown     []sizeReturnInfo   `json:"size_breakdown"`
	RegionBreakdown   []regionReturnInfo `json:"region_breakdown"`
	HasSizingIssue    bool               `json:"has_sizing_issue"`
	Recommendations   []string           `json:"recommendations,omitempty"`
}

type sizeReturnInfo struct {
	Size       string  `json:"size"`
	Sales      int     `json:"sales"`
	Returns    int     `json:"returns"`
	ReturnRate float64 `json:"return_rate_pct"`
}

type regionReturnInfo struct {
	Region     string  `json:"region"`
	Sales      int     `json:"sales"`
	Returns    int     `json:"returns"`
	ReturnRate float64 `json:"return_rate_pct"`
}

func handleReturnAnalysis(w http.ResponseWriter, r *http.Request) {
	var req returnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	type sizeKey struct {
		nmID int64
		size string
	}
	type regionKey struct {
		nmID   int64
		region string
	}

	// Per-product aggregation.
	type prodAgg struct {
		name, brand string
		sales       int
		returns     int
		orders      int
	}
	products := map[int64]*prodAgg{}
	sizeSales := map[sizeKey]int{}
	sizeReturns := map[sizeKey]int{}
	regionSales := map[regionKey]int{}
	regionReturns := map[regionKey]int{}

	for _, s := range req.Sales {
		if s.NmId == 0 {
			continue
		}

		agg, ok := products[s.NmId]
		if !ok {
			agg = &prodAgg{name: s.Subject, brand: s.Brand}
			products[s.NmId] = agg
		}

		isReturn := s.SaleID != "" && s.SaleID[0] == 'R'

		if isReturn {
			agg.returns++
			if s.TechSize != "" {
				sizeReturns[sizeKey{s.NmId, s.TechSize}]++
			}
			reg := s.RegionName
			if reg == "" {
				reg = "Unknown"
			}
			regionReturns[regionKey{s.NmId, reg}]++
		} else {
			agg.sales++
			if s.TechSize != "" {
				sizeSales[sizeKey{s.NmId, s.TechSize}]++
			}
			reg := s.RegionName
			if reg == "" {
				reg = "Unknown"
			}
			regionSales[regionKey{s.NmId, reg}]++
		}
	}

	// Count orders per product.
	for _, o := range req.Orders {
		if o.NmId == 0 {
			continue
		}
		agg, ok := products[o.NmId]
		if !ok {
			agg = &prodAgg{name: o.Subject}
			products[o.NmId] = agg
		}
		agg.orders++
	}

	// Build analysis.
	var results []productReturnAnalysis
	for nmID, agg := range products {
		returnRate := 0.0
		if agg.sales+agg.returns > 0 {
			returnRate = float64(agg.returns) / float64(agg.sales+agg.returns) * 100
		}
		buyoutRate := 0.0
		if agg.orders > 0 {
			buyoutRate = float64(agg.sales) / float64(agg.orders) * 100
		}

		pa := productReturnAnalysis{
			NmID:         nmID,
			Name:         agg.name,
			Brand:        agg.brand,
			TotalSales:   agg.sales,
			TotalReturns: agg.returns,
			ReturnRate:   round2(returnRate),
			BuyoutRate:   round2(buyoutRate),
		}

		// Size breakdown.
		allSizes := map[string]bool{}
		for k := range sizeSales {
			if k.nmID == nmID {
				allSizes[k.size] = true
			}
		}
		for k := range sizeReturns {
			if k.nmID == nmID {
				allSizes[k.size] = true
			}
		}

		var minRate, maxRate float64
		first := true
		for size := range allSizes {
			sales := sizeSales[sizeKey{nmID, size}]
			returns := sizeReturns[sizeKey{nmID, size}]
			rate := 0.0
			if sales+returns > 0 {
				rate = float64(returns) / float64(sales+returns) * 100
			}
			pa.SizeBreakdown = append(pa.SizeBreakdown, sizeReturnInfo{
				Size:       size,
				Sales:      sales,
				Returns:    returns,
				ReturnRate: round2(rate),
			})
			if first {
				minRate = rate
				maxRate = rate
				first = false
			} else {
				if rate < minRate {
					minRate = rate
				}
				if rate > maxRate {
					maxRate = rate
				}
			}
		}

		// Check sizing issue: >15pp difference between min and max return rates.
		if maxRate-minRate > 15 && len(allSizes) > 1 {
			pa.HasSizingIssue = true
		}

		sort.Slice(pa.SizeBreakdown, func(i, j int) bool {
			return pa.SizeBreakdown[i].ReturnRate > pa.SizeBreakdown[j].ReturnRate
		})

		// Region breakdown.
		allRegions := map[string]bool{}
		for k := range regionSales {
			if k.nmID == nmID {
				allRegions[k.region] = true
			}
		}
		for k := range regionReturns {
			if k.nmID == nmID {
				allRegions[k.region] = true
			}
		}

		for region := range allRegions {
			sales := regionSales[regionKey{nmID, region}]
			returns := regionReturns[regionKey{nmID, region}]
			rate := 0.0
			if sales+returns > 0 {
				rate = float64(returns) / float64(sales+returns) * 100
			}
			pa.RegionBreakdown = append(pa.RegionBreakdown, regionReturnInfo{
				Region:     region,
				Sales:      sales,
				Returns:    returns,
				ReturnRate: round2(rate),
			})
		}

		sort.Slice(pa.RegionBreakdown, func(i, j int) bool {
			return pa.RegionBreakdown[i].ReturnRate > pa.RegionBreakdown[j].ReturnRate
		})

		// Generate recommendations.
		pa.Recommendations = generateReturnRecommendations(pa)

		results = append(results, pa)
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].ReturnRate > results[j].ReturnRate
	})

	// Summary stats.
	var totalSales, totalReturns int
	highReturnCount := 0
	sizingIssueCount := 0
	for _, r := range results {
		totalSales += r.TotalSales
		totalReturns += r.TotalReturns
		if r.ReturnRate > 30 {
			highReturnCount++
		}
		if r.HasSizingIssue {
			sizingIssueCount++
		}
	}

	overallReturnRate := 0.0
	if totalSales+totalReturns > 0 {
		overallReturnRate = float64(totalReturns) / float64(totalSales+totalReturns) * 100
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"products":            results,
		"total_products":      len(results),
		"overall_return_rate": math.Round(overallReturnRate*100) / 100,
		"high_return_count":   highReturnCount,
		"sizing_issue_count":  sizingIssueCount,
	})
}

func generateReturnRecommendations(pa productReturnAnalysis) []string {
	var recs []string

	if pa.ReturnRate > 30 {
		recs = append(recs, "Высокий % возвратов (>30%) — проверьте соответствие фото и описания реальному товару")
	}

	if pa.HasSizingIssue {
		// Find the worst size.
		if len(pa.SizeBreakdown) > 0 {
			worst := pa.SizeBreakdown[0] // sorted by return rate desc
			recs = append(recs, "Проблема с размерами — размер "+worst.Size+" имеет возврат "+formatPct(worst.ReturnRate)+"%. Проверьте размерную сетку")
		}
	}

	if pa.BuyoutRate < 50 && pa.BuyoutRate > 0 {
		recs = append(recs, "Низкий % выкупа (<50%) — покупатели часто отказываются после получения. Проверьте качество и упаковку")
	}

	// Check for region anomalies.
	if len(pa.RegionBreakdown) > 2 {
		avgRate := pa.ReturnRate
		for _, reg := range pa.RegionBreakdown {
			if reg.ReturnRate > avgRate+20 && reg.Sales+reg.Returns >= 5 {
				recs = append(recs, "Аномально высокий возврат в регионе "+reg.Region+" ("+formatPct(reg.ReturnRate)+"%) — проверьте условия доставки")
				break
			}
		}
	}

	return recs
}
