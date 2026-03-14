package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/wb-analytics/wb-seller-tools/pkg/fashion"
)

// --- SEO Card Audit ---

type auditRequest struct {
	Title           string            `json:"title"`
	Description     string            `json:"description,omitempty"`
	Characteristics map[string]string `json:"characteristics,omitempty"`
	PhotoCount      int               `json:"photo_count,omitempty"`
	Category        string            `json:"category,omitempty"`
	Brand           string            `json:"brand,omitempty"`
	TargetKeywords  []string          `json:"target_keywords,omitempty"`
}

type auditResponse struct {
	OverallScore float64        `json:"overall_score"` // 0-100
	Grade        string         `json:"grade"`         // A, B, C, D, F
	TitleAudit   titleAudit     `json:"title_audit"`
	DescAudit    descAudit      `json:"description_audit"`
	CharsAudit   charsAudit     `json:"characteristics_audit"`
	PhotoAudit   photoAudit     `json:"photo_audit"`
	KeywordAudit keywordAudit   `json:"keyword_audit"`
	Suggestions  []string       `json:"suggestions"`
}

type titleAudit struct {
	Score      float64  `json:"score"` // 0-100
	Length     int      `json:"length_chars"`
	WordCount  int      `json:"word_count"`
	HasCategory bool   `json:"has_category"`
	HasBrand    bool   `json:"has_brand"`
	HasMaterial bool   `json:"has_material"`
	HasColor    bool   `json:"has_color"`
	Issues     []string `json:"issues,omitempty"`
}

type descAudit struct {
	Score          float64  `json:"score"`
	Length         int      `json:"length_chars"`
	WordCount      int      `json:"word_count"`
	KeywordDensity float64  `json:"keyword_density_pct"`
	Issues         []string `json:"issues,omitempty"`
}

type charsAudit struct {
	Score          float64  `json:"score"`
	Filled         int      `json:"filled_count"`
	Required       int      `json:"required_count"`
	MissingFields  []string `json:"missing_fields,omitempty"`
}

type photoAudit struct {
	Score float64  `json:"score"`
	Count int      `json:"count"`
	Issues []string `json:"issues,omitempty"`
}

type keywordAudit struct {
	Score         float64       `json:"score"`
	InTitle       int           `json:"keywords_in_title"`
	InDescription int           `json:"keywords_in_description"`
	Missing       []string      `json:"missing_keywords,omitempty"`
	Details       []kwPresence  `json:"details,omitempty"`
}

type kwPresence struct {
	Keyword     string `json:"keyword"`
	InTitle     bool   `json:"in_title"`
	InDesc      bool   `json:"in_description"`
}

// Mandatory characteristics for clothing on WB.
var requiredClothingChars = []string{
	"Состав", "Материал", "Цвет", "Размер", "Пол",
	"Страна производства", "Сезон", "Стиль",
}

func handleCardAudit(w http.ResponseWriter, r *http.Request) {
	var req auditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		httpError(w, "title required", http.StatusBadRequest)
		return
	}

	dict := fashion.DefaultDictionary()
	attrs := dict.ParseProduct(req.Title, req.Category, req.Brand)

	resp := auditResponse{}

	// 1. Title audit (30% weight).
	resp.TitleAudit = auditTitle(req.Title, attrs, req.Brand)

	// 2. Description audit (25% weight).
	resp.DescAudit = auditDescription(req.Description, req.TargetKeywords)

	// 3. Characteristics audit (20% weight).
	resp.CharsAudit = auditCharacteristics(req.Characteristics)

	// 4. Photo audit (10% weight).
	resp.PhotoAudit = auditPhotos(req.PhotoCount)

	// 5. Keyword audit (15% weight).
	resp.KeywordAudit = auditKeywords(req.Title, req.Description, req.TargetKeywords)

	// Overall score.
	resp.OverallScore = math.Round(
		resp.TitleAudit.Score*0.30+
			resp.DescAudit.Score*0.25+
			resp.CharsAudit.Score*0.20+
			resp.PhotoAudit.Score*0.10+
			resp.KeywordAudit.Score*0.15,
	)

	resp.Grade = scoreToGrade(resp.OverallScore)

	// Suggestions.
	resp.Suggestions = collectSuggestions(resp)

	jsonResponse(w, http.StatusOK, resp)
}

