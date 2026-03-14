package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var cfg *config.Config

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("POST /api/sales/dashboard", authMw(http.HandlerFunc(handleDashboard)))
	mux.Handle("POST /api/sales/funnel", authMw(http.HandlerFunc(handleFunnel)))
	mux.Handle("POST /api/sales/abc-analysis", authMw(http.HandlerFunc(handleABC)))
	mux.Handle("POST /api/sales/trends", authMw(http.HandlerFunc(handleTrends)))

	log.Printf("Sales Analytics service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// --- Dashboard ---

type dashboardRequest struct {
	Sales  []wbapi.WBSale  `json:"sales"`
	Orders []wbapi.WBOrder `json:"orders"`
}

type dashboardResponse struct {
	TotalRevenue    float64         `json:"total_revenue"`
	TotalOrders     int             `json:"total_orders"`
	TotalSales      int             `json:"total_sales"`
	TotalReturns    int             `json:"total_returns"`
	ReturnRate      float64         `json:"return_rate"`
	AvgOrderValue   float64         `json:"avg_order_value"`
	TopProducts     []productStat   `json:"top_products"`
	DailyRevenue    []dailyStat     `json:"daily_revenue"`
	RegionBreakdown []regionStat    `json:"region_breakdown"`
}

type productStat struct {
	NmID     int64   `json:"nm_id"`
	Name     string  `json:"name"`
	Brand    string  `json:"brand"`
	Sales    int     `json:"sales"`
	Revenue  float64 `json:"revenue"`
	Returns  int     `json:"returns"`
}

type dailyStat struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

type regionStat struct {
	Region  string  `json:"region"`
	Orders  int     `json:"orders"`
	Revenue float64 `json:"revenue"`
}

func handleDashboard(w http.ResponseWriter, r *http.Request) {
	var req dashboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var totalRevenue float64
	var totalReturns int
	productMap := map[int64]*productStat{}
	dailyMap := map[string]*dailyStat{}
	regionMap := map[string]*regionStat{}

	for _, s := range req.Sales {
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil {
			continue
		}
		dayKey := saleDate.Format("2006-01-02")

		if s.SaleID != "" && s.SaleID[0] == 'R' {
			totalReturns++
			p := getOrCreateProduct(productMap, s.NmId, s.Subject, s.Brand)
			p.Returns++
			continue
		}

		totalRevenue += s.ForPay

		p := getOrCreateProduct(productMap, s.NmId, s.Subject, s.Brand)
		p.Sales++
		p.Revenue += s.ForPay

		d, ok := dailyMap[dayKey]
		if !ok {
			d = &dailyStat{Date: dayKey}
			dailyMap[dayKey] = d
		}
		d.Revenue += s.ForPay
		d.Orders++

		reg := s.RegionName
		if reg == "" {
			reg = "Unknown"
		}
		rg, ok := regionMap[reg]
		if !ok {
			rg = &regionStat{Region: reg}
			regionMap[reg] = rg
		}
		rg.Orders++
		rg.Revenue += s.ForPay
	}

	// Top products
	var topProducts []productStat
	for _, p := range productMap {
		topProducts = append(topProducts, *p)
	}
	sort.Slice(topProducts, func(i, j int) bool {
		return topProducts[i].Revenue > topProducts[j].Revenue
	})
	if len(topProducts) > 20 {
		topProducts = topProducts[:20]
	}

	// Daily revenue sorted by date
	var daily []dailyStat
	for _, d := range dailyMap {
		daily = append(daily, *d)
	}
	sort.Slice(daily, func(i, j int) bool {
		return daily[i].Date < daily[j].Date
	})

	// Regions sorted by revenue
	var regions []regionStat
	for _, rg := range regionMap {
		regions = append(regions, *rg)
	}
	sort.Slice(regions, func(i, j int) bool {
		return regions[i].Revenue > regions[j].Revenue
	})

	totalSales := len(req.Sales) - totalReturns
	returnRate := 0.0
	if len(req.Sales) > 0 {
		returnRate = float64(totalReturns) / float64(len(req.Sales)) * 100
	}
	avgOrder := 0.0
	if totalSales > 0 {
		avgOrder = totalRevenue / float64(totalSales)
	}

	jsonResponse(w, http.StatusOK, dashboardResponse{
		TotalRevenue:    math.Round(totalRevenue*100) / 100,
		TotalOrders:     len(req.Orders),
		TotalSales:      totalSales,
		TotalReturns:    totalReturns,
		ReturnRate:      math.Round(returnRate*100) / 100,
		AvgOrderValue:   math.Round(avgOrder*100) / 100,
		TopProducts:     topProducts,
		DailyRevenue:    daily,
		RegionBreakdown: regions,
	})
}

// --- Funnel ---

type funnelRequest struct {
	Sales  []wbapi.WBSale  `json:"sales"`
	Orders []wbapi.WBOrder `json:"orders"`
}

type funnelItem struct {
	NmID       int64   `json:"nm_id"`
	Name       string  `json:"name"`
	Orders     int     `json:"orders"`
	Sales      int     `json:"sales"`
	Returns    int     `json:"returns"`
	Cancels    int     `json:"cancels"`
	BuyoutRate float64 `json:"buyout_rate"`
	CancelRate float64 `json:"cancel_rate"`
	ReturnRate float64 `json:"return_rate"`
}

func handleFunnel(w http.ResponseWriter, r *http.Request) {
	var req funnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	type agg struct {
		name    string
		orders  int
		sales   int
		returns int
		cancels int
	}
	productMap := map[int64]*agg{}

	for _, o := range req.Orders {
		a, ok := productMap[o.NmId]
		if !ok {
			a = &agg{name: o.Subject}
			productMap[o.NmId] = a
		}
		a.orders++
		if o.IsCancel {
			a.cancels++
		}
	}

	for _, s := range req.Sales {
		a, ok := productMap[s.NmId]
		if !ok {
			a = &agg{name: s.Subject}
			productMap[s.NmId] = a
		}
		if s.SaleID != "" && s.SaleID[0] == 'R' {
			a.returns++
		} else {
			a.sales++
		}
	}

	var items []funnelItem
	for nmID, a := range productMap {
		buyoutRate := 0.0
		if a.orders > 0 {
			buyoutRate = float64(a.sales) / float64(a.orders) * 100
		}
		cancelRate := 0.0
		if a.orders > 0 {
			cancelRate = float64(a.cancels) / float64(a.orders) * 100
		}
		returnRate := 0.0
		if a.sales > 0 {
			returnRate = float64(a.returns) / float64(a.sales) * 100
		}

		items = append(items, funnelItem{
			NmID:       nmID,
			Name:       a.name,
			Orders:     a.orders,
			Sales:      a.sales,
			Returns:    a.returns,
			Cancels:    a.cancels,
			BuyoutRate: math.Round(buyoutRate*100) / 100,
			CancelRate: math.Round(cancelRate*100) / 100,
			ReturnRate: math.Round(returnRate*100) / 100,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Orders > items[j].Orders
	})

	jsonResponse(w, http.StatusOK, items)
}

// --- ABC Analysis ---

type abcRequest struct {
	Sales []wbapi.WBSale `json:"sales"`
}

type abcItem struct {
	NmID       int64   `json:"nm_id"`
	Name       string  `json:"name"`
	Revenue    float64 `json:"revenue"`
	SharePct   float64 `json:"share_pct"`
	CumPct     float64 `json:"cumulative_pct"`
	Category   string  `json:"category"` // A, B, C
}

func handleABC(w http.ResponseWriter, r *http.Request) {
	var req abcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	revenueMap := map[int64]*struct {
		name    string
		revenue float64
	}{}
	var totalRevenue float64

	for _, s := range req.Sales {
		if s.SaleID != "" && s.SaleID[0] == 'R' {
			continue
		}
		p, ok := revenueMap[s.NmId]
		if !ok {
			p = &struct {
				name    string
				revenue float64
			}{name: s.Subject}
			revenueMap[s.NmId] = p
		}
		p.revenue += s.ForPay
		totalRevenue += s.ForPay
	}

	var items []abcItem
	for nmID, p := range revenueMap {
		share := 0.0
		if totalRevenue > 0 {
			share = p.revenue / totalRevenue * 100
		}
		items = append(items, abcItem{
			NmID:     nmID,
			Name:     p.name,
			Revenue:  math.Round(p.revenue*100) / 100,
			SharePct: math.Round(share*100) / 100,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Revenue > items[j].Revenue
	})

	cumPct := 0.0
	for i := range items {
		cumPct += items[i].SharePct
		items[i].CumPct = math.Round(cumPct*100) / 100
		if cumPct <= 80 {
			items[i].Category = "A"
		} else if cumPct <= 95 {
			items[i].Category = "B"
		} else {
			items[i].Category = "C"
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"items":         items,
		"total_revenue": math.Round(totalRevenue*100) / 100,
		"a_count":       countABC(items, "A"),
		"b_count":       countABC(items, "B"),
		"c_count":       countABC(items, "C"),
	})
}

func countABC(items []abcItem, cat string) int {
	c := 0
	for _, item := range items {
		if item.Category == cat {
			c++
		}
	}
	return c
}

// --- Trends ---

type trendsRequest struct {
	Sales []wbapi.WBSale `json:"sales"`
}

type trendItem struct {
	NmID          int64   `json:"nm_id"`
	Name          string  `json:"name"`
	SalesWeek1    int     `json:"sales_week1"`
	SalesWeek2    int     `json:"sales_week2"`
	SalesWeek3    int     `json:"sales_week3"`
	SalesWeek4    int     `json:"sales_week4"`
	Trend         string  `json:"trend"` // growing, declining, stable
	GrowthRate    float64 `json:"growth_rate_pct"`
}

func handleTrends(w http.ResponseWriter, r *http.Request) {
	var req trendsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	now := time.Now()
	weeks := [4]time.Time{
		now.AddDate(0, 0, -7),
		now.AddDate(0, 0, -14),
		now.AddDate(0, 0, -21),
		now.AddDate(0, 0, -28),
	}

	type weekAgg struct {
		name string
		w    [4]int
	}
	productMap := map[int64]*weekAgg{}

	for _, s := range req.Sales {
		if s.SaleID != "" && s.SaleID[0] == 'R' {
			continue
		}
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil {
			continue
		}

		a, ok := productMap[s.NmId]
		if !ok {
			a = &weekAgg{name: s.Subject}
			productMap[s.NmId] = a
		}

		switch {
		case saleDate.After(weeks[0]):
			a.w[0]++
		case saleDate.After(weeks[1]):
			a.w[1]++
		case saleDate.After(weeks[2]):
			a.w[2]++
		case saleDate.After(weeks[3]):
			a.w[3]++
		}
	}

	var items []trendItem
	for nmID, a := range productMap {
		recent := float64(a.w[0] + a.w[1])
		older := float64(a.w[2] + a.w[3])
		growthRate := 0.0
		if older > 0 {
			growthRate = (recent - older) / older * 100
		}

		trend := "stable"
		if growthRate > 20 {
			trend = "growing"
		} else if growthRate < -20 {
			trend = "declining"
		}

		items = append(items, trendItem{
			NmID:       nmID,
			Name:       a.name,
			SalesWeek1: a.w[0],
			SalesWeek2: a.w[1],
			SalesWeek3: a.w[2],
			SalesWeek4: a.w[3],
			Trend:      trend,
			GrowthRate: math.Round(growthRate*100) / 100,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].GrowthRate > items[j].GrowthRate
	})

	jsonResponse(w, http.StatusOK, items)
}

// --- Helpers ---

func getOrCreateProduct(m map[int64]*productStat, nmID int64, name, brand string) *productStat {
	p, ok := m[nmID]
	if !ok {
		p = &productStat{NmID: nmID, Name: name, Brand: brand}
		m[nmID] = p
	}
	return p
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
