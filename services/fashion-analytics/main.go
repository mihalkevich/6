package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/dataclient"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var cfg *config.Config

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	// Size analytics
	mux.Handle("POST /api/fashion/size-analysis", authMw(http.HandlerFunc(handleSizeAnalysis)))
	mux.Handle("POST /api/fashion/size-recommendations", authMw(http.HandlerFunc(handleSizeRecommendations)))

	// Seasonal analytics
	mux.Handle("POST /api/fashion/seasonal-analysis", authMw(http.HandlerFunc(handleSeasonalAnalysis)))
	mux.Handle("POST /api/fashion/seasonal-forecast", authMw(http.HandlerFunc(handleSeasonalForecast)))

	// Trend monitoring
	mux.Handle("POST /api/fashion/trend-monitor", authMw(http.HandlerFunc(handleTrendMonitor)))

	// Return analytics
	mux.Handle("POST /api/fashion/return-analysis", authMw(http.HandlerFunc(handleReturnAnalysis)))

	log.Printf("Fashion Analytics service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// --- Size Analysis ---

type sizeAnalysisRequest struct {
	APIKeyID int64           `json:"api_key_id"`
	Sales    []wbapi.WBSale  `json:"sales"`
	Stocks   []wbapi.WBStock `json:"stocks"`
	Orders   []wbapi.WBOrder `json:"orders"`
}

type productSizeAnalysis struct {
	NmID      int64          `json:"nm_id"`
	Name      string         `json:"name"`
	Brand     string         `json:"brand"`
	Sizes     []sizeStats    `json:"sizes"`
	TotalSales int           `json:"total_sales"`
	Problems  []string       `json:"problems,omitempty"`
}

type sizeStats struct {
	Size        string  `json:"size"`
	Sales       int     `json:"sales"`
	Returns     int     `json:"returns"`
	Orders      int     `json:"orders"`
	Stock       int     `json:"stock"`
	SalesShare  float64 `json:"sales_share_pct"`
	ReturnRate  float64 `json:"return_rate_pct"`
	BuyoutRate  float64 `json:"buyout_rate_pct"`
	DaysOfStock float64 `json:"days_of_stock"`
}

func handleSizeAnalysis(w http.ResponseWriter, r *http.Request) {
	var req sizeAnalysisRequest
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
		req.Stocks = data.Stocks
		req.Orders = data.Orders
	}

	// Aggregate sales by nmID+size.
	type sizeAgg struct {
		sales, returns int
		name, brand    string
	}
	productSizes := map[int64]map[string]*sizeAgg{}

	for _, s := range req.Sales {
		if s.NmId == 0 || s.TechSize == "" {
			continue
		}
		sizes, ok := productSizes[s.NmId]
		if !ok {
			sizes = map[string]*sizeAgg{}
			productSizes[s.NmId] = sizes
		}
		agg, ok := sizes[s.TechSize]
		if !ok {
			agg = &sizeAgg{name: s.Subject, brand: s.Brand}
			sizes[s.TechSize] = agg
		}
		if s.SaleID != "" && s.SaleID[0] == 'R' {
			agg.returns++
		} else {
			agg.sales++
		}
	}

	// Aggregate orders by nmID+size.
	orderCounts := map[int64]map[string]int{}
	for _, o := range req.Orders {
		if o.NmId == 0 || o.TechSize == "" {
			continue
		}
		if orderCounts[o.NmId] == nil {
			orderCounts[o.NmId] = map[string]int{}
		}
		orderCounts[o.NmId][o.TechSize]++
	}

	// Aggregate stock by nmID+size.
	stockCounts := map[int64]map[string]int{}
	for _, st := range req.Stocks {
		if st.NmId == 0 || st.TechSize == "" {
			continue
		}
		if stockCounts[st.NmId] == nil {
			stockCounts[st.NmId] = map[string]int{}
		}
		stockCounts[st.NmId][st.TechSize] += st.QuantityFull
	}

	// Build response.
	var products []productSizeAnalysis
	for nmID, sizes := range productSizes {
		var totalSales int
		for _, agg := range sizes {
			totalSales += agg.sales
		}

		pa := productSizeAnalysis{
			NmID:       nmID,
			TotalSales: totalSales,
		}

		for size, agg := range sizes {
			if pa.Name == "" {
				pa.Name = agg.name
				pa.Brand = agg.brand
			}

			salesShare := 0.0
			if totalSales > 0 {
				salesShare = float64(agg.sales) / float64(totalSales) * 100
			}

			returnRate := 0.0
			if agg.sales+agg.returns > 0 {
				returnRate = float64(agg.returns) / float64(agg.sales+agg.returns) * 100
			}

			orders := 0
			if orderCounts[nmID] != nil {
				orders = orderCounts[nmID][size]
			}
			buyoutRate := 0.0
			if orders > 0 {
				buyoutRate = float64(agg.sales) / float64(orders) * 100
			}

			stock := 0
			if stockCounts[nmID] != nil {
				stock = stockCounts[nmID][size]
			}
			avgDaily := float64(agg.sales) / 30.0
			daysOfStock := math.Inf(1)
			if avgDaily > 0 {
				daysOfStock = float64(stock) / avgDaily
			}

			pa.Sizes = append(pa.Sizes, sizeStats{
				Size:        size,
				Sales:       agg.sales,
				Returns:     agg.returns,
				Orders:      orders,
				Stock:       stock,
				SalesShare:  round2(salesShare),
				ReturnRate:  round2(returnRate),
				BuyoutRate:  round2(buyoutRate),
				DaysOfStock: round1(daysOfStock),
			})

			// Detect problems.
			if returnRate > 25 {
				pa.Problems = append(pa.Problems, size+": высокий % возвратов ("+formatPct(returnRate)+"%)")
			}
			if daysOfStock < 7 && !math.IsInf(daysOfStock, 1) {
				pa.Problems = append(pa.Problems, size+": остатков менее 7 дней")
			}
			if agg.sales == 0 && stock > 0 {
				pa.Problems = append(pa.Problems, size+": нет продаж при наличии остатков")
			}
		}

		sort.Slice(pa.Sizes, func(i, j int) bool {
			return pa.Sizes[i].Sales > pa.Sizes[j].Sales
		})
		products = append(products, pa)
	}

	sort.Slice(products, func(i, j int) bool {
		return products[i].TotalSales > products[j].TotalSales
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"products":       products,
		"total_products": len(products),
	})
}

