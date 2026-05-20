-- ADDITIONAL SCHEMA FOR NOTIFICATIONS, JWT, AND SECURITY
-- Run this AFTER the main schema.sql

-- ================================
-- NOTIFICATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ================================
-- JWT BLACKLIST (For token revocation)
-- ================================
CREATE TABLE IF NOT EXISTS jwt_blacklist (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR(100) UNIQUE NOT NULL, -- JWT ID (jti claim)
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100), -- 'logout', 'password_change', 'security'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_jti ON jwt_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires ON jwt_blacklist(expires_at);

-- Auto-cleanup expired tokens (run periodically)
-- DELETE FROM jwt_blacklist WHERE expires_at < CURRENT_TIMESTAMP;

-- ================================
-- SECURITY AUDIT LOG
-- ================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'login_attempt', 'password_change', 'role_change', etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20), -- 'success', 'failed', 'blocked'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at);

-- ================================
-- UPDATE USERS TABLE
-- ================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
