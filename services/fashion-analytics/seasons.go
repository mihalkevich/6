package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/dataclient"
	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

// --- Fashion season calendar ---

type seasonPeriod struct {
	Name       string `json:"name"`
	StartMonth int    `json:"start_month"`
	EndMonth   int    `json:"end_month"`
	PrepMonth  int    `json:"prep_month"` // when to start preparing
}

var fashionSeasons = []seasonPeriod{
	{Name: "Весенняя коллекция", StartMonth: 3, EndMonth: 5, PrepMonth: 1},
	{Name: "Летняя коллекция", StartMonth: 6, EndMonth: 8, PrepMonth: 4},
	{Name: "Осенняя коллекция", StartMonth: 9, EndMonth: 11, PrepMonth: 7},
	{Name: "Зимняя коллекция", StartMonth: 12, EndMonth: 2, PrepMonth: 10},
}

var seasonKeywords = map[string]string{
	"летний": "Летняя коллекция", "летнее": "Летняя коллекция", "летняя": "Летняя коллекция",
	"зимний": "Зимняя коллекция", "зимнее": "Зимняя коллекция", "зимняя": "Зимняя коллекция",
	"весенний": "Весенняя коллекция", "весеннее": "Весенняя коллекция", "весенняя": "Весенняя коллекция",
	"осенний": "Осенняя коллекция", "осеннее": "Осенняя коллекция", "осенняя": "Осенняя коллекция",
	"демисезонный": "Весенняя коллекция", "демисезонное": "Весенняя коллекция",
	"утеплённый": "Зимняя коллекция", "утепленный": "Зимняя коллекция",
	"лёгкий": "Летняя коллекция", "легкий": "Летняя коллекция",
}

// --- Seasonal Analysis ---

type seasonalRequest struct {
	APIKeyID int64          `json:"api_key_id"`
	Sales    []wbapi.WBSale `json:"sales"`
}

type productSeasonality struct {
	NmID            int64   `json:"nm_id"`
	Name            string  `json:"name"`
	DetectedSeason  string  `json:"detected_season"`
	SeasonalCoeff   float64 `json:"seasonal_coefficient"` // >1 = peak season, <1 = off season
	CurrentAvgDaily float64 `json:"current_avg_daily"`
	OverallAvgDaily float64 `json:"overall_avg_daily"`
	SeasonStatus    string  `json:"season_status"` // peak, normal, off_season
}

type seasonAlert struct {
	Season     string `json:"season"`
	StartsIn   int    `json:"starts_in_days"`
	Message    string `json:"message"`
}

func handleSeasonalAnalysis(w http.ResponseWriter, r *http.Request) {
	var req seasonalRequest
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
	day30ago := now.AddDate(0, 0, -30)

	dict := fashion.DefaultDictionary()

	type salesAgg struct {
		name           string
		sales7d        int
		sales30d       int
		detectedSeason string
	}
	products := map[int64]*salesAgg{}

	for _, s := range req.Sales {
		if s.NmId == 0 || (s.SaleID != "" && s.SaleID[0] == 'R') {
			continue
		}
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil {
			continue
		}

		agg, ok := products[s.NmId]
		if !ok {
			agg = &salesAgg{
				name:           s.Subject,
				detectedSeason: detectSeason(s.Subject, dict),
			}
			products[s.NmId] = agg
		}

		if saleDate.After(day30ago) {
			agg.sales30d++
		}
		if saleDate.After(day7ago) {
			agg.sales7d++
		}
	}

	var results []productSeasonality
	for nmID, agg := range products {
		overallAvg := float64(agg.sales30d) / 30.0
		currentAvg := float64(agg.sales7d) / 7.0

		coeff := 1.0
		if overallAvg > 0 {
			coeff = currentAvg / overallAvg
		}

		status := "normal"
		if coeff > 1.3 {
			status = "peak"
		} else if coeff < 0.7 {
			status = "off_season"
		}

		results = append(results, productSeasonality{
			NmID:            nmID,
			Name:            agg.name,
			DetectedSeason:  agg.detectedSeason,
			SeasonalCoeff:   round2(coeff),
			CurrentAvgDaily: round2(currentAvg),
			OverallAvgDaily: round2(overallAvg),
			SeasonStatus:    status,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].SeasonalCoeff > results[j].SeasonalCoeff
	})

	// Generate season alerts.
	alerts := generateSeasonAlerts(now)

	// Calendar.
	calendar := buildSeasonCalendar(now)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"products":       results,
		"total_products": len(results),
		"alerts":         alerts,
		"calendar":       calendar,
		"current_month":  now.Month().String(),
	})
}

// --- Seasonal Forecast ---

type forecastRequest struct {
	APIKeyID     int64          `json:"api_key_id"`
	Sales        []wbapi.WBSale `json:"sales"`
	ForecastDays int            `json:"forecast_days,omitempty"`
}

type productForecast struct {
	NmID              int64   `json:"nm_id"`
	Name              string  `json:"name"`
	CurrentDailyAvg   float64 `json:"current_daily_avg"`
	ForecastDailyAvg  float64 `json:"forecast_daily_avg"`
	ForecastTotalSales int    `json:"forecast_total_sales"`
	SeasonalCoeff     float64 `json:"seasonal_coefficient"`
	WeeklyTrend       float64 `json:"weekly_trend_pct"` // week-over-week growth
	Confidence        string  `json:"confidence"`
}

