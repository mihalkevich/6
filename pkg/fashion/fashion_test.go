package fashion

import (
	"testing"
)

func TestDefaultDictionary(t *testing.T) {
	dict := DefaultDictionary()

	if len(dict.Categories) == 0 {
		t.Fatal("Categories empty")
	}
	if len(dict.Materials) == 0 {
		t.Fatal("Materials empty")
	}
	if len(dict.Styles) == 0 {
		t.Fatal("Styles empty")
	}
	if len(dict.Seasons) == 0 {
		t.Fatal("Seasons empty")
	}
	if len(dict.Colors) == 0 {
		t.Fatal("Colors empty")
	}
	if len(dict.Synonyms) == 0 {
		t.Fatal("Synonyms empty")
	}
}

func TestAllTerms(t *testing.T) {
	dict := DefaultDictionary()
	terms := dict.AllTerms()

	if len(terms) == 0 {
		t.Fatal("AllTerms returned empty map")
	}

	// Check that known terms map to correct dimensions.
	checks := map[string]TokenDimension{
		"платье":     DimCategory,
		"хлопок":     DimMaterial,
		"летний":     DimSeason,
		"женский":    DimGender,
	}
	for term, expectedDim := range checks {
		dim, ok := terms[term]
		if !ok {
			t.Errorf("term %q not found in AllTerms", term)
			continue
		}
		if dim != expectedDim {
			t.Errorf("term %q: got dimension %q, want %q", term, dim, expectedDim)
		}
	}
}

func TestLookupToken(t *testing.T) {
	dict := DefaultDictionary()

	dim, ok := dict.LookupToken("шёлк")
	if !ok {
		t.Fatal("LookupToken('шёлк') not found")
	}
	if dim != DimMaterial {
		t.Errorf("LookupToken('шёлк') = %q, want %q", dim, DimMaterial)
	}

	_, ok = dict.LookupToken("несуществующеесловотест")
	if ok {
		t.Error("LookupToken should not find non-existent term")
	}
}

func TestParseProduct(t *testing.T) {
	dict := DefaultDictionary()

	attrs := dict.ParseProduct("Платье женское летнее хлопок чёрное макси", "Платья", "TestBrand")

	if attrs.Category == "" {
		t.Error("Category should be detected")
	}
	if len(attrs.Materials) == 0 {
		t.Error("Materials should be detected (хлопок)")
	}
	if len(attrs.Seasons) == 0 {
		t.Error("Seasons should be detected (летнее/летний)")
	}
	if len(attrs.Colors) == 0 {
		t.Error("Colors should be detected (чёрное/чёрный)")
	}
	if len(attrs.Genders) == 0 {
		t.Error("Genders should be detected (женское/женский)")
	}
	if attrs.Brand != "TestBrand" {
		t.Errorf("Brand = %q, want TestBrand", attrs.Brand)
	}
}

func TestGenerateKeywords(t *testing.T) {
	dict := DefaultDictionary()

	groups := dict.GenerateKeywords("Платье женское летнее хлопок", "Платья", "TestBrand", GeneratorHints{})

	if len(groups) == 0 {
		t.Fatal("GenerateKeywords returned no groups")
	}

	totalKW := 0
	groupTypes := map[string]bool{}
	for _, g := range groups {
		totalKW += len(g.Keywords)
		groupTypes[g.Type] = true
	}

	if totalKW < 10 {
		t.Errorf("Expected at least 10 keywords, got %d", totalKW)
	}

	// Should have at least base and attributed groups.
	if !groupTypes["base"] {
		t.Error("Missing 'base' keyword group")
	}
	if !groupTypes["attributed"] {
		t.Error("Missing 'attributed' keyword group")
	}
}

func TestSynonymsFor(t *testing.T) {
	dict := DefaultDictionary()

	syns := dict.SynonymsFor("платье")
	if len(syns) == 0 {
		t.Error("Expected synonyms for 'платье'")
	}

	// Non-existent word should return empty.
	syns2 := dict.SynonymsFor("несуществующее")
	if len(syns2) != 0 {
		t.Errorf("Expected no synonyms, got %v", syns2)
	}
}
