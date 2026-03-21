CREATE TABLE IF NOT EXISTS keyword_positions (
    id BIGSERIAL PRIMARY KEY,
    nm_id BIGINT NOT NULL,
    keyword TEXT NOT NULL,
    position INT NOT NULL,
    page INT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kw_pos_nm_kw ON keyword_positions(nm_id, keyword);
CREATE INDEX IF NOT EXISTS idx_kw_pos_checked ON keyword_positions(checked_at);

-- Auto-cleanup: keep only 90 days of history
-- (enforced in application code on read/write)
