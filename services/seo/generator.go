package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
)

// --- Content Generator for Product Cards ---

type generateTitleRequest struct {
	Category string   `json:"category"`
	Brand    string   `json:"brand,omitempty"`
	Material string   `json:"material,omitempty"`
	Color    string   `json:"color,omitempty"`
	Style    string   `json:"style,omitempty"`
	Season   string   `json:"season,omitempty"`
	Gender   string   `json:"gender,omitempty"`
	Length   string   `json:"length,omitempty"` // макси, миди, мини
	Fit      string   `json:"fit,omitempty"`    // оверсайз, приталенный
	Keywords []string `json:"keywords,omitempty"` // additional keywords to try to include
}

type titleSuggestion struct {
	Title    string `json:"title"`
	Pattern  string `json:"pattern"`
	CharLen  int    `json:"char_length"`
	Score    int    `json:"estimated_score"` // rough SEO score estimate
}

type generateDescRequest struct {
	Category    string   `json:"category"`
	Brand       string   `json:"brand,omitempty"`
	Materials   []string `json:"materials,omitempty"`
	Colors      []string `json:"colors,omitempty"`
	Style       string   `json:"style,omitempty"`
	Season      string   `json:"season,omitempty"`
	Gender      string   `json:"gender,omitempty"`
	Occasion    string   `json:"occasion,omitempty"`
	Features    []string `json:"features,omitempty"` // e.g. "карманы", "молния", "подкладка"
	Keywords    []string `json:"keywords,omitempty"`
}

type descSuggestion struct {
	Description string `json:"description"`
	Template    string `json:"template"` // which template was used
	CharLen     int    `json:"char_length"`
	WordCount   int    `json:"word_count"`
}

type photoRecommendation struct {
	Type        string `json:"type"`        // front, side, detail, model, flatlay, sizechart
	Description string `json:"description"`
	Priority    string `json:"priority"`    // must, recommended, optional
}

// Title patterns for different clothing categories.
var titlePatterns = []struct {
	name    string
	build   func(r generateTitleRequest) string
}{
	{"Полный", func(r generateTitleRequest) string {
		parts := []string{}
		if r.Brand != "" {
			parts = append(parts, r.Brand)
		}
		parts = append(parts, capitalize(r.Category))
		if r.Gender != "" {
			parts = append(parts, r.Gender)
		}
		if r.Material != "" {
			parts = append(parts, r.Material)
		}
		if r.Color != "" {
			parts = append(parts, r.Color)
		}
		if r.Style != "" {
			parts = append(parts, r.Style)
		}
		if r.Season != "" {
			parts = append(parts, r.Season)
		}
		if r.Fit != "" {
			parts = append(parts, r.Fit)
		}
		if r.Length != "" {
			parts = append(parts, r.Length)
		}
		return strings.Join(parts, " ")
	}},
	{"Категория + атрибуты", func(r generateTitleRequest) string {
		parts := []string{capitalize(r.Category)}
		if r.Gender != "" {
			parts = append(parts, r.Gender)
		}
		if r.Season != "" {
			parts = append(parts, r.Season)
		}
		if r.Material != "" {
			parts = append(parts, r.Material)
		}
		if r.Color != "" {
			parts = append(parts, r.Color)
		}
		if r.Fit != "" {
			parts = append(parts, r.Fit)
		}
		return strings.Join(parts, " ")
	}},
	{"SEO-оптимизированный", func(r generateTitleRequest) string {
		// Category first (most important for search), then high-value attributes.
		parts := []string{capitalize(r.Category)}
		if r.Material != "" {
			parts = append(parts, r.Material)
		}
		if r.Season != "" {
			parts = append(parts, r.Season)
		}
		if r.Color != "" {
			parts = append(parts, r.Color)
		}
		if r.Gender != "" {
			parts = append(parts, r.Gender)
		}
		if r.Length != "" {
			parts = append(parts, r.Length)
		}
		if r.Brand != "" {
			parts = append(parts, r.Brand)
		}
		return strings.Join(parts, " ")
	}},
	{"С акцентом на стиль", func(r generateTitleRequest) string {
		parts := []string{}
		if r.Style != "" {
			parts = append(parts, capitalize(r.Style))
		}
		parts = append(parts, r.Category)
		if r.Material != "" {
			parts = append(parts, r.Material)
		}
		if r.Color != "" {
			parts = append(parts, r.Color)
		}
		if r.Season != "" {
			parts = append(parts, r.Season)
		}
		return strings.Join(parts, " ")
	}},
}

