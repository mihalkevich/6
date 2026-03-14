package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Competitor Review & Rating Analysis ---
// Analyzes competitor ratings/feedbacks from search results to find
// weaknesses and opportunities.

type reviewAnalysisRequest struct {
	Keywords []string `json:"keywords"`
	MyNmIDs  []int64  `json:"my_nm_ids,omitempty"`
}

type reviewAnalysisResponse struct {
	MarketOverview reviewMarketOverview `json:"market_overview"`
	WeakSpots      []weakSpot           `json:"weak_spots"`
	TopRated       []ratedProduct       `json:"top_rated"`
	WorstRated     []ratedProduct       `json:"worst_rated"`
	Opportunities  []reviewOpportunity  `json:"opportunities"`
	MyPosition     []myRatingPosition   `json:"my_position,omitempty"`
}

type reviewMarketOverview struct {
	TotalProducts  int     `json:"total_products"`
	AvgRating      float64 `json:"avg_rating"`
	MedianRating   float64 `json:"median_rating"`
	AvgFeedbacks   float64 `json:"avg_feedbacks"`
	MedianFeedbacks float64 `json:"median_feedbacks"`
	HighRated      int     `json:"high_rated_count"`  // rating >= 4.5
	LowRated       int     `json:"low_rated_count"`   // rating < 4.0
	NoReviews      int     `json:"no_reviews_count"`  // feedbacks == 0
}

type ratedProduct struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
	Price     float64 `json:"price"`
	Position  int     `json:"position"`
}

type weakSpot struct {
	Brand          string  `json:"brand"`
	ProductCount   int     `json:"product_count"`
	AvgRating      float64 `json:"avg_rating"`
	AvgFeedbacks   float64 `json:"avg_feedbacks"`
	Vulnerability  string  `json:"vulnerability"` // low_rating, few_reviews, high_price_low_rating
	Recommendation string  `json:"recommendation"`
}

type reviewOpportunity struct {
	Description string  `json:"description"`
	Impact      string  `json:"impact"` // high, medium, low
	Metric      string  `json:"metric"`
	Value       float64 `json:"value"`
}

type myRatingPosition struct {
	NmID            int64   `json:"nm_id"`
	Name            string  `json:"name"`
	Rating          float64 `json:"rating"`
	Feedbacks       int     `json:"feedbacks"`
	RatingPercentile float64 `json:"rating_percentile"`
	FeedbackPercentile float64 `json:"feedback_percentile"`
	VsMarketRating  float64 `json:"vs_market_rating"`
	Verdict         string  `json:"verdict"` // above_market, at_market, below_market
}

