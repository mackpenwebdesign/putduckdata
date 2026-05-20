-- Migration: Add broadcasts table for admin popup messages
-- Run: psql -f add-broadcasts-table.sql DATABASE_URL

-- Broadcasts table (1 row per broadcast, efficient for all users/guests)
CREATE TABLE IF NOT EXISTS broadcasts (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    url         TEXT,  -- Optional clickable URL/link
    targets     VARCHAR(50) NOT NULL DEFAULT 'all',  -- 'all' | 'users' | 'guests'
    is_active   BOOLEAN DEFAULT true,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON broadcasts(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcasts_targets ON broadcasts(targets);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at DESC);

-- View for active broadcasts (for API)
CREATE OR REPLACE VIEW active_broadcasts AS
SELECT id, title, message, url, targets, is_active, created_at
FROM broadcasts
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

COMMENT ON TABLE broadcasts IS 'Admin broadcasts shown as popups to users/guests';