func handleGenerateTitle(w http.ResponseWriter, r *http.Request) {
	var req generateTitleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Category == "" {
		httpError(w, "category required", http.StatusBadRequest)
		return
	}

	req.Category = strings.ToLower(req.Category)

	var suggestions []titleSuggestion
	seen := map[string]bool{}

	for _, pat := range titlePatterns {
		title := pat.build(req)
		title = strings.TrimSpace(title)
		if title == "" || seen[title] {
			continue
		}
		seen[title] = true

		charLen := len([]rune(title))
		score := estimateTitleScore(title, req)

		suggestions = append(suggestions, titleSuggestion{
			Title:   title,
			Pattern: pat.name,
			CharLen: charLen,
			Score:   score,
		})
	}

	// Also generate keyword-injected variant if keywords provided.
	if len(req.Keywords) > 0 {
		base := capitalize(req.Category)
		var extras []string
		for _, kw := range req.Keywords {
			kwLower := strings.ToLower(kw)
			if !strings.Contains(strings.ToLower(base), kwLower) {
				extras = append(extras, kw)
			}
			if len(extras) >= 3 {
				break
			}
		}
		if len(extras) > 0 {
			title := base + " " + strings.Join(extras, " ")
			if !seen[title] {
				charLen := len([]rune(title))
				suggestions = append(suggestions, titleSuggestion{
					Title:   title,
					Pattern: "С ключевыми словами",
					CharLen: charLen,
					Score:   estimateTitleScore(title, req),
				})
			}
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"suggestions": suggestions,
		"total":       len(suggestions),
	})
}

func estimateTitleScore(title string, req generateTitleRequest) int {
	score := 50 // base

	charLen := len([]rune(title))
	wordCount := len(strings.Fields(title))

	// Length bonus.
	if charLen >= 40 && charLen <= 70 {
		score += 20
	} else if charLen >= 30 && charLen <= 80 {
		score += 10
	}

	// Word count.
	if wordCount >= 3 && wordCount <= 8 {
		score += 10
	}

	// Attribute bonuses.
	lower := strings.ToLower(title)
	if req.Material != "" && strings.Contains(lower, strings.ToLower(req.Material)) {
		score += 5
	}
	if req.Color != "" && strings.Contains(lower, strings.ToLower(req.Color)) {
		score += 5
	}
	if req.Season != "" && strings.Contains(lower, strings.ToLower(req.Season)) {
		score += 5
	}
	if req.Gender != "" && strings.Contains(lower, strings.ToLower(req.Gender)) {
		score += 5
	}

	if score > 100 {
		score = 100
	}
	return score
}

// --- Description Generator ---

func handleGenerateDescription(w http.ResponseWriter, r *http.Request) {
	var req generateDescRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Category == "" {
		httpError(w, "category required", http.StatusBadRequest)
		return
	}

	var suggestions []descSuggestion

	// Template 1: Structured with benefits.
	desc1 := buildStructuredDesc(req)
	suggestions = append(suggestions, descSuggestion{
		Description: desc1,
		Template:    "Структурированное",
		CharLen:     len([]rune(desc1)),
		WordCount:   len(strings.Fields(desc1)),
	})

	// Template 2: Short marketing.
	desc2 := buildMarketingDesc(req)
	suggestions = append(suggestions, descSuggestion{
		Description: desc2,
		Template:    "Маркетинговое",
		CharLen:     len([]rune(desc2)),
		WordCount:   len(strings.Fields(desc2)),
	})

	// Template 3: SEO-optimized with keywords.
	if len(req.Keywords) > 0 {
		desc3 := buildSEODesc(req)
		suggestions = append(suggestions, descSuggestion{
			Description: desc3,
			Template:    "SEO-оптимизированное",
			CharLen:     len([]rune(desc3)),
			WordCount:   len(strings.Fields(desc3)),
		})
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"suggestions": suggestions,
		"total":       len(suggestions),
	})
}

func buildStructuredDesc(req generateDescRequest) string {
	var sb strings.Builder

	cat := capitalize(req.Category)

	// Intro.
	sb.WriteString(cat)
	if req.Style != "" {
		sb.WriteString(" в " + req.Style + " стиле")
	}
	if req.Season != "" {
		sb.WriteString(", " + req.Season)
	}
	sb.WriteString(" — идеальный выбор")
	if req.Occasion != "" {
		sb.WriteString(" " + fashion.OccasionPrepositions[req.Occasion])
	}
	sb.WriteString(".\n\n")

	// Materials.
	if len(req.Materials) > 0 {
		sb.WriteString("Материал: " + strings.Join(req.Materials, ", ") + ". ")
		sb.WriteString("Приятная к телу ткань обеспечивает комфорт в течение всего дня.\n\n")
	}

	// Features.
	if len(req.Features) > 0 {
		sb.WriteString("Особенности: " + strings.Join(req.Features, ", ") + ".\n\n")
	}

	// Colors.
	if len(req.Colors) > 0 {
		sb.WriteString("Доступные цвета: " + strings.Join(req.Colors, ", ") + ".\n\n")
	}

	// Gender.
	if req.Gender != "" {
		sb.WriteString("Подходит для: " + req.Gender + " гардероба.\n\n")
	}

	// Care.
	sb.WriteString("Рекомендации по уходу: деликатная стирка при 30°C, не отбеливать.")

	return sb.String()
}

