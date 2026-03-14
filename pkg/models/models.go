package models

import "time"

// User represents an authenticated seller.
type User struct {
	ID        int64     `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password_hash"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// APIKey stores a Wildberries API key for a user.
type APIKey struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Token     string    `json:"-" db:"token_encrypted"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Product represents a WB product card.
type Product struct {
	ID          int64   `json:"id" db:"id"`
	UserID      int64   `json:"user_id" db:"user_id"`
	NmID        int64   `json:"nm_id" db:"nm_id"`
	SKU         string  `json:"sku" db:"sku"`
	Brand       string  `json:"brand" db:"brand"`
	Name        string  `json:"name" db:"name"`
	Category    string  `json:"category" db:"category"`
	Price       float64 `json:"price" db:"price"`
	DiscountPct float64 `json:"discount_pct" db:"discount_pct"`
	Rating      float64 `json:"rating" db:"rating"`
	Feedbacks   int     `json:"feedbacks" db:"feedbacks"`
	ImageURL    string  `json:"image_url" db:"image_url"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Stock represents current inventory at a WB warehouse.
type Stock struct {
	ID          int64     `json:"id" db:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	NmID        int64     `json:"nm_id" db:"nm_id"`
	WarehouseID int64     `json:"warehouse_id" db:"warehouse_id"`
	Warehouse   string    `json:"warehouse" db:"warehouse_name"`
	Quantity    int       `json:"quantity" db:"quantity"`
	InWayToClient int     `json:"in_way_to_client" db:"in_way_to_client"`
	InWayFromClient int   `json:"in_way_from_client" db:"in_way_from_client"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Sale represents a single sale record from WB.
type Sale struct {
	ID             int64     `json:"id" db:"id"`
	UserID         int64     `json:"user_id" db:"user_id"`
	WBID           string    `json:"wb_id" db:"wb_id"`
	NmID           int64     `json:"nm_id" db:"nm_id"`
	Category       string    `json:"category" db:"category"`
	Brand          string    `json:"brand" db:"brand"`
	Quantity       int       `json:"quantity" db:"quantity"`
	TotalPrice     float64   `json:"total_price" db:"total_price"`
	DiscountPct    float64   `json:"discount_pct" db:"discount_pct"`
	ForPay         float64   `json:"for_pay" db:"for_pay"`
	SaleDate       time.Time `json:"sale_date" db:"sale_date"`
	IsReturn       bool      `json:"is_return" db:"is_return"`
	WarehouseName  string    `json:"warehouse_name" db:"warehouse_name"`
	Region         string    `json:"region" db:"region"`
}

// Order represents an order from WB.
type Order struct {
	ID            int64     `json:"id" db:"id"`
	UserID        int64     `json:"user_id" db:"user_id"`
	WBID          string    `json:"wb_id" db:"wb_id"`
	NmID          int64     `json:"nm_id" db:"nm_id"`
	Category      string    `json:"category" db:"category"`
	Brand         string    `json:"brand" db:"brand"`
	Quantity      int       `json:"quantity" db:"quantity"`
	TotalPrice    float64   `json:"total_price" db:"total_price"`
	DiscountPct   float64   `json:"discount_pct" db:"discount_pct"`
	WarehouseName string    `json:"warehouse_name" db:"warehouse_name"`
	Region        string    `json:"region" db:"region"`
	OrderDate     time.Time `json:"order_date" db:"order_date"`
	IsCancel      bool      `json:"is_cancel" db:"is_cancel"`
}

// SupplyRecommendation is a generated recommendation for the next supply.
type SupplyRecommendation struct {
	NmID             int64   `json:"nm_id"`
	ProductName      string  `json:"product_name"`
	CurrentStock     int     `json:"current_stock"`
	AvgDailySales    float64 `json:"avg_daily_sales"`
	DaysOfStock      float64 `json:"days_of_stock"`
	RecommendedQty   int     `json:"recommended_qty"`
	RecommendedDays  int     `json:"recommended_days"`
	Urgency          string  `json:"urgency"` // critical, warning, ok
}

// FunnelData represents the sales funnel for a product.
type FunnelData struct {
	NmID        int64   `json:"nm_id"`
	ProductName string  `json:"product_name"`
	Views       int     `json:"views"`
	Clicks      int     `json:"clicks"`
	AddToCart   int     `json:"add_to_cart"`
	Orders      int     `json:"orders"`
	Buyouts     int     `json:"buyouts"`
	CTR         float64 `json:"ctr"`
	CartRate    float64 `json:"cart_rate"`
	OrderRate   float64 `json:"order_rate"`
	BuyoutRate  float64 `json:"buyout_rate"`
}

// Competitor represents a competitor product found in the same category.
type Competitor struct {
	NmID      int64   `json:"nm_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Price     float64 `json:"price"`
	Rating    float64 `json:"rating"`
	Feedbacks int     `json:"feedbacks"`
	Sales30d  int     `json:"sales_30d"`
}

// KeywordPosition tracks a product's position for a search keyword.
type KeywordPosition struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	NmID      int64     `json:"nm_id" db:"nm_id"`
	Keyword   string    `json:"keyword" db:"keyword"`
	Position  int       `json:"position" db:"position"`
	Page      int       `json:"page" db:"page"`
	CheckedAt time.Time `json:"checked_at" db:"checked_at"`
}

// Alert represents a notification for the user.
type Alert struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	Type      string    `json:"type" db:"alert_type"` // stock_low, price_change, position_drop, competitor
	Title     string    `json:"title" db:"title"`
	Message   string    `json:"message" db:"message"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
