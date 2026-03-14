package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"sort"

	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var cfg *config.Config

func main() {
	cfg = config.Load()

	mux := http.NewServeMux()
	authMw := middleware.AuthMiddleware(cfg.JWTSecret)

	mux.Handle("POST /api/competitors/find", authMw(http.HandlerFunc(handleFindCompetitors)))
	mux.Handle("POST /api/competitors/gaps", authMw(http.HandlerFunc(handleFindGaps)))
	mux.Handle("POST /api/competitors/price-compare", authMw(http.HandlerFunc(handlePriceCompare)))

	// Phase 6: Advanced Competitor Analysis
	mux.Handle("POST /api/competitors/monitor", authMw(http.HandlerFunc(handleMonitorKeywords)))
	mux.Handle("POST /api/competitors/watchlist", authMw(http.HandlerFunc(handleWatchlist)))
	mux.Handle("POST /api/competitors/pricing", authMw(http.HandlerFunc(handlePricingAnalysis)))
	mux.Handle("POST /api/competitors/discounts", authMw(http.HandlerFunc(handleDiscountAnalysis)))
	mux.Handle("POST /api/competitors/reviews", authMw(http.HandlerFunc(handleReviewAnalysis)))

	log.Printf("Competitor Analysis service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// --- Find Competitors ---

type findRequest struct {
	Keywords []string `json:"keywords"` // Search keywords for category
	MyNmIDs  []int64  `json:"my_nm_ids"` // User's product NmIDs to exclude
}

type competitorProduct struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Price     float64 `json:"price"`
	SalePrice float64 `json:"sale_price"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
	Position  int     `json:"position"`
}

type competitorBrand struct {
	Brand       string              `json:"brand"`
	ProductCount int                `json:"product_count"`
	AvgPrice    float64             `json:"avg_price"`
	AvgRating   float64             `json:"avg_rating"`
	TotalFeedbacks int              `json:"total_feedbacks"`
	Products    []competitorProduct `json:"products"`
}

func handleFindCompetitors(w http.ResponseWriter, r *http.Request) {
	var req findRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	excludeSet := map[int64]bool{}
	for _, id := range req.MyNmIDs {
		excludeSet[id] = true
	}

	client := wbapi.NewClient("") // Public search API, no key needed
	brandMap := map[string]*competitorBrand{}
	position := 0

	for _, keyword := range req.Keywords {
		for page := 1; page <= 3; page++ { // First 3 pages
			result, err := client.SearchProducts(keyword, page)
			if err != nil {
				continue
			}
			for _, p := range result.Data.Products {
				if excludeSet[p.ID] {
					continue
				}
				position++

				cp := competitorProduct{
					NmID:      p.ID,
					Name:      p.Name,
					Brand:     p.Brand,
					Price:     float64(p.Price) / 100,
					SalePrice: float64(p.SalePriceU) / 100,
					Rating:    p.Rating,
					Feedbacks: p.Feedbacks,
					Position:  position,
				}

				b, ok := brandMap[p.Brand]
				if !ok {
					b = &competitorBrand{Brand: p.Brand}
					brandMap[p.Brand] = b
				}
				b.Products = append(b.Products, cp)
				b.ProductCount++
				b.TotalFeedbacks += p.Feedbacks
			}
		}
	}

	var brands []competitorBrand
	for _, b := range brandMap {
		totalPrice := 0.0
		totalRating := 0.0
		for _, p := range b.Products {
			totalPrice += p.SalePrice
			totalRating += p.Rating
		}
		b.AvgPrice = math.Round(totalPrice/float64(b.ProductCount)*100) / 100
		b.AvgRating = math.Round(totalRating/float64(b.ProductCount)*100) / 100
		brands = append(brands, *b)
	}

	sort.Slice(brands, func(i, j int) bool {
		return brands[i].TotalFeedbacks > brands[j].TotalFeedbacks
	})

	if len(brands) > 30 {
		brands = brands[:30]
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"brands":       brands,
		"total_brands": len(brands),
	})
}

// --- Find Gaps (products competitors have but you don't) ---

type gapsRequest struct {
	Keywords   []string `json:"keywords"`
	MyProducts []struct {
		NmID  int64  `json:"nm_id"`
		Name  string `json:"name"`
		Brand string `json:"brand"`
	} `json:"my_products"`
}

type gapItem struct {
	Keyword       string              `json:"keyword"`
	YourProducts  int                 `json:"your_products_in_top"`
	TopProducts   []competitorProduct `json:"top_products_you_miss"`
	Opportunity   string              `json:"opportunity"` // high, medium, low
}

func handleFindGaps(w http.ResponseWriter, r *http.Request) {
	var req gapsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	myIDs := map[int64]bool{}
	for _, p := range req.MyProducts {
		myIDs[p.NmID] = true
	}

	client := wbapi.NewClient("")
	var gaps []gapItem

	for _, keyword := range req.Keywords {
		result, err := client.SearchProducts(keyword, 1)
		if err != nil {
			continue
		}

		yourCount := 0
		var topMissing []competitorProduct
		for pos, p := range result.Data.Products {
			if myIDs[p.ID] {
				yourCount++
				continue
			}
			if pos < 20 { // Top-20 products
				topMissing = append(topMissing, competitorProduct{
					NmID:      p.ID,
					Name:      p.Name,
					Brand:     p.Brand,
					Price:     float64(p.Price) / 100,
					SalePrice: float64(p.SalePriceU) / 100,
					Rating:    p.Rating,
					Feedbacks: p.Feedbacks,
					Position:  pos + 1,
				})
			}
		}

		opportunity := "low"
		if yourCount == 0 {
			opportunity = "high"
		} else if yourCount < 3 {
			opportunity = "medium"
		}

		gaps = append(gaps, gapItem{
			Keyword:      keyword,
			YourProducts: yourCount,
			TopProducts:  topMissing,
			Opportunity:  opportunity,
		})
	}

	jsonResponse(w, http.StatusOK, gaps)
}

// --- Price Compare ---

type priceCompareRequest struct {
	MyProducts []struct {
		NmID  int64   `json:"nm_id"`
		Name  string  `json:"name"`
		Price float64 `json:"price"`
	} `json:"my_products"`
	Keywords []string `json:"keywords"`
}

type priceCompareItem struct {
	NmID           int64   `json:"nm_id"`
	Name           string  `json:"name"`
	MyPrice        float64 `json:"my_price"`
	MarketAvgPrice float64 `json:"market_avg_price"`
	MarketMinPrice float64 `json:"market_min_price"`
	MarketMaxPrice float64 `json:"market_max_price"`
	PriceDiffPct   float64 `json:"price_diff_pct"` // positive = overpriced
	Recommendation string  `json:"recommendation"`
}

func handlePriceCompare(w http.ResponseWriter, r *http.Request) {
	var req priceCompareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient("")

	// Collect market prices from search
	var marketPrices []float64
	for _, kw := range req.Keywords {
		result, err := client.SearchProducts(kw, 1)
		if err != nil {
			continue
		}
		for _, p := range result.Data.Products {
			price := float64(p.SalePriceU) / 100
			if price > 0 {
				marketPrices = append(marketPrices, price)
			}
		}
	}

	if len(marketPrices) == 0 {
		jsonResponse(w, http.StatusOK, []priceCompareItem{})
		return
	}

	sort.Float64s(marketPrices)
	avgPrice := 0.0
	for _, p := range marketPrices {
		avgPrice += p
	}
	avgPrice /= float64(len(marketPrices))
	minPrice := marketPrices[0]
	maxPrice := marketPrices[len(marketPrices)-1]

	var items []priceCompareItem
	for _, mp := range req.MyProducts {
		diffPct := 0.0
		if avgPrice > 0 {
			diffPct = (mp.Price - avgPrice) / avgPrice * 100
		}

		rec := "price is competitive"
		if diffPct > 15 {
			rec = "consider lowering price"
		} else if diffPct < -15 {
			rec = "room to increase price"
		}

		items = append(items, priceCompareItem{
			NmID:           mp.NmID,
			Name:           mp.Name,
			MyPrice:        mp.Price,
			MarketAvgPrice: math.Round(avgPrice*100) / 100,
			MarketMinPrice: minPrice,
			MarketMaxPrice: maxPrice,
			PriceDiffPct:   math.Round(diffPct*100) / 100,
			Recommendation: rec,
		})
	}

	jsonResponse(w, http.StatusOK, items)
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
