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
CREATE INDEX IF NOT EXISTS idx_kw_pos_user ON keyword_positions(user_id, nm_id);

-- Backfill user_id if column was added later
DO $$ BEGIN
    ALTER TABLE keyword_positions ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Tracked keywords: scheduler checks these on a CRON schedule
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
CREATE INDEX IF NOT EXISTS idx_tracked_kw_user ON tracked_keywords(user_id);

-- Auto-cleanup: keep only 90 days of position history
-- (enforced in application code on read/write)