func auditTitle(title string, attrs fashion.ProductAttrs, brand string) titleAudit {
	a := titleAudit{
		Length:    utf8.RuneCountInString(title),
		WordCount: len(strings.Fields(title)),
	}

	a.HasCategory = attrs.Category != ""
	a.HasBrand = brand != "" && strings.Contains(strings.ToLower(title), strings.ToLower(brand))
	a.HasMaterial = len(attrs.Materials) > 0
	a.HasColor = len(attrs.Colors) > 0

	score := 100.0

	// Length scoring: optimal 40-70 chars.
	if a.Length < 20 {
		score -= 30
		a.Issues = append(a.Issues, "Заголовок слишком короткий (<20 символов)")
	} else if a.Length < 40 {
		score -= 15
		a.Issues = append(a.Issues, "Заголовок короче оптимального (рекомендуется 40-70 символов)")
	} else if a.Length > 100 {
		score -= 20
		a.Issues = append(a.Issues, "Заголовок слишком длинный (>100 символов)")
	} else if a.Length > 70 {
		score -= 5
	}

	// Word count.
	if a.WordCount < 3 {
		score -= 15
		a.Issues = append(a.Issues, "Слишком мало слов в заголовке (минимум 3)")
	}

	// Category presence.
	if !a.HasCategory {
		score -= 15
		a.Issues = append(a.Issues, "В заголовке нет категории товара (платье, юбка, и т.д.)")
	}

	// Material.
	if !a.HasMaterial {
		score -= 10
		a.Issues = append(a.Issues, "Укажите материал в заголовке (хлопок, лён, шёлк...)")
	}

	// Color.
	if !a.HasColor {
		score -= 5
		a.Issues = append(a.Issues, "Рекомендуется указать цвет в заголовке")
	}

	if score < 0 {
		score = 0
	}
	a.Score = math.Round(score)
	return a
}

func auditDescription(desc string, keywords []string) descAudit {
	a := descAudit{
		Length:    utf8.RuneCountInString(desc),
		WordCount: len(strings.Fields(desc)),
	}

	if desc == "" {
		a.Score = 0
		a.Issues = append(a.Issues, "Описание отсутствует — критически важно для SEO")
		return a
	}

	score := 100.0

	// Length scoring: optimal 200-1000 chars.
	if a.Length < 100 {
		score -= 30
		a.Issues = append(a.Issues, "Описание слишком короткое (<100 символов)")
	} else if a.Length < 200 {
		score -= 15
		a.Issues = append(a.Issues, "Описание короче рекомендуемого (200+ символов)")
	} else if a.Length > 2000 {
		score -= 10
		a.Issues = append(a.Issues, "Описание слишком длинное (>2000 символов)")
	}

	// Keyword density.
	if len(keywords) > 0 && a.WordCount > 0 {
		descLower := strings.ToLower(desc)
		kwCount := 0
		for _, kw := range keywords {
			kwCount += strings.Count(descLower, strings.ToLower(kw))
		}
		a.KeywordDensity = math.Round(float64(kwCount)/float64(a.WordCount)*100*100) / 100

		if a.KeywordDensity < 0.5 {
			score -= 15
			a.Issues = append(a.Issues, "Низкая плотность ключевых слов в описании (<0.5%)")
		} else if a.KeywordDensity > 3.0 {
			score -= 20
			a.Issues = append(a.Issues, "Переспам ключевых слов в описании (>3%) — может снизить позиции")
		}
	}

	if score < 0 {
		score = 0
	}
	a.Score = math.Round(score)
	return a
}