// --- Size Recommendations ---

type sizeRecRequest struct {
	APIKeyID int64           `json:"api_key_id"`
	Sales    []wbapi.WBSale  `json:"sales"`
	Stocks   []wbapi.WBStock `json:"stocks"`
}

type sizeRecommendation struct {
	NmID           int64  `json:"nm_id"`
	Name           string `json:"name"`
	Size           string `json:"size"`
	CurrentStock   int    `json:"current_stock"`
	AvgDailySales  float64 `json:"avg_daily_sales"`
	DaysOfStock    float64 `json:"days_of_stock"`
	RecommendedQty int    `json:"recommended_qty"`
	Urgency        string `json:"urgency"` // critical, warning, ok
	Reason         string `json:"reason"`
}

func handleSizeRecommendations(w http.ResponseWriter, r *http.Request) {
	var req sizeRecRequest
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
		req.Stocks = data.Stocks
	}

	now := time.Now()
	day30ago := now.AddDate(0, 0, -30)

	// Sales per nmID+size.
	type key struct {
		nmID int64
		size string
	}
	salesCount := map[key]int{}
	names := map[int64]string{}

	for _, s := range req.Sales {
		if s.NmId == 0 || s.TechSize == "" {
			continue
		}
		if s.SaleID != "" && s.SaleID[0] == 'R' {
			continue
		}
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil || saleDate.Before(day30ago) {
			continue
		}
		salesCount[key{s.NmId, s.TechSize}]++
		if names[s.NmId] == "" {
			names[s.NmId] = s.Subject
		}
	}

	// Stock per nmID+size.
	stockCount := map[key]int{}
	for _, st := range req.Stocks {
		if st.NmId == 0 || st.TechSize == "" {
			continue
		}
		stockCount[key{st.NmId, st.TechSize}] += st.QuantityFull
		if names[st.NmId] == "" {
			names[st.NmId] = st.Subject
		}
	}

	// All known nmID+size combos.
	allKeys := map[key]bool{}
	for k := range salesCount {
		allKeys[k] = true
	}
	for k := range stockCount {
		allKeys[k] = true
	}

	var recs []sizeRecommendation
	for k := range allKeys {
		sales := salesCount[k]
		stock := stockCount[k]
		avgDaily := float64(sales) / 30.0
		daysOfStock := math.Inf(1)
		if avgDaily > 0 {
			daysOfStock = float64(stock) / avgDaily
		}

		needed := 0
		if avgDaily > 0 {
			needed = int(math.Ceil(avgDaily*30)) - stock
			if needed < 0 {
				needed = 0
			}
		}

		urgency := "ok"
		reason := ""
		if daysOfStock < 7 && !math.IsInf(daysOfStock, 1) {
			urgency = "critical"
			reason = "Остатков менее 7 дней — срочно пополнить"
		} else if daysOfStock < 14 && !math.IsInf(daysOfStock, 1) {
			urgency = "warning"
			reason = "Остатков менее 14 дней — запланировать поставку"
		} else if sales == 0 && stock > 10 {
			urgency = "warning"
			reason = "Нет продаж за 30 дней — проверить ценообразование"
		}

		if urgency == "ok" && needed == 0 {
			continue
		}

		recs = append(recs, sizeRecommendation{
			NmID:           k.nmID,
			Name:           names[k.nmID],
			Size:           k.size,
			CurrentStock:   stock,
			AvgDailySales:  round2(avgDaily),
			DaysOfStock:    round1(daysOfStock),
			RecommendedQty: needed,
			Urgency:        urgency,
			Reason:         reason,
		})
	}

	sort.Slice(recs, func(i, j int) bool {
		return urgencyOrder(recs[i].Urgency) < urgencyOrder(recs[j].Urgency)
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"recommendations": recs,
		"total":           len(recs),
		"critical_count":  countUrgency(recs, "critical"),
		"warning_count":   countUrgency(recs, "warning"),
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

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round1(v float64) float64 {
	if math.IsInf(v, 0) {
		return 999
	}
	return math.Round(v*10) / 10
}

func formatPct(v float64) string {
	rounded := math.Round(v*10) / 10
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.1f", rounded), "0"), ".")
}

func urgencyOrder(u string) int {
	switch u {
	case "critical":
		return 0
	case "warning":
		return 1
	default:
		return 2
	}
}

func countUrgency(recs []sizeRecommendation, u string) int {
	c := 0
	for _, r := range recs {
		if r.Urgency == u {
			c++
		}
	}
	return c
}
