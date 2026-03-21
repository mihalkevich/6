CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    sale_id TEXT NOT NULL,
    nm_id BIGINT NOT NULL,
    supplier_article TEXT NOT NULL DEFAULT '',
    tech_size TEXT NOT NULL DEFAULT '',
    barcode TEXT NOT NULL DEFAULT '',
    total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    for_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
    finished_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_with_disc DOUBLE PRECISION NOT NULL DEFAULT 0,
    warehouse_name TEXT NOT NULL DEFAULT '',
    country_name TEXT NOT NULL DEFAULT '',
    region_name TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    brand TEXT NOT NULL DEFAULT '',
    sale_date TIMESTAMPTZ NOT NULL,
    last_change_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_return BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(user_id, sale_id)
);
CREATE INDEX IF NOT EXISTS idx_sales_user_nm ON sales(user_id, nm_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sale_date);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    odid BIGINT NOT NULL,
    nm_id BIGINT NOT NULL,
    supplier_article TEXT NOT NULL DEFAULT '',
    tech_size TEXT NOT NULL DEFAULT '',
    barcode TEXT NOT NULL DEFAULT '',
    total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    warehouse_name TEXT NOT NULL DEFAULT '',
    oblast TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    brand TEXT NOT NULL DEFAULT '',
    order_date TIMESTAMPTZ NOT NULL,
    last_change_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_cancel BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(user_id, odid)
);
CREATE INDEX IF NOT EXISTS idx_orders_user_nm ON orders(user_id, nm_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON orders(user_id, order_date);

CREATE TABLE IF NOT EXISTS stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    nm_id BIGINT NOT NULL,
    supplier_article TEXT NOT NULL DEFAULT '',
    tech_size TEXT NOT NULL DEFAULT '',
    barcode TEXT NOT NULL DEFAULT '',
    warehouse_name TEXT NOT NULL DEFAULT '',
    quantity INT NOT NULL DEFAULT 0,
    quantity_full INT NOT NULL DEFAULT 0,
    quantity_not_in_orders INT NOT NULL DEFAULT 0,
    in_way_to_client INT NOT NULL DEFAULT 0,
    in_way_from_client INT NOT NULL DEFAULT 0,
    subject TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    brand TEXT NOT NULL DEFAULT '',
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_change_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stocks_user_nm ON stocks(user_id, nm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_upsert
    ON stocks(user_id, nm_id, warehouse_name, tech_size, barcode);

CREATE TABLE IF NOT EXISTS sync_status (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    wb_api_key TEXT NOT NULL DEFAULT '',
    last_sync_at TIMESTAMPTZ,
    sales_count INT NOT NULL DEFAULT 0,
    orders_count INT NOT NULL DEFAULT 0,
    stocks_count INT NOT NULL DEFAULT 0
);
