package wbapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const (
	BaseStatisticsURL = "https://statistics-api.wildberries.ru"
	BaseContentURL    = "https://content-api.wildberries.ru"
	BaseMarketURL     = "https://marketplace-api.wildberries.ru"
	BaseAnalyticsURL  = "https://seller-analytics-api.wildberries.ru"
	BaseAdvURL        = "https://advert-api.wildberries.ru"
	BaseSearchURL     = "https://search.wb.ru"
)

// Client wraps HTTP calls to the Wildberries seller API.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new WB API client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) doRequest(method, rawURL string, result interface{}) error {
	req, err := http.NewRequest(method, rawURL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}
	return nil
}

// ---------- Statistics API ----------

type WBSale struct {
	Date           string  `json:"date"`
	LastChangeDate string  `json:"lastChangeDate"`
	SupplierArticle string `json:"supplierArticle"`
	TechSize       string  `json:"techSize"`
	Barcode        string  `json:"barcode"`
	TotalPrice     float64 `json:"totalPrice"`
	DiscountPercent float64 `json:"discountPercent"`
	IsSupply       bool    `json:"isSupply"`
	IsRealization  bool    `json:"isRealization"`
	PromoCodeDiscount float64 `json:"promoCodeDiscount"`
	WarehouseName  string  `json:"warehouseName"`
	CountryName    string  `json:"countryName"`
	OblastOkrugName string `json:"oblastOkrugName"`
	RegionName     string  `json:"regionName"`
	IncomeID       int64   `json:"incomeID"`
	SaleID         string  `json:"saleID"`
	Odid           int64   `json:"odid"`
	Spp            float64 `json:"spp"`
	ForPay         float64 `json:"forPay"`
	FinishedPrice  float64 `json:"finishedPrice"`
	PriceWithDisc  float64 `json:"priceWithDisc"`
	NmId           int64   `json:"nmId"`
	Subject        string  `json:"subject"`
	Category       string  `json:"category"`
	Brand          string  `json:"brand"`
	IsStorno       int     `json:"IsStorno"`
	GNumber        string  `json:"gNumber"`
	Sticker        string  `json:"sticker"`
	SRid           string  `json:"srid"`
}

// GetSales fetches sales from the Statistics API.
func (c *Client) GetSales(dateFrom time.Time) ([]WBSale, error) {
	u := fmt.Sprintf("%s/api/v1/supplier/sales?dateFrom=%s",
		BaseStatisticsURL, dateFrom.Format("2006-01-02"))
	var sales []WBSale
	if err := c.doRequest(http.MethodGet, u, &sales); err != nil {
		return nil, err
	}
	return sales, nil
}

type WBOrder struct {
	Date            string  `json:"date"`
	LastChangeDate  string  `json:"lastChangeDate"`
	SupplierArticle string  `json:"supplierArticle"`
	TechSize        string  `json:"techSize"`
	Barcode         string  `json:"barcode"`
	TotalPrice      float64 `json:"totalPrice"`
	DiscountPercent float64 `json:"discountPercent"`
	WarehouseName   string  `json:"warehouseName"`
	Oblast          string  `json:"oblast"`
	IncomeID        int64   `json:"incomeID"`
	Odid            int64   `json:"odid"`
	NmId            int64   `json:"nmId"`
	Subject         string  `json:"subject"`
	Category        string  `json:"category"`
	Brand           string  `json:"brand"`
	IsCancel        bool    `json:"isCancel"`
	CancelDt        string  `json:"cancel_dt"`
	GNumber         string  `json:"gNumber"`
	Sticker         string  `json:"sticker"`
	SRid            string  `json:"srid"`
}

// GetOrders fetches orders from the Statistics API.
func (c *Client) GetOrders(dateFrom time.Time) ([]WBOrder, error) {
	u := fmt.Sprintf("%s/api/v1/supplier/orders?dateFrom=%s",
		BaseStatisticsURL, dateFrom.Format("2006-01-02"))
	var orders []WBOrder
	if err := c.doRequest(http.MethodGet, u, &orders); err != nil {
		return nil, err
	}
	return orders, nil
}

type WBStock struct {
	LastChangeDate  string `json:"lastChangeDate"`
	SupplierArticle string `json:"supplierArticle"`
	TechSize        string `json:"techSize"`
	Barcode         string `json:"barcode"`
	Quantity        int    `json:"quantity"`
	IsSupply        bool   `json:"isSupply"`
	IsRealization   bool   `json:"isRealization"`
	QuantityFull    int    `json:"quantityFull"`
	QuantityNotInOrders int `json:"quantityNotInOrders"`
	WarehouseName   string `json:"warehouseName"`
	InWayToClient   int    `json:"inWayToClient"`
	InWayFromClient int    `json:"inWayFromClient"`
	NmId            int64  `json:"nmId"`
	Subject         string `json:"subject"`
	Category        string `json:"category"`
	Brand           string `json:"brand"`
	SCCode          string `json:"SCCode"`
	Price           float64 `json:"Price"`
	Discount        float64 `json:"Discount"`
}

// GetStocks fetches current stock levels from the Statistics API.
func (c *Client) GetStocks(dateFrom time.Time) ([]WBStock, error) {
	u := fmt.Sprintf("%s/api/v1/supplier/stocks?dateFrom=%s",
		BaseStatisticsURL, dateFrom.Format("2006-01-02"))
	var stocks []WBStock
	if err := c.doRequest(http.MethodGet, u, &stocks); err != nil {
		return nil, err
	}
	return stocks, nil
}

// ---------- Search API (public, no auth needed) ----------

type WBSearchResult struct {
	Data struct {
		Products []WBSearchProduct `json:"products"`
	} `json:"data"`
}

type WBSearchProduct struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Brand    string  `json:"brand"`
	BrandID  int64   `json:"brandId"`
	SiteID   int64   `json:"siteId"`
	Price    int64   `json:"priceU"` // price * 100
	SalePriceU int64 `json:"salePriceU"`
	Rating   float64 `json:"reviewRating"`
	Feedbacks int    `json:"feedbacks"`
	Sale     int     `json:"sale"`
}

// SearchProducts searches WB catalog by keyword (public API).
func (c *Client) SearchProducts(keyword string, page int) (*WBSearchResult, error) {
	u := fmt.Sprintf("%s/exactmatch/ru/common/v4/search?query=%s&resultset=catalog&page=%d&sort=popular&suppressSpellcheck=false",
		BaseSearchURL, url.QueryEscape(keyword), page)

	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result WBSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}