func handleReviewAnalysis(w http.ResponseWriter, r *http.Request) {
	var req reviewAnalysisRequest
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

	seen := map[int64]bool{}
	var allProducts []ratedProduct
	myProducts := map[int64]ratedProduct{}

	position := 0
	for _, kw := range req.Keywords {
		result, err := client.SearchProducts(kw, 1)
		if err != nil {
			continue
		}
		for _, p := range result.Data.Products {
			if seen[p.ID] {
				continue
			}
			seen[p.ID] = true
			position++

			rp := ratedProduct{
				NmID:      p.ID,
				Name:      p.Name,
				Brand:     p.Brand,
				Rating:    p.Rating,
				Feedbacks: p.Feedbacks,
				Price:     float64(p.SalePriceU) / 100,
				Position:  position,
			}

			if myIDs[p.ID] {
				myProducts[p.ID] = rp
			}
			allProducts = append(allProducts, rp)
		}
	}

	if len(allProducts) == 0 {
		jsonResponse(w, http.StatusOK, reviewAnalysisResponse{})
		return
	}

	resp := reviewAnalysisResponse{}

	// Market overview.
	resp.MarketOverview = calcReviewOverview(allProducts)

	// Top and worst rated.
	sortedByRating := make([]ratedProduct, len(allProducts))
	copy(sortedByRating, allProducts)
	sort.Slice(sortedByRating, func(i, j int) bool {
		if sortedByRating[i].Rating != sortedByRating[j].Rating {
			return sortedByRating[i].Rating > sortedByRating[j].Rating
		}
		return sortedByRating[i].Feedbacks > sortedByRating[j].Feedbacks
	})

	if len(sortedByRating) > 10 {
		resp.TopRated = sortedByRating[:10]
	} else {
		resp.TopRated = sortedByRating
	}

	// Worst rated (with at least some feedbacks).
	var worstCandidates []ratedProduct
	for i := len(sortedByRating) - 1; i >= 0; i-- {
		if sortedByRating[i].Feedbacks >= 5 {
			worstCandidates = append(worstCandidates, sortedByRating[i])
		}
		if len(worstCandidates) >= 10 {
			break
		}
	}
	resp.WorstRated = worstCandidates

	// Weak spots by brand.
	resp.WeakSpots = findWeakSpots(allProducts, resp.MarketOverview)

	// Opportunities.
	resp.Opportunities = findOpportunities(resp.MarketOverview, allProducts)

	// My position.
	if len(myProducts) > 0 {
		ratings := make([]float64, len(allProducts))
		feedbacks := make([]float64, len(allProducts))
		for i, p := range allProducts {
			ratings[i] = p.Rating
			feedbacks[i] = float64(p.Feedbacks)
		}
		sort.Float64s(ratings)
		sort.Float64s(feedbacks)

		for _, id := range req.MyNmIDs {
			mp, ok := myProducts[id]
			if !ok {
				continue
			}

			rPct := calcPercentile(ratings, mp.Rating)
			fPct := calcPercentile(feedbacks, float64(mp.Feedbacks))
			vsMarket := mp.Rating - resp.MarketOverview.AvgRating

			verdict := "at_market"
			if vsMarket > 0.3 {
				verdict = "above_market"
			} else if vsMarket < -0.3 {
				verdict = "below_market"
			}

			resp.MyPosition = append(resp.MyPosition, myRatingPosition{
				NmID:               mp.NmID,
				Name:               mp.Name,
				Rating:             mp.Rating,
				Feedbacks:          mp.Feedbacks,
				RatingPercentile:   rPct,
				FeedbackPercentile: fPct,
				VsMarketRating:     math.Round(vsMarket*100) / 100,
				Verdict:            verdict,
			})
		}
	}

	jsonResponse(w, http.StatusOK, resp)
}

func calcReviewOverview(products []ratedProduct) reviewMarketOverview {
	n := len(products)
	ov := reviewMarketOverview{TotalProducts: n}

	ratings := make([]float64, n)
	feedbackCounts := make([]float64, n)
	var sumRating float64
	var sumFeedbacks int

	for i, p := range products {
		ratings[i] = p.Rating
		feedbackCounts[i] = float64(p.Feedbacks)
		sumRating += p.Rating
		sumFeedbacks += p.Feedbacks

		if p.Rating >= 4.5 {
			ov.HighRated++
		}
		if p.Rating < 4.0 && p.Rating > 0 {
			ov.LowRated++
		}
		if p.Feedbacks == 0 {
			ov.NoReviews++
		}
	}

	ov.AvgRating = math.Round(sumRating/float64(n)*100) / 100
	ov.AvgFeedbacks = math.Round(float64(sumFeedbacks)/float64(n)*100) / 100

	sort.Float64s(ratings)
	sort.Float64s(feedbackCounts)
	ov.MedianRating = ratings[n/2]
	ov.MedianFeedbacks = feedbackCounts[n/2]

	return ov
}

