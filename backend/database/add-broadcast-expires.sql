-- Auto-expire broadcasts after 24hrs
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Update view
DROP VIEW IF EXISTS active_broadcasts;
CREATE OR REPLACE VIEW active_broadcasts AS
SELECT id, title, message, url, targets, is_active, created_at
FROM broadcasts
WHERE is_active = true 
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
ORDER BY created_at DESC 
LIMIT 5;

-- Backfill: Set existing to expire in 24hrs
UPDATE broadcasts 
SET expires_at = created_at + INTERVAL '24 hours' 
WHERE expires_at IS NULL AND is_active = true;

COMMENT ON COLUMN broadcasts.expires_at IS 'Auto-expires 24hrs after created_at';

