package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

// --- Smart Fashion Alerts ---

type smartAlertRequest struct {
	SizeIssues        []sizeIssueInput        `json:"size_issues,omitempty"`
	SeasonAlerts      []seasonAlertInput       `json:"season_alerts,omitempty"`
	CompetitorChanges []competitorChangeInput  `json:"competitor_changes,omitempty"`
	TrendAlerts       []trendAlertInput        `json:"trend_alerts,omitempty"`
	ReturnAlerts      []returnAlertInput       `json:"return_alerts,omitempty"`
	PositionAlerts    []positionAlertInput     `json:"position_alerts,omitempty"`
	StockBySizeAlerts []stockBySizeInput       `json:"stock_by_size,omitempty"`
}

type sizeIssueInput struct {
	NmID        int64   `json:"nm_id"`
	Name        string  `json:"name"`
	Size        string  `json:"size"`
	ReturnRate  float64 `json:"return_rate_pct"`
	DaysOfStock float64 `json:"days_of_stock"`
	Issue       string  `json:"issue"`
}

type seasonAlertInput struct {
	Season   string `json:"season"`
	StartsIn int    `json:"starts_in_days"`
	Message  string `json:"message"`
}

type competitorChangeInput struct {
	NmID        int64   `json:"nm_id"`
	Brand       string  `json:"brand"`
	Keyword     string  `json:"keyword"`
	OldPos      int     `json:"old_position"`
	NewPos      int     `json:"new_position"`
	PriceChange float64 `json:"price_change_pct,omitempty"`
	ChangeType  string  `json:"change_type"`
}

type trendAlertInput struct {
	Attribute string  `json:"attribute"`
	Dimension string  `json:"dimension"`
	GrowthPct float64 `json:"growth_pct"`
	Direction string  `json:"direction"`
}

type returnAlertInput struct {
	NmID           int64   `json:"nm_id"`
	Name           string  `json:"name"`
	ReturnRate     float64 `json:"return_rate_pct"`
	HasSizingIssue bool    `json:"has_sizing_issue"`
}

type positionAlertInput struct {
	NmID    int64    `json:"nm_id"`
	Keyword string   `json:"keyword"`
	OldPos  int      `json:"old_position"`
	NewPos  int      `json:"new_position"`
	Regions []string `json:"affected_regions,omitempty"`
}

type stockBySizeInput struct {
	NmID        int64   `json:"nm_id"`
	Name        string  `json:"name"`
	Size        string  `json:"size"`
	DaysOfStock float64 `json:"days_of_stock"`
	AvgDaily    float64 `json:"avg_daily_sales"`
}