func handleSeasonalForecast(w http.ResponseWriter, r *http.Request) {
	var req forecastRequest
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

	days := req.ForecastDays
	if days <= 0 || days > 90 {
		days = 30
	}

	now := time.Now()
	day7ago := now.AddDate(0, 0, -7)
	day14ago := now.AddDate(0, 0, -14)
	day30ago := now.AddDate(0, 0, -30)

	type salesAgg struct {
		name     string
		week1    int // last 7 days
		week2    int // 7-14 days ago
		sales30d int
	}
	products := map[int64]*salesAgg{}

	for _, s := range req.Sales {
		if s.NmId == 0 || (s.SaleID != "" && s.SaleID[0] == 'R') {
			continue
		}
		saleDate, err := time.Parse("2006-01-02T15:04:05", s.Date)
		if err != nil || saleDate.Before(day30ago) {
			continue
		}

		agg, ok := products[s.NmId]
		if !ok {
			agg = &salesAgg{name: s.Subject}
			products[s.NmId] = agg
		}
		agg.sales30d++
		if saleDate.After(day7ago) {
			agg.week1++
		} else if saleDate.After(day14ago) {
			agg.week2++
		}
	}

	var forecasts []productForecast
	for nmID, agg := range products {
		overallAvg := float64(agg.sales30d) / 30.0
		currentAvg := float64(agg.week1) / 7.0

		// Week-over-week trend.
		wowGrowth := 0.0
		if agg.week2 > 0 {
			wowGrowth = (float64(agg.week1) - float64(agg.week2)) / float64(agg.week2) * 100
		}

		// Seasonal coefficient.
		seasonCoeff := 1.0
		if overallAvg > 0 {
			seasonCoeff = currentAvg / overallAvg
		}

		// Forecast: current daily avg * seasonal adjustment * slight trend factor.
		trendFactor := 1.0 + (wowGrowth/100)*0.3 // dampen trend influence
		forecastDaily := currentAvg * trendFactor
		if forecastDaily < 0 {
			forecastDaily = 0
		}

		confidence := "medium"
		if agg.sales30d >= 30 {
			confidence = "high"
		} else if agg.sales30d < 10 {
			confidence = "low"
		}

		forecasts = append(forecasts, productForecast{
			NmID:              nmID,
			Name:              agg.name,
			CurrentDailyAvg:   round2(currentAvg),
			ForecastDailyAvg:  round2(forecastDaily),
			ForecastTotalSales: int(math.Round(forecastDaily * float64(days))),
			SeasonalCoeff:     round2(seasonCoeff),
			WeeklyTrend:       round2(wowGrowth),
			Confidence:        confidence,
		})
	}

	sort.Slice(forecasts, func(i, j int) bool {
		return forecasts[i].ForecastTotalSales > forecasts[j].ForecastTotalSales
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"forecast_days": days,
		"products":      forecasts,
		"total":         len(forecasts),
	})
}

// --- Helpers ---

func detectSeason(productName string, dict *fashion.Dictionary) string {
	lower := strings.ToLower(productName)
	tokens := strings.Fields(lower)

	for _, tok := range tokens {
		if season, ok := seasonKeywords[tok]; ok {
			return season
		}
	}

	// Check dictionary seasons.
	for _, s := range dict.Seasons {
		if strings.Contains(lower, strings.ToLower(s)) {
			if mapped, ok := seasonKeywords[strings.ToLower(s)]; ok {
				return mapped
			}
		}
	}

	return "Всесезонный"
}

func generateSeasonAlerts(now time.Time) []seasonAlert {
	var alerts []seasonAlert
	currentMonth := int(now.Month())

	for _, sp := range fashionSeasons {
		// Calculate days until prep month.
		prepMonth := sp.PrepMonth
		monthsUntilPrep := prepMonth - currentMonth
		if monthsUntilPrep < 0 {
			monthsUntilPrep += 12
		}
		if monthsUntilPrep == 0 {
			alerts = append(alerts, seasonAlert{
				Season:   sp.Name,
				StartsIn: 0,
				Message:  sp.Name + " — пора готовить остатки и коллекцию!",
			})
		} else if monthsUntilPrep <= 2 {
			daysUntil := monthsUntilPrep * 30
			alerts = append(alerts, seasonAlert{
				Season:   sp.Name,
				StartsIn: daysUntil,
				Message:  fmt.Sprintf("%s — подготовка через ~%d дней", sp.Name, daysUntil),
			})
		}

		// Check if currently in season.
		if isInSeason(currentMonth, sp.StartMonth, sp.EndMonth) {
			alerts = append(alerts, seasonAlert{
				Season:   sp.Name,
				StartsIn: -1,
				Message:  sp.Name + " — сейчас в разгаре! Следите за остатками.",
			})
		}
	}

	return alerts
}

func isInSeason(current, start, end int) bool {
	if start <= end {
		return current >= start && current <= end
	}
	// Wraps around year (e.g., Dec-Feb).
	return current >= start || current <= end
}

type calendarEntry struct {
	Month   int    `json:"month"`
	Name    string `json:"month_name"`
	Seasons []string `json:"active_seasons"`
	IsPrep  []string `json:"preparation_for,omitempty"`
}

var monthNames = []string{
	"", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
}

func buildSeasonCalendar(now time.Time) []calendarEntry {
	calendar := make([]calendarEntry, 12)
	for m := 1; m <= 12; m++ {
		entry := calendarEntry{
			Month: m,
			Name:  monthNames[m],
		}
		for _, sp := range fashionSeasons {
			if isInSeason(m, sp.StartMonth, sp.EndMonth) {
				entry.Seasons = append(entry.Seasons, sp.Name)
			}
			if m == sp.PrepMonth {
				entry.IsPrep = append(entry.IsPrep, sp.Name)
			}
		}
		calendar[m-1] = entry
	}
	return calendar
}
