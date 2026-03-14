package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

func makeSale(nmID int64, subject, size, region, saleID string, daysAgo int) wbapi.WBSale {
	d := time.Now().AddDate(0, 0, -daysAgo).Format("2006-01-02T15:04:05")
	return wbapi.WBSale{
		NmId:       nmID,
		Subject:    subject,
		Brand:      "TestBrand",
		TechSize:   size,
		RegionName: region,
		SaleID:     saleID,
		Date:       d,
		ForPay:     1500,
	}
}

func makeStock(nmID int64, subject, size string, qty int) wbapi.WBStock {
	return wbapi.WBStock{
		NmId:         nmID,
		Subject:      subject,
		TechSize:     size,
		QuantityFull: qty,
	}
}

func makeOrder(nmID int64, subject, size string, daysAgo int) wbapi.WBOrder {
	d := time.Now().AddDate(0, 0, -daysAgo).Format("2006-01-02T15:04:05")
	return wbapi.WBOrder{
		NmId:     nmID,
		Subject:  subject,
		TechSize: size,
		Date:     d,
	}
}

// --- Size Analysis Tests ---

func TestSizeAnalysis(t *testing.T) {
	sales := []wbapi.WBSale{
		makeSale(100, "Платье летнее хлопок", "S", "Москва", "S001", 1),
		makeSale(100, "Платье летнее хлопок", "S", "Москва", "S002", 2),
		makeSale(100, "Платье летнее хлопок", "M", "Москва", "S003", 1),
		makeSale(100, "Платье летнее хлопок", "M", "Москва", "S004", 2),
		makeSale(100, "Платье летнее хлопок", "M", "Москва", "S005", 3),
		makeSale(100, "Платье летнее хлопок", "L", "Москва", "S006", 1),
		makeSale(100, "Платье летнее хлопок", "L", "Москва", "R007", 2), // return
	}

	stocks := []wbapi.WBStock{
		makeStock(100, "Платье летнее хлопок", "S", 5),
		makeStock(100, "Платье летнее хлопок", "M", 20),
		makeStock(100, "Платье летнее хлопок", "L", 2),
	}

	body := sizeAnalysisRequest{Sales: sales, Stocks: stocks}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/fashion/size-analysis", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleSizeAnalysis(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	products := resp["products"].([]interface{})
	if len(products) == 0 {
		t.Fatal("Expected at least 1 product in response")
	}

	prod := products[0].(map[string]interface{})
	sizes := prod["sizes"].([]interface{})
	if len(sizes) != 3 {
		t.Errorf("Expected 3 sizes (S, M, L), got %d", len(sizes))
	}
}

// --- Size Recommendations Tests ---

func TestSizeRecommendations(t *testing.T) {
	sales := []wbapi.WBSale{
		makeSale(200, "Юбка", "M", "Москва", "S001", 1),
		makeSale(200, "Юбка", "M", "Москва", "S002", 5),
		makeSale(200, "Юбка", "M", "Москва", "S003", 10),
	}
	stocks := []wbapi.WBStock{
		makeStock(200, "Юбка", "M", 1), // very low stock
	}

	body := sizeRecRequest{Sales: sales, Stocks: stocks}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/fashion/size-recommendations", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleSizeRecommendations(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	critCount := resp["critical_count"].(float64)
	warnCount := resp["warning_count"].(float64)
	if critCount+warnCount < 1 {
		t.Error("Expected at least 1 critical or warning recommendation (low stock)")
	}
}

// --- Seasonal Analysis Tests ---

func TestSeasonalAnalysis(t *testing.T) {
	sales := []wbapi.WBSale{
		makeSale(300, "Платье летнее женское", "", "Москва", "S001", 1),
		makeSale(300, "Платье летнее женское", "", "Москва", "S002", 3),
		makeSale(300, "Платье летнее женское", "", "Москва", "S003", 7),
		makeSale(300, "Платье летнее женское", "", "Москва", "S004", 15),
		makeSale(300, "Платье летнее женское", "", "Москва", "S005", 20),
	}

	body := seasonalRequest{Sales: sales}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/fashion/seasonal-analysis", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleSeasonalAnalysis(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	products := resp["products"].([]interface{})
	if len(products) == 0 {
		t.Fatal("Expected product seasonality data")
	}

	prod := products[0].(map[string]interface{})
	season := prod["detected_season"].(string)
	if season != "Летняя коллекция" {
		t.Errorf("Expected 'Летняя коллекция', got %q", season)
	}

	// Should have calendar.
	calendar := resp["calendar"].([]interface{})
	if len(calendar) != 12 {
		t.Errorf("Expected 12 months in calendar, got %d", len(calendar))
	}
}

// --- Trend Monitor Tests ---

func TestTrendMonitor(t *testing.T) {
	// Recent sales with хлопок products (should be picked up as material trend).
	var sales []wbapi.WBSale
	for i := 0; i < 10; i++ {
		sales = append(sales, makeSale(400, "Платье хлопок летнее", "", "Москва", "S"+string(rune('0'+i)), i%7))
	}
	// Older sales with хлопок.
	for i := 0; i < 3; i++ {
		sales = append(sales, makeSale(401, "Юбка хлопок", "", "Москва", "T"+string(rune('0'+i)), 10+i))
	}

	body := trendRequest{Sales: sales}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/fashion/trend-monitor", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleTrendMonitor(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp trendResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total == 0 {
		t.Error("Expected some attribute trends to be tracked")
	}
}

// --- Return Analysis Tests ---

func TestReturnAnalysis(t *testing.T) {
	sales := []wbapi.WBSale{
		// Normal sales.
		makeSale(500, "Куртка зимняя", "M", "Москва", "S001", 1),
		makeSale(500, "Куртка зимняя", "M", "Москва", "S002", 2),
		makeSale(500, "Куртка зимняя", "L", "Москва", "S003", 3),
		makeSale(500, "Куртка зимняя", "L", "Москва", "S004", 4),
		makeSale(500, "Куртка зимняя", "XL", "Москва", "S005", 5),
		// Returns — XL has high return rate.
		makeSale(500, "Куртка зимняя", "XL", "Москва", "R006", 2),
		makeSale(500, "Куртка зимняя", "XL", "Москва", "R007", 3),
	}

	orders := []wbapi.WBOrder{
		makeOrder(500, "Куртка зимняя", "M", 1),
		makeOrder(500, "Куртка зимняя", "M", 2),
		makeOrder(500, "Куртка зимняя", "L", 3),
		makeOrder(500, "Куртка зимняя", "L", 4),
		makeOrder(500, "Куртка зимняя", "XL", 5),
		makeOrder(500, "Куртка зимняя", "XL", 6),
		makeOrder(500, "Куртка зимняя", "XL", 7),
	}

	body := returnRequest{Sales: sales, Orders: orders}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/fashion/return-analysis", bytes.NewReader(b))
	w := httptest.NewRecorder()

	handleReturnAnalysis(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	products := resp["products"].([]interface{})
	if len(products) == 0 {
		t.Fatal("Expected return analysis data")
	}

	prod := products[0].(map[string]interface{})

	// XL has 2 returns out of 3 (1 sale + 2 returns), should flag sizing issue.
	hasSizingIssue := prod["has_sizing_issue"].(bool)
	if !hasSizingIssue {
		t.Error("Expected sizing issue to be detected (XL has much higher return rate)")
	}

	// Should have recommendations.
	recs := prod["recommendations"].([]interface{})
	if len(recs) == 0 {
		t.Error("Expected recommendations for product with sizing issues")
	}
}