func auditCharacteristics(chars map[string]string) charsAudit {
	a := charsAudit{
		Required: len(requiredClothingChars),
		Filled:   len(chars),
	}

	if len(chars) == 0 {
		a.Score = 0
		a.MissingFields = requiredClothingChars
		return a
	}

	// Check each required field.
	charsLower := map[string]bool{}
	for k := range chars {
		charsLower[strings.ToLower(k)] = true
	}

	for _, req := range requiredClothingChars {
		found := false
		reqLower := strings.ToLower(req)
		for k := range charsLower {
			if strings.Contains(k, reqLower) || strings.Contains(reqLower, k) {
				found = true
				break
			}
		}
		if !found {
			a.MissingFields = append(a.MissingFields, req)
		}
	}

	filledPct := float64(a.Required-len(a.MissingFields)) / float64(a.Required) * 100
	a.Score = math.Round(filledPct)
	return a
}

func auditPhotos(count int) photoAudit {
	a := photoAudit{Count: count}

	switch {
	case count >= 7:
		a.Score = 100
	case count >= 5:
		a.Score = 85
	case count >= 3:
		a.Score = 60
		a.Issues = append(a.Issues, "Рекомендуется минимум 5 фото (фронт, бок, детали, размерная сетка, на модели)")
	case count >= 1:
		a.Score = 30
		a.Issues = append(a.Issues, "Критически мало фото — добавьте минимум 5")
	default:
		a.Score = 0
		a.Issues = append(a.Issues, "Нет фотографий — невозможно продавать без фото")
	}

	return a
}

func auditKeywords(title, desc string, keywords []string) keywordAudit {
	a := keywordAudit{}

	if len(keywords) == 0 {
		a.Score = 50 // no target keywords to check
		return a
	}

	titleLower := strings.ToLower(title)
	descLower := strings.ToLower(desc)

	for _, kw := range keywords {
		kwLower := strings.ToLower(kw)
		inTitle := strings.Contains(titleLower, kwLower)
		inDesc := strings.Contains(descLower, kwLower)

		a.Details = append(a.Details, kwPresence{
			Keyword: kw, InTitle: inTitle, InDesc: inDesc,
		})

		if inTitle {
			a.InTitle++
		}
		if inDesc {
			a.InDescription++
		}
		if !inTitle && !inDesc {
			a.Missing = append(a.Missing, kw)
		}
	}

	// Score: weighted by title (60%) and desc (40%) coverage.
	titleCov := float64(a.InTitle) / float64(len(keywords))
	descCov := float64(a.InDescription) / float64(len(keywords))
	a.Score = math.Round((titleCov*0.6 + descCov*0.4) * 100)

	return a
}

func scoreToGrade(score float64) string {
	switch {
	case score >= 90:
		return "A"
	case score >= 75:
		return "B"
	case score >= 60:
		return "C"
	case score >= 40:
		return "D"
	default:
		return "F"
	}
}

func collectSuggestions(resp auditResponse) []string {
	var sugs []string

	// Prioritized suggestions.
	type scored struct {
		priority int
		text     string
	}
	var items []scored

	if resp.DescAudit.Score == 0 {
		items = append(items, scored{0, "Добавьте описание товара — это критически важно для SEO и конверсии"})
	}
	if resp.PhotoAudit.Count < 3 {
		items = append(items, scored{1, "Добавьте больше фото: фронт, бок, детали, размерная сетка, на модели/манекене"})
	}
	if !resp.TitleAudit.HasCategory {
		items = append(items, scored{2, "Добавьте категорию товара в заголовок (платье, юбка, брюки и т.д.)"})
	}
	if !resp.TitleAudit.HasMaterial {
		items = append(items, scored{3, "Укажите материал в заголовке для улучшения поиска"})
	}
	if len(resp.CharsAudit.MissingFields) > 0 {
		items = append(items, scored{4, "Заполните обязательные характеристики: " + strings.Join(resp.CharsAudit.MissingFields, ", ")})
	}
	if len(resp.KeywordAudit.Missing) > 0 && len(resp.KeywordAudit.Missing) <= 5 {
		items = append(items, scored{5, "Используйте в карточке ключевые слова: " + strings.Join(resp.KeywordAudit.Missing, ", ")})
	}
	if resp.TitleAudit.Length < 40 {
		items = append(items, scored{6, "Расширьте заголовок до 40-70 символов, добавив атрибуты (цвет, стиль, сезон)"})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].priority < items[j].priority
	})

	for _, item := range items {
		sugs = append(sugs, item.text)
	}
	return sugs
}
