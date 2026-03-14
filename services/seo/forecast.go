package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"
)

// --- Advanced trend analysis and position forecasting ---

type forecastRequest struct {
	NmID int64 `json:"nm_id"`
}

type keywordForecast struct {
	Keyword         string  `json:"keyword"`
	CurrentPos      int     `json:"current_position"`
	PredictedPos    int     `json:"predicted_position"`     // 7-day forecast
	Trend           string  `json:"trend"`                  // improving, declining, stable, volatile, new
	Velocity        float64 `json:"velocity"`               // positions per day (negative = improving)
	Confidence      string  `json:"confidence"`             // high, medium, low
	DataPoints      int     `json:"data_points"`
	BestPos         int     `json:"best_position"`
	WorstPos        int     `json:"worst_position"`
	AvgPos          float64 `json:"avg_position"`
	StdDev          float64 `json:"std_dev"`
	DaysTracked     int     `json:"days_tracked"`
}

type forecastResponse struct {
	NmID      int64             `json:"nm_id"`
	Forecasts []keywordForecast `json:"forecasts"`
	Summary   forecastSummary   `json:"summary"`
}

type forecastSummary struct {
	TotalKeywords int `json:"total_keywords"`
	Improving     int `json:"improving"`
	Declining     int `json:"declining"`
	Stable        int `json:"stable"`
	Volatile      int `json:"volatile"`
}

func handleForecast(w http.ResponseWriter, r *http.Request) {
	var req forecastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.NmID == 0 {
		httpError(w, "nm_id required", http.StatusBadRequest)
		return
	}

	mu.RLock()
	kwMap := positionHistory[req.NmID]
	mu.RUnlock()

	if kwMap == nil {
		jsonResponse(w, http.StatusOK, forecastResponse{NmID: req.NmID})
		return
	}

	var forecasts []keywordForecast
	var summary forecastSummary

	for kw, records := range kwMap {
		if len(records) == 0 {
			continue
		}
		fc := analyzeKeywordTrend(kw, records)
		forecasts = append(forecasts, fc)

		switch fc.Trend {
		case "improving":
			summary.Improving++
		case "declining":
			summary.Declining++
		case "stable":
			summary.Stable++
		case "volatile":
			summary.Volatile++
		}
	}

	summary.TotalKeywords = len(forecasts)

	sort.Slice(forecasts, func(i, j int) bool {
		return forecasts[i].Velocity < forecasts[j].Velocity
	})

	jsonResponse(w, http.StatusOK, forecastResponse{
		NmID:      req.NmID,
		Forecasts: forecasts,
		Summary:   summary,
	})
}

func analyzeKeywordTrend(keyword string, records []positionRecord) keywordForecast {
	fc := keywordForecast{
		Keyword:    keyword,
		DataPoints: len(records),
	}

	if len(records) == 0 {
		fc.Trend = "new"
		fc.Confidence = "low"
		return fc
	}

	// Basic stats.
	positions := make([]float64, len(records))
	best, worst := records[0].Position, records[0].Position
	var sum float64

	for i, r := range records {
		positions[i] = float64(r.Position)
		sum += positions[i]
		if r.Position < best {
			best = r.Position
		}
		if r.Position > worst {
			worst = r.Position
		}
	}

	fc.CurrentPos = records[len(records)-1].Position
	fc.BestPos = best
	fc.WorstPos = worst
	fc.AvgPos = sum / float64(len(records))

	// Standard deviation.
	var variance float64
	for _, p := range positions {
		diff := p - fc.AvgPos
		variance += diff * diff
	}
	if len(positions) > 1 {
		fc.StdDev = math.Sqrt(variance / float64(len(positions)-1))
	}

	// Days tracked.
	first := records[0].CheckedAt
	last := records[len(records)-1].CheckedAt
	fc.DaysTracked = int(last.Sub(first).Hours()/24) + 1

	// Velocity: linear regression of position over time.
	if len(records) >= 2 {
		fc.Velocity = calculateVelocity(records)
	}

	// Trend classification.
	fc.Trend = classifyTrend(fc.Velocity, fc.StdDev, len(records))

	// Confidence level.
	fc.Confidence = assessConfidence(len(records), fc.DaysTracked, fc.StdDev)

	// 7-day forecast via linear extrapolation.
	if len(records) >= 2 {
		predicted := float64(fc.CurrentPos) + fc.Velocity*7
		if predicted < 1 {
			predicted = 1
		}
		fc.PredictedPos = int(math.Round(predicted))
	} else {
		fc.PredictedPos = fc.CurrentPos
	}

	return fc
}

