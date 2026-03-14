package fashion

import (
	"strings"
	"unicode"
)

// ProductAttrs holds classified attributes extracted from a product name.
type ProductAttrs struct {
	Category  string
	Materials []string
	Styles    []string
	Seasons   []string
	Colors    []string
	Genders   []string
	Lengths   []string
	Fits      []string
	Brand     string
	Unmatched []string
}

// SuggestionGroup holds keywords grouped by generation strategy.
type SuggestionGroup struct {
	Type     string   `json:"type"`
	Keywords []string `json:"keywords"`
}

// GeneratorHints lets the caller supply explicit attributes
// that may not appear in the product name.
type GeneratorHints struct {
	Materials []string `json:"materials,omitempty"`
	Style     string   `json:"style,omitempty"`
	Season    string   `json:"season,omitempty"`
	Color     string   `json:"color,omitempty"`
	Occasion  string   `json:"occasion,omitempty"`
	Gender    string   `json:"gender,omitempty"`
}

// ParseProduct tokenizes a product name and classifies each token
// against the dictionary.
func (d *Dictionary) ParseProduct(name, category, brand string) ProductAttrs {
	attrs := ProductAttrs{Brand: brand}
	terms := d.AllTerms()

	text := strings.ToLower(name)
	if category != "" {
		catLow := strings.ToLower(category)
		// Try to match category directly.
		if _, ok := terms[catLow]; ok {
			attrs.Category = catLow
		}
	}

	// Try matching multi-word terms first (e.g., "в цветочек", "plus size", "slim fit").
	for term, dim := range terms {
		if !strings.Contains(term, " ") {
			continue
		}
		if strings.Contains(text, term) {
			d.addAttr(&attrs, dim, term)
			text = strings.ReplaceAll(text, term, " ")
		}
	}

	// Tokenize remaining text and match single words.
	words := tokenize(text)
	for _, w := range words {
		dim, ok := terms[w]
		if !ok {
			// Skip common filler words.
			if isFillerWord(w) {
				continue
			}
			attrs.Unmatched = append(attrs.Unmatched, w)
			continue
		}
		d.addAttr(&attrs, dim, w)
	}

	return attrs
}

// GenerateKeywords produces categorized keyword suggestions from product info.
func (d *Dictionary) GenerateKeywords(name, category, brand string, hints GeneratorHints) []SuggestionGroup {
	attrs := d.ParseProduct(name, category, brand)
	mergeHints(&attrs, hints)

	if attrs.Category == "" {
		// Fallback: use first unmatched as category-like base.
		if len(attrs.Unmatched) > 0 {
			attrs.Category = attrs.Unmatched[0]
		} else if category != "" {
			attrs.Category = strings.ToLower(category)
		}
	}

	seen := map[string]bool{}
	add := func(kw string) bool {
		kw = normalizeSpaces(kw)
		if kw == "" || seen[kw] {
			return false
		}
		seen[kw] = true
		return true
	}

	cat := attrs.Category

	// --- base ---
	var base []string
	if cat != "" {
		if add(cat) {
			base = append(base, cat)
		}
		for _, g := range uniqueGenders(attrs.Genders) {
			kw := cat + " " + g
			if add(kw) {
				base = append(base, kw)
			}
		}
	}

	// --- brand ---
	var brandKws []string
	if brand != "" && cat != "" {
		bLow := strings.ToLower(brand)
		for _, kw := range []string{bLow + " " + cat, cat + " " + bLow} {
			if add(kw) {
				brandKws = append(brandKws, kw)
			}
		}
	}

	// --- attributed ---
	var attributed []string
	attrLists := gatherAttributes(attrs)
	if cat != "" {
		for _, attr := range attrLists {
			kw := cat + " " + attr
			if add(kw) {
				attributed = append(attributed, kw)
			}
		}
	}

	// --- occasion ---
	var occasion []string
	occasions := attrs.collectOccasions(hints)
	if cat != "" {
		for _, occ := range occasions {
			prep, ok := OccasionPrepositions[occ]
			if !ok {
				prep = occ
			}
			kw := cat + " " + prep
			if add(kw) {
				occasion = append(occasion, kw)
			}
		}
	}

	// --- long_tail ---
	var longTail []string
	if cat != "" {
		combos := generateCombos(attrLists, 2, 3, 10)
		for _, combo := range combos {
			kw := cat + " " + strings.Join(combo, " ")
			if add(kw) {
				longTail = append(longTail, kw)
			}
		}
	}

	// --- size ---
	var sizeKws []string
	if cat != "" {
		for _, f := range attrs.Fits {
			kw := cat + " " + f
			if add(kw) {
				sizeKws = append(sizeKws, kw)
			}
		}
		for _, l := range attrs.Lengths {
			kw := cat + " " + l
			if add(kw) {
				sizeKws = append(sizeKws, kw)
			}
		}
	}

	// --- synonym ---
	var synonymKws []string
	if cat != "" {
		syns := d.SynonymsFor(cat)
		for _, syn := range syns {
			if add(syn) {
				synonymKws = append(synonymKws, syn)
			}
			// Synonym + top attributes (season, material, color).
			for _, attr := range topAttributes(attrs, 3) {
				kw := syn + " " + attr
				if add(kw) {
					synonymKws = append(synonymKws, kw)
				}
			}
		}
	}

	// Assemble groups, skipping empty ones.
	var groups []SuggestionGroup
	if len(base) > 0 {
		groups = append(groups, SuggestionGroup{Type: "base", Keywords: base})
	}
	if len(brandKws) > 0 {
		groups = append(groups, SuggestionGroup{Type: "brand", Keywords: brandKws})
	}
	if len(attributed) > 0 {
		groups = append(groups, SuggestionGroup{Type: "attributed", Keywords: attributed})
	}
	if len(occasion) > 0 {
		groups = append(groups, SuggestionGroup{Type: "occasion", Keywords: occasion})
	}
	if len(longTail) > 0 {
		groups = append(groups, SuggestionGroup{Type: "long_tail", Keywords: longTail})
	}
	if len(sizeKws) > 0 {
		groups = append(groups, SuggestionGroup{Type: "size", Keywords: sizeKws})
	}
	if len(synonymKws) > 0 {
		groups = append(groups, SuggestionGroup{Type: "synonym", Keywords: synonymKws})
	}

	return groups
}