func handleSmartAlerts(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req smartAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var generated []alert

	for _, si := range req.SizeIssues {
		switch si.Issue {
		case "high_return":
			generated = append(generated, createAlertObj(userID, "size_return", "warning",
				fmt.Sprintf("Высокий возврат: %s размер %s", si.Name, si.Size),
				fmt.Sprintf("Размер %s товара %s имеет возврат %.0f%% — проверьте размерную сетку.", si.Size, si.Name, si.ReturnRate),
			))
		case "low_stock":
			generated = append(generated, createAlertObj(userID, "size_stock", "critical",
				fmt.Sprintf("Размер %s заканчивается: %s", si.Size, si.Name),
				fmt.Sprintf("Размер %s товара %s — осталось на %.0f дней. Срочно пополните!", si.Size, si.Name, si.DaysOfStock),
			))
		case "no_sales":
			generated = append(generated, createAlertObj(userID, "size_no_sales", "info",
				fmt.Sprintf("Нет продаж: %s размер %s", si.Name, si.Size),
				fmt.Sprintf("Размер %s товара %s не продаётся — проверьте цену или уберите из ассортимента.", si.Size, si.Name),
			))
		}
	}

	for _, sa := range req.SeasonAlerts {
		severity := "info"
		if sa.StartsIn <= 14 {
			severity = "warning"
		}
		if sa.StartsIn <= 0 {
			severity = "critical"
		}
		generated = append(generated, createAlertObj(userID, "season", severity,
			"Сезон: "+sa.Season, sa.Message,
		))
	}

	for _, cc := range req.CompetitorChanges {
		switch cc.ChangeType {
		case "overtook_you":
			generated = append(generated, createAlertObj(userID, "competitor_overtook", "warning",
				fmt.Sprintf("Конкурент обогнал: %s", cc.Keyword),
				fmt.Sprintf("Бренд %s обогнал вас по «%s» (было %d → стало %d).", cc.Brand, cc.Keyword, cc.OldPos, cc.NewPos),
			))
		case "new_entrant":
			generated = append(generated, createAlertObj(userID, "competitor_new", "info",
				fmt.Sprintf("Новый конкурент: %s по «%s»", cc.Brand, cc.Keyword),
				fmt.Sprintf("Бренд %s появился в топе по «%s» на позиции %d.", cc.Brand, cc.Keyword, cc.NewPos),
			))
		case "price_cut":
			generated = append(generated, createAlertObj(userID, "competitor_price", "warning",
				fmt.Sprintf("Конкурент снизил цену: %s", cc.Brand),
				fmt.Sprintf("Бренд %s снизил цену на %.0f%% по «%s» — рассмотрите корректировку.", cc.Brand, -cc.PriceChange, cc.Keyword),
			))
		}
	}

	for _, ta := range req.TrendAlerts {
		if ta.Direction == "rising" && ta.GrowthPct > 50 {
			generated = append(generated, createAlertObj(userID, "trend_rising", "info",
				fmt.Sprintf("Тренд: %s +%.0f%%", ta.Attribute, ta.GrowthPct),
				fmt.Sprintf("Запросы на «%s» (%s) выросли на %.0f%% за неделю — рассмотрите расширение ассортимента.", ta.Attribute, ta.Dimension, ta.GrowthPct),
			))
		} else if ta.Direction == "declining" && ta.GrowthPct < -30 {
			generated = append(generated, createAlertObj(userID, "trend_declining", "info",
				fmt.Sprintf("Тренд падает: %s %.0f%%", ta.Attribute, ta.GrowthPct),
				fmt.Sprintf("Спрос на «%s» (%s) снизился на %.0f%% — будьте осторожны с закупками.", ta.Attribute, ta.Dimension, -ta.GrowthPct),
			))
		}
	}

	for _, ra := range req.ReturnAlerts {
		if ra.ReturnRate > 30 {
			msg := fmt.Sprintf("Высокий %% возвратов (%.0f%%) у %s.", ra.ReturnRate, ra.Name)
			if ra.HasSizingIssue {
				msg += " Обнаружена проблема с размерами — проверьте размерную сетку."
			} else {
				msg += " Проверьте соответствие фото/описания реальному товару."
			}
			generated = append(generated, createAlertObj(userID, "return_high", "warning",
				fmt.Sprintf("Высокий возврат: %s (%.0f%%)", ra.Name, ra.ReturnRate),
				msg,
			))
		}
	}

	for _, pa := range req.PositionAlerts {
		drop := pa.NewPos - pa.OldPos
		if drop > 10 {
			severity := "warning"
			if drop > 30 {
				severity = "critical"
			}
			msg := fmt.Sprintf("Позиция по «%s» упала с %d на %d (−%d).", pa.Keyword, pa.OldPos, pa.NewPos, drop)
			if len(pa.Regions) > 0 {
				msg += fmt.Sprintf(" Затронутые регионы: %v.", pa.Regions)
			}
			generated = append(generated, createAlertObj(userID, "position_drop", severity,
				fmt.Sprintf("Позиция упала: «%s» (−%d)", pa.Keyword, drop),
				msg,
			))
		} else if drop < -10 {
			rise := -drop
			generated = append(generated, createAlertObj(userID, "position_rise", "info",
				fmt.Sprintf("Позиция выросла: «%s» (+%d)", pa.Keyword, rise),
				fmt.Sprintf("Позиция по «%s» выросла с %d на %d (+%d)!", pa.Keyword, pa.OldPos, pa.NewPos, rise),
			))
		}
	}

	for _, ss := range req.StockBySizeAlerts {
		if ss.DaysOfStock < 3 && ss.AvgDaily > 0 {
			generated = append(generated, createAlertObj(userID, "size_stock", "critical",
				fmt.Sprintf("Размер %s кончится через %.0f дня: %s", ss.Size, ss.DaysOfStock, ss.Name),
				fmt.Sprintf("Размер %s товара %s продаётся %.1f шт/день, осталось на %.0f дней!", ss.Size, ss.Name, ss.AvgDaily, ss.DaysOfStock),
			))
		} else if ss.DaysOfStock < 7 && ss.AvgDaily > 0 {
			generated = append(generated, createAlertObj(userID, "size_stock", "warning",
				fmt.Sprintf("Размер %s заканчивается: %s", ss.Size, ss.Name),
				fmt.Sprintf("Размер %s товара %s — осталось на %.0f дней (%.1f шт/день).", ss.Size, ss.Name, ss.DaysOfStock, ss.AvgDaily),
			))
		}
	}

	// Deduplicate: don't create alerts that match recent ones (same type+title within 4 hours)
	generated = deduplicateAlerts(r.Context(), userID, generated)

	// Persist
	generated = persistAlerts(r.Context(), generated)

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"generated": len(generated),
		"alerts":    generated,
	})
}

func deduplicateAlerts(ctx context.Context, userID int64, candidates []alert) []alert {
	cooldown := 4 * time.Hour
	cutoff := time.Now().Add(-cooldown)

	existing := getRecentAlerts(ctx, userID, cutoff)

	recentSigs := map[string]bool{}
	for _, a := range existing {
		sig := a.Type + "|" + a.Title
		recentSigs[sig] = true
	}

	var filtered []alert
	for _, c := range candidates {
		sig := c.Type + "|" + c.Title
		if !recentSigs[sig] {
			filtered = append(filtered, c)
			recentSigs[sig] = true
		}
	}
	return filtered
}
