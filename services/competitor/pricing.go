package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Advanced Pricing: Segments, Elasticity, Recommendations ---

type pricingRequest struct {
	Keywords   []string `json:"keywords"`
	MyProducts []myProductPrice `json:"my_products,omitempty"`
}

type myProductPrice struct {
	NmID  int64   `json:"nm_id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type pricingResponse struct {
	Segments     []priceSegment    `json:"segments"`
	Distribution priceDistribution `json:"distribution"`
	MyAnalysis   []myPriceAnalysis `json:"my_analysis,omitempty"`
	Recommendations []string       `json:"recommendations"`
}

type priceSegment struct {
	Name       string  `json:"name"`      // economy, medium, premium, luxury
	MinPrice   float64 `json:"min_price"`
	MaxPrice   float64 `json:"max_price"`
	Products   int     `json:"product_count"`
	AvgRating  float64 `json:"avg_rating"`
	AvgFeedbacks float64 `json:"avg_feedbacks"`
	SharePct   float64 `json:"share_pct"`
}

type priceDistribution struct {
	Min      float64 `json:"min"`
	Q1       float64 `json:"q1"`       // 25th percentile
	Median   float64 `json:"median"`
	Q3       float64 `json:"q3"`       // 75th percentile
	Max      float64 `json:"max"`
	Mean     float64 `json:"mean"`
	StdDev   float64 `json:"std_dev"`
}

type myPriceAnalysis struct {
	NmID         int64   `json:"nm_id"`
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	Segment      string  `json:"segment"`
	Percentile   float64 `json:"percentile"`     // where the price stands (0-100)
	VsMedianPct  float64 `json:"vs_median_pct"`  // diff from median
	OptimalRange [2]float64 `json:"optimal_range"` // suggested price range
	Action       string  `json:"action"`          // keep, consider_lower, consider_higher, competitive
}

type productData struct {
	price     float64
	rating    float64
	feedbacks int
}

func handlePricingAnalysis(w http.ResponseWriter, r *http.Request) {
	var req pricingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient("")
	var allProducts []productData

	for _, kw := range req.Keywords {
		for page := 1; page <= 2; page++ {
			result, err := client.SearchProducts(kw, page)
			if err != nil {
				break
			}
			for _, p := range result.Data.Products {
				price := float64(p.SalePriceU) / 100
				if price > 0 {
					allProducts = append(allProducts, productData{
						price: price, rating: p.Rating, feedbacks: p.Feedbacks,
					})
				}
			}
		}
	}

	if len(allProducts) == 0 {
		jsonResponse(w, http.StatusOK, pricingResponse{})
		return
	}

	// Sort by price.
	sort.Slice(allProducts, func(i, j int) bool {
		return allProducts[i].price < allProducts[j].price
	})

	prices := make([]float64, len(allProducts))
	for i, p := range allProducts {
		prices[i] = p.price
	}

	// Distribution stats.
	dist := calcDistribution(prices)

	// Price segments using quartiles.
	segments := buildSegments(allProducts, dist)

	// My product analysis.
	var myAnalysis []myPriceAnalysis
	var recs []string

	for _, mp := range req.MyProducts {
		analysis := analyzeMyPrice(mp, prices, dist, segments)
		myAnalysis = append(myAnalysis, analysis)
	}

	// Generate recommendations.
	recs = generatePricingRecs(dist, segments, myAnalysis)

	jsonResponse(w, http.StatusOK, pricingResponse{
		Segments:        segments,
		Distribution:    dist,
		MyAnalysis:      myAnalysis,
		Recommendations: recs,
	})
}

func calcDistribution(prices []float64) priceDistribution {
	n := len(prices)
	if n == 0 {
		return priceDistribution{}
	}

	sum := 0.0
	for _, p := range prices {
		sum += p
	}
	mean := sum / float64(n)

	var variance float64
	for _, p := range prices {
		d := p - mean
		variance += d * d
	}
	stdDev := 0.0
	if n > 1 {
		stdDev = math.Sqrt(variance / float64(n-1))
	}

	return priceDistribution{
		Min:    prices[0],
		Q1:     percentile(prices, 25),
		Median: percentile(prices, 50),
		Q3:     percentile(prices, 75),
		Max:    prices[n-1],
		Mean:   math.Round(mean*100) / 100,
		StdDev: math.Round(stdDev*100) / 100,
	}
}

func percentile(sorted []float64, pct float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := pct / 100 * float64(len(sorted)-1)
	lower := int(math.Floor(idx))
	upper := int(math.Ceil(idx))
	if lower == upper || upper >= len(sorted) {
		return sorted[lower]
	}
	frac := idx - float64(lower)
	return sorted[lower]*(1-frac) + sorted[upper]*frac
}

func buildSegments(products []productData, dist priceDistribution) []priceSegment {
	boundaries := []struct {
		name string
		min  float64
		max  float64
	}{
		{"economy", dist.Min, dist.Q1},
		{"medium", dist.Q1, dist.Median},
		{"premium", dist.Median, dist.Q3},
		{"luxury", dist.Q3, dist.Max + 1},
	}

	total := float64(len(products))
	var segments []priceSegment

	for _, b := range boundaries {
		var count int
		var sumRating float64
		var sumFeedbacks int

		for _, p := range products {
			if p.price >= b.min && p.price < b.max {
				count++
				sumRating += p.rating
				sumFeedbacks += p.feedbacks
			}
		}

		if count == 0 {
			continue
		}

		segments = append(segments, priceSegment{
			Name:         b.name,
			MinPrice:     math.Round(b.min*100) / 100,
			MaxPrice:     math.Round(b.max*100) / 100,
			Products:     count,
			AvgRating:    math.Round(sumRating/float64(count)*100) / 100,
			AvgFeedbacks: math.Round(float64(sumFeedbacks)/float64(count)*100) / 100,
			SharePct:     math.Round(float64(count)/total*10000) / 100,
		})
	}

	return segments
}

func analyzeMyPrice(mp myProductPrice, sortedPrices []float64, dist priceDistribution, segments []priceSegment) myPriceAnalysis {
	a := myPriceAnalysis{
		NmID:  mp.NmID,
		Name:  mp.Name,
		Price: mp.Price,
	}

	// Find percentile.
	below := 0
	for _, p := range sortedPrices {
		if p < mp.Price {
			below++
		}
	}
	a.Percentile = math.Round(float64(below)/float64(len(sortedPrices))*10000) / 100

	// Vs median.
	if dist.Median > 0 {
		a.VsMedianPct = math.Round((mp.Price-dist.Median)/dist.Median*10000) / 100
	}

	// Determine segment.
	switch {
	case mp.Price < dist.Q1:
		a.Segment = "economy"
	case mp.Price < dist.Median:
		a.Segment = "medium"
	case mp.Price < dist.Q3:
		a.Segment = "premium"
	default:
		a.Segment = "luxury"
	}

	// Optimal range: Q1 to Q3 (middle 50% of market).
	a.OptimalRange = [2]float64{
		math.Round(dist.Q1*100) / 100,
		math.Round(dist.Q3*100) / 100,
	}

	// Action recommendation.
	switch {
	case a.VsMedianPct > 30:
		a.Action = "consider_lower"
	case a.VsMedianPct < -30:
		a.Action = "consider_higher"
	case a.VsMedianPct >= -10 && a.VsMedianPct <= 10:
		a.Action = "competitive"
	default:
		a.Action = "keep"
	}

	return a
}

func generatePricingRecs(dist priceDistribution, segments []priceSegment, myAnalysis []myPriceAnalysis) []string {
	var recs []string

	// Find most competitive segment.
	var bestSegment priceSegment
	maxFeedbacks := 0.0
	for _, s := range segments {
		if s.AvgFeedbacks > maxFeedbacks {
			maxFeedbacks = s.AvgFeedbacks
			bestSegment = s
		}
	}
	if bestSegment.Name != "" {
		recs = append(recs, "Сегмент с наибольшим спросом: "+bestSegment.Name+
			" (средние отзывы: "+formatPrice(bestSegment.AvgFeedbacks)+")")
	}

	// Median pricing recommendation.
	recs = append(recs, "Медианная цена рынка: "+formatPrice(dist.Median)+
		" руб. Оптимальный диапазон: "+formatPrice(dist.Q1)+" — "+formatPrice(dist.Q3)+" руб.")

	// Per-product recommendations.
	for _, a := range myAnalysis {
		switch a.Action {
		case "consider_lower":
			recs = append(recs, a.Name+": цена выше рынка на "+formatPrice(a.VsMedianPct)+
				"%. Рассмотрите снижение до "+formatPrice(a.OptimalRange[1])+" руб.")
		case "consider_higher":
			recs = append(recs, a.Name+": цена ниже рынка на "+formatPrice(-a.VsMedianPct)+
				"%. Есть потенциал повышения до "+formatPrice(a.OptimalRange[0])+" руб.")
		}
	}

	return recs
}

// --- Discount & Promotion Analysis ---

type discountRequest struct {
	Keywords []string `json:"keywords"`
}

type discountAnalysis struct {
	Keyword         string          `json:"keyword"`
	TotalProducts   int             `json:"total_products"`
	WithDiscount    int             `json:"with_discount"`
	DiscountRate    float64         `json:"discount_rate_pct"`
	AvgDiscountPct  float64         `json:"avg_discount_pct"`
	MaxDiscountPct  float64         `json:"max_discount_pct"`
	Buckets         []discountBucket `json:"discount_buckets"`
}

type discountBucket struct {
	Range    string  `json:"range"`
	Count    int     `json:"count"`
	SharePct float64 `json:"share_pct"`
}

func handleDiscountAnalysis(w http.ResponseWriter, r *http.Request) {
	var req discountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(req.Keywords) == 0 {
		httpError(w, "keywords required", http.StatusBadRequest)
		return
	}

	client := wbapi.NewClient("")
	var results []discountAnalysis

	for _, kw := range req.Keywords {
		result, err := client.SearchProducts(kw, 1)
		if err != nil {
			continue
		}

		da := discountAnalysis{Keyword: kw}
		var totalDisc float64
		var maxDisc float64
		bucketCounts := map[string]int{
			"0%": 0, "1-10%": 0, "11-20%": 0, "21-30%": 0, "31-50%": 0, "50%+": 0,
		}

		for _, p := range result.Data.Products {
			da.TotalProducts++
			discPct := float64(p.Sale)
			if discPct > 0 {
				da.WithDiscount++
				totalDisc += discPct
				if discPct > maxDisc {
					maxDisc = discPct
				}
			}

			switch {
			case discPct == 0:
				bucketCounts["0%"]++
			case discPct <= 10:
				bucketCounts["1-10%"]++
			case discPct <= 20:
				bucketCounts["11-20%"]++
			case discPct <= 30:
				bucketCounts["21-30%"]++
			case discPct <= 50:
				bucketCounts["31-50%"]++
			default:
				bucketCounts["50%+"]++
			}
		}

		if da.WithDiscount > 0 {
			da.AvgDiscountPct = math.Round(totalDisc/float64(da.WithDiscount)*10) / 10
		}
		da.MaxDiscountPct = maxDisc
		if da.TotalProducts > 0 {
			da.DiscountRate = math.Round(float64(da.WithDiscount)/float64(da.TotalProducts)*10000) / 100
		}

		order := []string{"0%", "1-10%", "11-20%", "21-30%", "31-50%", "50%+"}
		for _, name := range order {
			cnt := bucketCounts[name]
			share := 0.0
			if da.TotalProducts > 0 {
				share = float64(cnt) / float64(da.TotalProducts) * 100
			}
			da.Buckets = append(da.Buckets, discountBucket{
				Range: name, Count: cnt,
				SharePct: math.Round(share*10) / 10,
			})
		}

		results = append(results, da)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"analyses": results,
		"total":    len(results),
	})
}

func formatPrice(v float64) string {
	if v == float64(int(v)) {
		return fmt.Sprintf("%.0f", v)
	}
	return fmt.Sprintf("%.1f", v)
}