// --- helpers ---

func (d *Dictionary) addAttr(attrs *ProductAttrs, dim TokenDimension, term string) {
	switch dim {
	case DimCategory:
		if attrs.Category == "" {
			attrs.Category = term
		}
	case DimMaterial:
		attrs.Materials = appendUniq(attrs.Materials, term)
	case DimStyle:
		attrs.Styles = appendUniq(attrs.Styles, term)
	case DimSeason:
		attrs.Seasons = appendUniq(attrs.Seasons, term)
	case DimColor:
		attrs.Colors = appendUniq(attrs.Colors, term)
	case DimOccasion:
		// stored for later
	case DimGender:
		attrs.Genders = appendUniq(attrs.Genders, term)
	case DimLength:
		attrs.Lengths = appendUniq(attrs.Lengths, term)
	case DimFit:
		attrs.Fits = appendUniq(attrs.Fits, term)
	}
}

func mergeHints(attrs *ProductAttrs, h GeneratorHints) {
	for _, m := range h.Materials {
		attrs.Materials = appendUniq(attrs.Materials, strings.ToLower(m))
	}
	if h.Style != "" {
		attrs.Styles = appendUniq(attrs.Styles, strings.ToLower(h.Style))
	}
	if h.Season != "" {
		attrs.Seasons = appendUniq(attrs.Seasons, strings.ToLower(h.Season))
	}
	if h.Color != "" {
		attrs.Colors = appendUniq(attrs.Colors, strings.ToLower(h.Color))
	}
	if h.Gender != "" {
		attrs.Genders = appendUniq(attrs.Genders, strings.ToLower(h.Gender))
	}
}

func (a ProductAttrs) collectOccasions(h GeneratorHints) []string {
	var occs []string
	if h.Occasion != "" {
		occs = append(occs, strings.ToLower(h.Occasion))
	}
	return occs
}

// gatherAttributes returns a flat list of all single attributes (season, material, color, style).
func gatherAttributes(attrs ProductAttrs) []string {
	var all []string
	all = append(all, attrs.Seasons...)
	all = append(all, attrs.Materials...)
	all = append(all, attrs.Colors...)
	all = append(all, attrs.Styles...)
	return all
}

// topAttributes returns the N most important attributes in priority order:
// season > material > color > style.
func topAttributes(attrs ProductAttrs, n int) []string {
	all := gatherAttributes(attrs)
	if len(all) > n {
		return all[:n]
	}
	return all
}

// generateCombos returns up to maxCombos combinations of size minLen..maxLen from items.
func generateCombos(items []string, minLen, maxLen, maxCombos int) [][]string {
	if len(items) < minLen {
		return nil
	}
	var result [][]string
	for size := minLen; size <= maxLen && size <= len(items); size++ {
		combos := combinations(items, size)
		for _, c := range combos {
			result = append(result, c)
			if len(result) >= maxCombos {
				return result
			}
		}
	}
	return result
}

// combinations returns all k-element subsets of items.
func combinations(items []string, k int) [][]string {
	if k > len(items) {
		return nil
	}
	var result [][]string
	combo := make([]string, k)
	var gen func(start, depth int)
	gen = func(start, depth int) {
		if depth == k {
			tmp := make([]string, k)
			copy(tmp, combo)
			result = append(result, tmp)
			return
		}
		for i := start; i <= len(items)-(k-depth); i++ {
			combo[depth] = items[i]
			gen(i+1, depth+1)
		}
	}
	gen(0, 0)
	return result
}

// uniqueGenders returns deduplicated gender roots (женский, мужской, etc).
func uniqueGenders(genders []string) []string {
	roots := map[string]string{
		"женский": "женское", "женское": "женское", "женская": "женское", "женские": "женское",
		"мужской": "мужское", "мужское": "мужское", "мужская": "мужское", "мужские": "мужское",
		"детский": "детское", "детское": "детское", "детская": "детское", "детские": "детское",
		"унисекс": "унисекс",
	}
	seen := map[string]bool{}
	var out []string
	for _, g := range genders {
		root := roots[g]
		if root == "" {
			root = g
		}
		if !seen[root] {
			seen[root] = true
			out = append(out, root)
		}
	}
	return out
}

func appendUniq(slice []string, val string) []string {
	for _, s := range slice {
		if s == val {
			return slice
		}
	}
	return append(slice, val)
}

func normalizeSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func tokenize(text string) []string {
	// Split on whitespace and strip punctuation from edges.
	raw := strings.Fields(text)
	out := make([]string, 0, len(raw))
	for _, w := range raw {
		w = strings.TrimFunc(w, func(r rune) bool {
			return unicode.IsPunct(r) || unicode.IsSymbol(r)
		})
		if w != "" {
			out = append(out, w)
		}
	}
	return out
}

var fillerWords = map[string]bool{
	"и": true, "в": true, "на": true, "с": true, "из": true,
	"для": true, "от": true, "по": true, "к": true, "до": true,
	"без": true, "не": true, "или": true, "а": true, "но": true,
}

func isFillerWord(w string) bool {
	return fillerWords[w]
}