// calculateVelocity uses linear regression (least squares) to compute
// position change per day. Negative = improving (position number decreasing).
func calculateVelocity(records []positionRecord) float64 {
	if len(records) < 2 {
		return 0
	}

	// Use time since first record as X (in days), position as Y.
	t0 := records[0].CheckedAt
	n := float64(len(records))

	var sumX, sumY, sumXY, sumX2 float64
	for _, r := range records {
		x := r.CheckedAt.Sub(t0).Hours() / 24 // days since first check
		y := float64(r.Position)
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	denom := n*sumX2 - sumX*sumX
	if denom == 0 {
		return 0
	}

	// Slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
	slope := (n*sumXY - sumX*sumY) / denom
	return slope
}

func classifyTrend(velocity, stdDev float64, dataPoints int) string {
	if dataPoints < 2 {
		return "new"
	}

	// High std dev relative to velocity = volatile.
	if stdDev > 15 && math.Abs(velocity) < stdDev*0.3 {
		return "volatile"
	}

	switch {
	case velocity < -0.5:
		return "improving"
	case velocity > 0.5:
		return "declining"
	default:
		return "stable"
	}
}

func assessConfidence(dataPoints, daysTracked int, stdDev float64) string {
	score := 0

	// More data points = higher confidence.
	switch {
	case dataPoints >= 14:
		score += 3
	case dataPoints >= 7:
		score += 2
	case dataPoints >= 3:
		score += 1
	}

	// More days = higher confidence.
	switch {
	case daysTracked >= 14:
		score += 3
	case daysTracked >= 7:
		score += 2
	case daysTracked >= 3:
		score += 1
	}

	// Lower std dev = higher confidence.
	switch {
	case stdDev < 5:
		score += 2
	case stdDev < 15:
		score += 1
	}

	switch {
	case score >= 6:
		return "high"
	case score >= 3:
		return "medium"
	default:
		return "low"
	}
}

// --- Enhanced history with date filtering ---

type enhancedHistoryRequest struct {
	NmID     int64  `json:"nm_id"`
	DateFrom string `json:"date_from,omitempty"` // YYYY-MM-DD
	DateTo   string `json:"date_to,omitempty"`   // YYYY-MM-DD
	Keyword  string `json:"keyword,omitempty"`   // filter single keyword
}

type enhancedHistoryEntry struct {
	Keyword    string           `json:"keyword"`
	Records    []positionRecord `json:"records"`
	Trend      string           `json:"trend"`
	Velocity   float64          `json:"velocity"`
	BestPos    int              `json:"best_position"`
	WorstPos   int              `json:"worst_position"`
	DataPoints int              `json:"data_points"`
}

func handleEnhancedHistory(w http.ResponseWriter, r *http.Request) {
	var req enhancedHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.NmID == 0 {
		httpError(w, "nm_id required", http.StatusBadRequest)
		return
	}

	// Parse date filters.
	var dateFrom, dateTo time.Time
	var hasFrom, hasTo bool
	if req.DateFrom != "" {
		t, err := time.Parse("2006-01-02", req.DateFrom)
		if err == nil {
			dateFrom = t
			hasFrom = true
		}
	}
	if req.DateTo != "" {
		t, err := time.Parse("2006-01-02", req.DateTo)
		if err == nil {
			dateTo = t.Add(24*time.Hour - time.Nanosecond) // end of day
			hasTo = true
		}
	}

	mu.RLock()
	kwMap := positionHistory[req.NmID]
	mu.RUnlock()

	var entries []enhancedHistoryEntry
	for kw, records := range kwMap {
		if req.Keyword != "" && kw != req.Keyword {
			continue
		}

		// Apply date filter.
		var filtered []positionRecord
		for _, rec := range records {
			if hasFrom && rec.CheckedAt.Before(dateFrom) {
				continue
			}
			if hasTo && rec.CheckedAt.After(dateTo) {
				continue
			}
			filtered = append(filtered, rec)
		}

		if len(filtered) == 0 {
			continue
		}

		entry := enhancedHistoryEntry{
			Keyword:    kw,
			Records:    filtered,
			DataPoints: len(filtered),
		}

		// Stats.
		best, worst := filtered[0].Position, filtered[0].Position
		for _, r := range filtered {
			if r.Position < best {
				best = r.Position
			}
			if r.Position > worst {
				worst = r.Position
			}
		}
		entry.BestPos = best
		entry.WorstPos = worst

		// Trend and velocity.
		if len(filtered) >= 2 {
			entry.Velocity = calculateVelocity(filtered)
			entry.Trend = classifyTrend(entry.Velocity, 0, len(filtered))
		} else {
			entry.Trend = "new"
		}

		entries = append(entries, entry)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Keyword < entries[j].Keyword
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"nm_id":   req.NmID,
		"entries": entries,
		"total":   len(entries),
	})
}