func buildMarketingDesc(req generateDescRequest) string {
	var sb strings.Builder

	cat := capitalize(req.Category)

	sb.WriteString("Стильное " + strings.ToLower(cat))
	if req.Brand != "" {
		sb.WriteString(" от " + req.Brand)
	}
	sb.WriteString(", которое подчеркнёт вашу индивидуальность! ")

	if len(req.Materials) > 0 {
		sb.WriteString("Выполнено из " + strings.Join(req.Materials, " и ") + " — ")
		sb.WriteString("мягкая и приятная к телу ткань. ")
	}

	if req.Season != "" {
		sb.WriteString("Идеально для " + req.Season + " сезона. ")
	}

	if req.Occasion != "" {
		sb.WriteString("Подойдёт " + fashion.OccasionPrepositions[req.Occasion] + ". ")
	}

	if len(req.Features) > 0 {
		sb.WriteString("Достоинства: " + strings.Join(req.Features, ", ") + ". ")
	}

	sb.WriteString("Закажите сейчас и получите комплимент!")

	return sb.String()
}

func buildSEODesc(req generateDescRequest) string {
	var sb strings.Builder

	cat := capitalize(req.Category)

	// Use keywords naturally.
	usedKw := 0
	sb.WriteString(cat)
	if len(req.Keywords) > usedKw {
		sb.WriteString(" " + req.Keywords[usedKw])
		usedKw++
	}
	sb.WriteString(" — купить с доставкой по России. ")

	if len(req.Materials) > 0 {
		sb.WriteString(capitalize(cat) + " из " + strings.Join(req.Materials, ", "))
		if len(req.Keywords) > usedKw {
			sb.WriteString(", " + req.Keywords[usedKw])
			usedKw++
		}
		sb.WriteString(". ")
	}

	if req.Season != "" {
		sb.WriteString(capitalize(req.Season) + " коллекция. ")
	}

	if req.Style != "" {
		sb.WriteString(capitalize(req.Style) + " стиль. ")
	}

	// Inject remaining keywords.
	for usedKw < len(req.Keywords) && usedKw < 5 {
		sb.WriteString(capitalize(req.Keywords[usedKw]) + ". ")
		usedKw++
	}

	sb.WriteString("Быстрая доставка, гарантия качества, удобный возврат.")

	return sb.String()
}

// --- Photo Recommendations ---

func handlePhotoRecommendations(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Category   string `json:"category"`
		PhotoCount int    `json:"current_photo_count,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	recs := []photoRecommendation{
		{Type: "front", Description: "Фронтальное фото на модели или манекене — главное фото карточки", Priority: "must"},
		{Type: "back", Description: "Фото со спины — покажите крой и посадку сзади", Priority: "must"},
		{Type: "side", Description: "Фото сбоку — покажите силуэт", Priority: "recommended"},
		{Type: "detail", Description: "Детали: застёжки, пуговицы, молния, карманы, подкладка", Priority: "recommended"},
		{Type: "flatlay", Description: "Раскладка (flatlay) — товар на белом фоне, вид сверху", Priority: "recommended"},
		{Type: "size_chart", Description: "Размерная сетка с замерами в сантиметрах", Priority: "must"},
		{Type: "lifestyle", Description: "Лайфстайл фото — модель в реальной обстановке", Priority: "optional"},
		{Type: "texture", Description: "Фото текстуры ткани крупным планом", Priority: "optional"},
	}

	// Category-specific recommendations.
	catLower := strings.ToLower(req.Category)
	switch {
	case strings.Contains(catLower, "платье") || strings.Contains(catLower, "сарафан"):
		recs = append(recs, photoRecommendation{
			Type: "movement", Description: "Фото в движении — покажите, как платье развевается", Priority: "recommended",
		})
	case strings.Contains(catLower, "куртк") || strings.Contains(catLower, "пальто"):
		recs = append(recs, photoRecommendation{
			Type: "open_closed", Description: "Фото в застёгнутом и расстёгнутом виде", Priority: "recommended",
		})
	}

	needed := 0
	if req.PhotoCount < 5 {
		needed = 5 - req.PhotoCount
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"recommendations":   recs,
		"total":             len(recs),
		"current_photos":    req.PhotoCount,
		"minimum_recommended": 5,
		"photos_needed":     needed,
	})
}

func capitalize(s string) string {
	if s == "" {
		return ""
	}
	runes := []rune(s)
	runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
	return string(runes)
}