func findWeakSpots(products []ratedProduct, overview reviewMarketOverview) []weakSpot {
	type brandAgg struct {
		products  int
		sumRating float64
		sumFeedbacks int
		sumPrice  float64
	}
	brands := map[string]*brandAgg{}

	for _, p := range products {
		b, ok := brands[p.Brand]
		if !ok {
			b = &brandAgg{}
			brands[p.Brand] = b
		}
		b.products++
		b.sumRating += p.Rating
		b.sumFeedbacks += p.Feedbacks
		b.sumPrice += p.Price
	}

	var spots []weakSpot
	for brand, b := range brands {
		if b.products < 2 {
			continue
		}
		avgRating := b.sumRating / float64(b.products)
		avgFeedbacks := float64(b.sumFeedbacks) / float64(b.products)

		var vuln, rec string

		if avgRating < overview.AvgRating-0.3 {
			vuln = "low_rating"
			rec = "Бренд " + brand + " имеет рейтинг ниже среднего — можно привлечь их аудиторию качеством"
		} else if avgFeedbacks < overview.AvgFeedbacks*0.3 {
			vuln = "few_reviews"
			rec = "Бренд " + brand + " имеет мало отзывов — уязвим для конкурентов с социальным доказательством"
		} else if avgRating < 4.2 && b.sumPrice/float64(b.products) > overview.AvgFeedbacks {
			vuln = "high_price_low_rating"
			rec = "Бренд " + brand + " — высокая цена при низком рейтинге, возможность предложить лучшее соотношение"
		}

		if vuln != "" {
			spots = append(spots, weakSpot{
				Brand:          brand,
				ProductCount:   b.products,
				AvgRating:      math.Round(avgRating*100) / 100,
				AvgFeedbacks:   math.Round(avgFeedbacks*100) / 100,
				Vulnerability:  vuln,
				Recommendation: rec,
			})
		}
	}

	sort.Slice(spots, func(i, j int) bool {
		return spots[i].AvgRating < spots[j].AvgRating
	})

	if len(spots) > 10 {
		spots = spots[:10]
	}
	return spots
}

func findOpportunities(overview reviewMarketOverview, products []ratedProduct) []reviewOpportunity {
	var opps []reviewOpportunity

	lowRatedPct := float64(overview.LowRated) / float64(overview.TotalProducts) * 100
	if lowRatedPct > 20 {
		opps = append(opps, reviewOpportunity{
			Description: "Более 20% товаров в нише имеют рейтинг ниже 4.0 — высокая возможность выделиться качеством",
			Impact:      "high",
			Metric:      "low_rated_pct",
			Value:       math.Round(lowRatedPct*10) / 10,
		})
	}

	noReviewPct := float64(overview.NoReviews) / float64(overview.TotalProducts) * 100
	if noReviewPct > 30 {
		opps = append(opps, reviewOpportunity{
			Description: "Более 30% товаров без отзывов — наличие отзывов даст конкурентное преимущество",
			Impact:      "high",
			Metric:      "no_reviews_pct",
			Value:       math.Round(noReviewPct*10) / 10,
		})
	}

	if overview.AvgRating < 4.3 {
		opps = append(opps, reviewOpportunity{
			Description: "Средний рейтинг ниши ниже 4.3 — товар с рейтингом 4.7+ будет выделяться",
			Impact:      "medium",
			Metric:      "avg_rating",
			Value:       overview.AvgRating,
		})
	}

	// Check if top positions have low feedback count.
	var topLowFeedback int
	for _, p := range products {
		if p.Position <= 20 && p.Feedbacks < 50 {
			topLowFeedback++
		}
	}
	if topLowFeedback > 5 {
		opps = append(opps, reviewOpportunity{
			Description: "Более 5 товаров в топ-20 имеют менее 50 отзывов — набрав отзывы, можно обогнать",
			Impact:      "medium",
			Metric:      "top20_low_feedback",
			Value:       float64(topLowFeedback),
		})
	}

	return opps
}

func calcPercentile(sorted []float64, value float64) float64 {
	below := 0
	for _, v := range sorted {
		if v < value {
			below++
		}
	}
	return math.Round(float64(below) / float64(len(sorted)) * 10000) / 100
}

// toLower is used for brand matching.
func toLower(s string) string {
	return strings.ToLower(s)
}
