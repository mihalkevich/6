package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// --- Card Audit Tests ---

func TestCardAudit_GoodCard(t *testing.T) {
	body := auditRequest{
		Title:       "Платье женское летнее хлопок чёрное макси повседневное",
		Description: "Стильное платье из натурального хлопка для жарких летних дней. Удобный свободный крой макси, подходит для прогулок и отдыха. Натуральный хлопок обеспечивает комфорт. Легко стирается и не мнётся. Универсальный чёрный цвет подойдёт к любому образу.",
		Characteristics: map[string]string{
			"Состав": "100% хлопок", "Материал": "хлопок", "Цвет": "чёрный",
			"Размер": "S-XL", "Пол": "женский", "Страна производства": "Россия",
			"Сезон": "лето", "Стиль": "повседневный",
		},
		PhotoCount:     6,
		Category:       "Платья",
		Brand:          "TestBrand",
		TargetKeywords: []string{"платье летнее", "платье хлопок"},
	}

	resp := doAuditRequest(t, body)

	if resp.OverallScore < 60 {
		t.Errorf("Good card should score >= 60, got %.0f", resp.OverallScore)
	}
	if resp.Grade == "F" || resp.Grade == "D" {
		t.Errorf("Good card should not get grade %s", resp.Grade)
	}
}

func TestCardAudit_EmptyDescription(t *testing.T) {
	body := auditRequest{
		Title:    "Платье женское",
		Category: "Платья",
	}

	resp := doAuditRequest(t, body)

	if resp.DescAudit.Score != 0 {
		t.Errorf("Empty description should score 0, got %.0f", resp.DescAudit.Score)
	}
	if len(resp.Suggestions) == 0 {
		t.Error("Should suggest adding description")
	}
}

func TestCardAudit_ShortTitle(t *testing.T) {
	body := auditRequest{
		Title:    "Платье",
		Category: "Платья",
	}

	resp := doAuditRequest(t, body)

	if resp.TitleAudit.Score >= 80 {
		t.Errorf("Short title should score < 80, got %.0f", resp.TitleAudit.Score)
	}
}

func TestCardAudit_NoPhotos(t *testing.T) {
	body := auditRequest{
		Title:      "Платье женское летнее",
		PhotoCount: 0,
	}

	resp := doAuditRequest(t, body)

	if resp.PhotoAudit.Score != 0 {
		t.Errorf("No photos should score 0, got %.0f", resp.PhotoAudit.Score)
	}
}

func doAuditRequest(t *testing.T, body auditRequest) auditResponse {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/seo/card-audit", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleCardAudit(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp auditResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	return resp
}

// --- Title Generator Tests ---

func TestGenerateTitle(t *testing.T) {
	body := generateTitleRequest{
		Category: "платье",
		Material: "хлопок",
		Color:    "чёрное",
		Season:   "летнее",
		Gender:   "женское",
	}

	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/seo/generate-title", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleGenerateTitle(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	suggestions, ok := resp["suggestions"].([]interface{})
	if !ok || len(suggestions) == 0 {
		t.Fatal("Expected title suggestions")
	}
}

func TestGenerateTitle_NoCategoryReturns400(t *testing.T) {
	body := generateTitleRequest{}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/seo/generate-title", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleGenerateTitle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}

// --- Snapshot Tests ---

func TestSnapshotSaveAndRetrieve(t *testing.T) {
	// Clear state.
	snapshotMu.Lock()
	cardSnapshots = map[int64][]cardSnapshot{}
	snapshotMu.Unlock()

	// Save first snapshot.
	body := saveSnapshotRequest{
		NmID:       12345,
		Title:      "Платье летнее v1",
		Price:      1500,
		PhotoCount: 3,
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/seo/card-snapshot", bytes.NewReader(b))
	w := httptest.NewRecorder()
	handleSaveSnapshot(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Save 1: expected 200, got %d", w.Code)
	}

	// Save second snapshot with changes.
	body.Title = "Платье летнее v2 обновлённое"
	body.Price = 1200
	body.PhotoCount = 6
	b, _ = json.Marshal(body)
	req = httptest.NewRequest(http.MethodPost, "/api/seo/card-snapshot", bytes.NewReader(b))
	w = httptest.NewRecorder()
	handleSaveSnapshot(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Save 2: expected 200, got %d", w.Code)
	}

	var saveResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &saveResp)

	// Should detect changes.
	if saveResp["changes"] == nil {
		t.Error("Expected changes to be detected between snapshots")
	}

	// Retrieve snapshots.
	getBody := map[string]int64{"nm_id": 12345}
	b, _ = json.Marshal(getBody)
	req = httptest.NewRequest(http.MethodPost, "/api/seo/card-snapshots", bytes.NewReader(b))
	w = httptest.NewRecorder()
	handleGetSnapshots(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Get: expected 200, got %d", w.Code)
	}

	var getResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getResp)

	total := getResp["total"].(float64)
	if total != 2 {
		t.Errorf("Expected 2 snapshots, got %.0f", total)
	}
}

// --- Forecast Tests ---

func TestAnalyzeKeywordTrend(t *testing.T) {
	records := []positionRecord{
		{Position: 50, Page: 1, CheckedAt: time.Now().AddDate(0, 0, -14)},
		{Position: 40, Page: 1, CheckedAt: time.Now().AddDate(0, 0, -10)},
		{Position: 30, Page: 1, CheckedAt: time.Now().AddDate(0, 0, -7)},
		{Position: 25, Page: 1, CheckedAt: time.Now().AddDate(0, 0, -3)},
		{Position: 20, Page: 1, CheckedAt: time.Now()},
	}

	fc := analyzeKeywordTrend("платье летнее", records)

	if fc.Trend != "improving" {
		t.Errorf("Expected 'improving' trend, got %q (velocity=%.2f)", fc.Trend, fc.Velocity)
	}
	if fc.Velocity >= 0 {
		t.Errorf("Position improving should have negative velocity, got %.2f", fc.Velocity)
	}
	if fc.PredictedPos >= fc.CurrentPos {
		t.Errorf("Predicted position (%d) should be better than current (%d)", fc.PredictedPos, fc.CurrentPos)
	}
	if fc.CurrentPos != 20 {
		t.Errorf("Expected current position 20, got %d", fc.CurrentPos)
	}
	if fc.BestPos != 20 {
		t.Errorf("Expected best position 20, got %d", fc.BestPos)
	}
	if fc.DataPoints != 5 {
		t.Errorf("Expected 5 data points, got %d", fc.DataPoints)
	}
}
