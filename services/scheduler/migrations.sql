-- Scheduler needs the alerts table to exist (shared with notifications service)
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

-- Scheduler needs tracked_keywords table
CREATE TABLE IF NOT EXISTS tracked_keywords (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    nm_id BIGINT NOT NULL,
    keyword TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    check_interval_min INT NOT NULL DEFAULT 240,
    alert_threshold INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ,
    last_position INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, nm_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_tracked_kw_active ON tracked_keywords(is_active, last_checked_at);

-- Scheduler writes position history
CREATE TABLE IF NOT EXISTS keyword_positions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 0,
    nm_id BIGINT NOT NULL,
    keyword TEXT NOT NULL,
    position INT NOT NULL,
    page INT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kw_pos_nm_kw ON keyword_positions(nm_id, keyword);
CREATE INDEX IF NOT EXISTS idx_kw_pos_checked ON keyword_positions(checked_at);
