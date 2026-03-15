package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"sort"
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

	mux.Handle("POST /api/stock/analyze", authMw(http.HandlerFunc(handleAnalyze)))
	mux.Handle("POST /api/stock/analytics", authMw(http.HandlerFunc(handleAnalyze))) // alias for frontend
	mux.Handle("POST /api/stock/supply-plan", authMw(http.HandlerFunc(handleSupplyPlan)))

	log.Printf("Stock Analytics service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// --- Request/Response types ---

type analyzeRequest struct {
	APIKeyID int64           `json:"api_key_id"`
	Sales    []wbapi.WBSale  `json:"sales"`
	Stocks   []wbapi.WBStock `json:"stocks"`
}

type productAnalysis struct {
	NmID            int64   `json:"nm_id"`
	Name            string  `json:"name"`
	Brand           string  `json:"brand"`
	CurrentStock    int     `json:"current_stock"`
	AvgDailySales   float64 `json:"avg_daily_sales"`
	DaysOfStock     float64 `json:"days_of_stock"`
	SalesLast7d     int     `json:"sales_last_7d"`
	SalesLast30d    int     `json:"sales_last_30d"`
	Revenue30d      float64 `json:"revenue_30d"`
	Urgency         string  `json:"urgency"`
	RecommendedQty  int     `json:"recommended_qty"`
	Warehouses      []warehouseStock `json:"warehouses"`
}

type warehouseStock struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
}

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req analyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	// If no inline data but api_key_id provided, fetch from collector
	if len(req.Sales) == 0 && len(req.Stocks) == 0 && req.APIKeyID > 0 {
		data, err := dataclient.FetchData(r.Header.Get("Authorization"))
		if err != nil {
			httpError(w, "failed to fetch data: "+err.Error(), http.StatusBadGateway)
			return
		}
		req.Sales = data.Sales
		req.Stocks = data.Stocks
	}

	analysis := analyzeStocks(req.Sales, req.Stocks)

	// Sort by urgency: critical first
	sort.Slice(analysis, func(i, j int) bool {
		return urgencyOrder(analysis[i].Urgency) < urgencyOrder(analysis[j].Urgency)
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"products":       analysis,
		"total_products": len(analysis),
		"critical_count": countByUrgency(analysis, "critical"),
		"warning_count":  countByUrgency(analysis, "warning"),
		"ok_count":       countByUrgency(analysis, "ok"),
	})
}

type supplyPlanRequest struct {
	APIKeyID   int64           `json:"api_key_id"`
	Sales      []wbapi.WBSale  `json:"sales"`
	Stocks     []wbapi.WBStock `json:"stocks"`
	TargetDays int             `json:"target_days"`
}

type supplyItem struct {
	NmID           int64   `json:"nm_id"`
	Name           string  `json:"name"`
	CurrentStock   int     `json:"current_stock"`
	AvgDailySales  float64 `json:"avg_daily_sales"`
	DaysOfStock    float64 `json:"days_of_stock"`
	QuantityToOrder int    `json:"quantity_to_order"`
	Urgency        string  `json:"urgency"`
	EstimatedCost  float64 `json:"estimated_cost"`
}

func handleSupplyPlan(w http.ResponseWriter, r *http.Request) {
	var req supplyPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	if len(req.Sales) == 0 && len(req.Stocks) == 0 && req.APIKeyID > 0 {
		data, err := dataclient.FetchData(r.Header.Get("Authorization"))
		if err != nil {
			httpError(w, "failed to fetch data: "+err.Error(), http.StatusBadGateway)
			return
		}
		req.Sales = data.Sales
		req.Stocks = data.Stocks
	}

	if req.TargetDays <= 0 {
		req.TargetDays = 30 // Default: plan for 30 days
	}

	analysis := analyzeStocks(req.Sales, req.Stocks)

	var plan []supplyItem
	var totalCost float64

	for _, a := range analysis {
		needed := int(math.Ceil(a.AvgDailySales*float64(req.TargetDays))) - a.CurrentStock
		if needed <= 0 {
			continue
		}

		avgPrice := 0.0
		if a.SalesLast30d > 0 {
			avgPrice = a.Revenue30d / float64(a.SalesLast30d)
		}
		estimatedCost := float64(needed) * avgPrice * 0.4 // Rough cost estimate (40% of sell price)

		plan = append(plan, supplyItem{
			NmID:           a.NmID,
			Name:           a.Name,
			CurrentStock:   a.CurrentStock,
			AvgDailySales:  a.AvgDailySales,
			DaysOfStock:    a.DaysOfStock,
			QuantityToOrder: needed,
			Urgency:        a.Urgency,
			EstimatedCost:  math.Round(estimatedCost*100) / 100,
		})
		totalCost += estimatedCost
	}

	sort.Slice(plan, func(i, j int) bool {
		return urgencyOrder(plan[i].Urgency) < urgencyOrder(plan[j].Urgency)
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"target_days":    req.TargetDays,
		"items":          plan,
		"total_items":    len(plan),
		"total_cost_est": math.Round(totalCost*100) / 100,
	})
}

// --- Analytics logic ---

func analyzeStocks(sales []wbapi.WBSale, stocks []wbapi.WBStock) []productAnalysis {
	now := time.Now()
	day7ago := now.AddDate(0, 0, -7)
	day30ago := now.AddDate(0, 0, -30)

	// Aggregate sales per NmID
	type salesAgg struct {
		count7d  int
		count30d int
		revenue  float64
		name     string
		brand    string
	}
	salesMap := map[int64]*salesAgg{}

	for _, s := range sales {
		if s.NmId == 0 {
			continue
		}
		agg, ok := salesMap[s.NmId]
		if !ok {
			agg = &salesAgg{name: s.Subject, brand: s.Brand}
			salesMap[s.NmId] = agg
		}

		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil {
			continue
		}

		if saleDate.After(day30ago) {
			agg.count30d++
			agg.revenue += s.ForPay
		}
		if saleDate.After(day7ago) {
			agg.count7d++
		}
	}

	// Aggregate stocks per NmID
	type stockAgg struct {
		total      int
		warehouses []warehouseStock
	}
	stockMap := map[int64]*stockAgg{}

	for _, st := range stocks {
		if st.NmId == 0 {
			continue
		}
		agg, ok := stockMap[st.NmId]
		if !ok {
			agg = &stockAgg{}
			stockMap[st.NmId] = agg
		}
		agg.total += st.QuantityFull
		agg.warehouses = append(agg.warehouses, warehouseStock{
			Name:     st.WarehouseName,
			Quantity: st.QuantityFull,
		})

		// Also register product name from stock if not in sales
		if _, ok := salesMap[st.NmId]; !ok {
			salesMap[st.NmId] = &salesAgg{name: st.Subject, brand: st.Brand}
		}
	}

	// Build analysis
	allNmIDs := map[int64]bool{}
	for id := range salesMap {
		allNmIDs[id] = true
	}
	for id := range stockMap {
		allNmIDs[id] = true
	}

	var result []productAnalysis
	for nmID := range allNmIDs {
		sa := salesMap[nmID]
		if sa == nil {
			sa = &salesAgg{}
		}
		st := stockMap[nmID]
		if st == nil {
			st = &stockAgg{}
		}

		avgDaily := float64(sa.count30d) / 30.0
		daysOfStock := math.Inf(1)
		if avgDaily > 0 {
			daysOfStock = float64(st.total) / avgDaily
		}

		urgency := "ok"
		if daysOfStock < 7 {
			urgency = "critical"
		} else if daysOfStock < 14 {
			urgency = "warning"
		}

		recommended := 0
		if avgDaily > 0 {
			recommended = int(math.Ceil(avgDaily*30)) - st.total
			if recommended < 0 {
				recommended = 0
			}
		}

		result = append(result, productAnalysis{
			NmID:           nmID,
			Name:           sa.name,
			Brand:          sa.brand,
			CurrentStock:   st.total,
			AvgDailySales:  math.Round(avgDaily*100) / 100,
			DaysOfStock:    math.Round(daysOfStock*10) / 10,
			SalesLast7d:    sa.count7d,
			SalesLast30d:   sa.count30d,
			Revenue30d:     math.Round(sa.revenue*100) / 100,
			Urgency:        urgency,
			RecommendedQty: recommended,
			Warehouses:     st.warehouses,
		})
	}

	return result
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

func countByUrgency(items []productAnalysis, urgency string) int {
	count := 0
	for _, item := range items {
		if item.Urgency == urgency {
			count++
		}
	}
	return count
}

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
