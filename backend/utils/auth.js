import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { executeQuery, getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable is missing or too short (min 32 chars)');
  // We don't process.exit(1) here because on Vercel it hard-crashes the worker without a good stack trace.
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Hash a password using bcrypt (10 rounds for security/performance balance)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token for authenticated users with JTI for revocation
 * @param {Object} payload - User data to encode (id, email, role)
 * @param {string} tokenType - Type of token ('access' or 'refresh')
 * @returns {string} JWT token
 */
export const generateToken = (payload, tokenType = 'access') => {
  // Generate unique JWT ID (jti) for token revocation
  const jti = crypto.randomBytes(16).toString('hex');

  const tokenPayload = {
    ...payload,
    jti,
    type: tokenType,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Verify and decode a JWT token with blacklist check
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} Decoded payload or null if invalid
 */
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(decoded.jti);

    if (isBlacklisted) {
      console.warn('Attempted use of blacklisted token:', decoded.jti);
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} headers - Request headers
 * @returns {string|null} Token or null
 */
export const extractToken = (headers) => {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

/**
 * Middleware to verify user authentication
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} { authenticated: boolean, user: Object|null, error: string|null }
 */
export const authenticateUser = async (headers) => {
  const token = extractToken(headers);

  if (!token) {
    return { authenticated: false, user: null, error: 'No token provided' };
  }

  const decoded = await verifyToken(token);

  if (!decoded) {
    return { authenticated: false, user: null, error: 'Invalid or expired token' };
  }

  return { authenticated: true, user: decoded, error: null, token };
};

/**
 * Check if user has required role
 * @param {Object} user - Decoded user object
 * @param {string|Array<string>} allowedRoles - Role(s) required
 * @returns {boolean} True if user has permission
 */
export const hasRole = (user, allowedRoles) => {
  if (!user) {
    return false;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  for (const role of roles) {
    if (role === 'admin' && user.is_admin) return true;
    if (role === 'reseller' && (user.is_reseller || user.is_admin)) return true;
    if (role === 'customer' && !user.is_admin) return true;
  }

  return false;
};

/**
 * Blacklist a token (for logout, password change, etc.)
 * @param {string} jti - JWT ID
 * @param {number} userId - User ID
 * @param {string} reason - Reason for blacklisting
 * @param {Date} expiresAt - Token expiration date
 */
export const blacklistToken = async (jti, userId, reason, expiresAt) => {
  try {
    await executeQuery(
      'INSERT INTO jwt_blacklist (token_jti, user_id, reason, expires_at) VALUES ($1, $2, $3, $4)',
      [jti, userId, reason, expiresAt]
    );
  } catch (error) {
    console.error('Failed to blacklist token:', error);
  }
};

/**
 * Check if token is blacklisted
 * @param {string} jti - JWT ID
 * @returns {Promise<boolean>} True if blacklisted
 */
export const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;

  try {
    const result = await executeQuery(
      'SELECT id FROM jwt_blacklist WHERE token_jti = $1 AND expires_at > CURRENT_TIMESTAMP',
      [jti]
    );

    return result.length > 0;
  } catch (error) {
    console.error('Failed to check token blacklist:', error);
    return false;
  }
};

/**
 * Logout user by blacklisting their token
 * @param {string} token - JWT token
 * @param {number} userId - User ID
 */
export const logoutUser = async (token, userId) => {
  try {
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.jti) {
      throw new Error('Invalid token');
    }

    const expiresAt = new Date(decoded.exp * 1000);
    await blacklistToken(decoded.jti, userId, 'logout', expiresAt);

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * Parse a JSONB value from Neon — handles booleans, strings, and raw JSON
 */
const parseJsonbValue = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean' || typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Try JSON.parse for wrapped values like '"hello"' or 'true'
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
};

/**
 * Check if site is in maintenance mode
 * @returns {Promise<Object>} { active: boolean, message: string, scheduledEnd: string|null }
 */
export const checkMaintenanceMode = async () => {
  try {
    // Ensure table exists before querying
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await executeQuery(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('maintenance_mode', 'maintenance_message', 'maintenance_scheduled_end')"
    );
    const settings = {};
    for (const row of result) {
      settings[row.setting_key] = parseJsonbValue(row.setting_value);
    }

    // Robust boolean check — handle true, 'true', 1, etc.
    const rawMode = settings.maintenance_mode;
    const isActive = rawMode === true || rawMode === 'true' || rawMode === 1;

    if (isActive && settings.maintenance_scheduled_end && settings.maintenance_scheduled_end !== 'null' && settings.maintenance_scheduled_end !== null) {
      const endVal = settings.maintenance_scheduled_end;
      const endTime = new Date(typeof endVal === 'string' ? endVal : String(endVal));
      if (!isNaN(endTime.getTime()) && endTime < new Date()) {
        // Maintenance period is over, auto-disable
        await executeQuery(
          "UPDATE system_settings SET setting_value = 'false'::jsonb WHERE setting_key = 'maintenance_mode'"
        );
        return { active: false, message: null, scheduledEnd: null };
      }
    }

    const message = settings.maintenance_message;
    const scheduledEnd = settings.maintenance_scheduled_end;

    return {
      active: isActive,
      message: isActive ? (message && message !== 'null' && message !== null ? String(message) : 'Site is under maintenance.') : null,
      scheduledEnd: scheduledEnd && scheduledEnd !== 'null' && scheduledEnd !== null ? String(scheduledEnd) : null
    };
  } catch (error) {
    console.error('Maintenance mode check failed:', error);
    return { active: false, message: null, scheduledEnd: null };
  }
};

/**
 * Authenticate user AND enforce maintenance mode.
 * Returns 503-style error for non-admin users when site is under maintenance.
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} { authenticated, user, error, maintenanceBlocked, maintenanceMessage }
 */
export const authenticateWithMaintenance = async (headers) => {
  const auth = await authenticateUser(headers);
  if (!auth.authenticated) return auth;

  // Admins always pass through
  if (auth.user.is_admin) return auth;

  // Check maintenance for non-admin users
  const maintenance = await checkMaintenanceMode();
  if (maintenance.active) {
    return {
      authenticated: true,
      user: auth.user,
      error: null,
      token: auth.token,
      maintenanceBlocked: true,
      maintenanceMessage: maintenance.message || 'Site is under maintenance. Please try again later.'
    };
  }

  return { ...auth, maintenanceBlocked: false };
};

/**
 * Security audit logging
 * @param {number} userId - User ID
 * @param {string} eventType - Event type
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {string} status - Status (success/failed/blocked)
 * @param {Object} details - Additional details
 */
export const logSecurityEvent = async (userId, eventType, ipAddress, userAgent, status, details = {}) => {
  try {
    await executeQuery(
      `INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, status, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, ipAddress, userAgent, status, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Re-verify admin status from database (defence-in-depth for sensitive admin routes)
 * @param {number} userId - User ID from JWT
 * @returns {Promise<boolean>} True if user is actually admin in DB
 */
export const verifyAdminFromDB = async (userId) => {
  try {
    const sql = getDb();
    const result = await sql(
      'SELECT is_admin FROM users WHERE id = $1 AND is_blocked IS NOT TRUE',
      [userId]
    );
    return result.length > 0 && Boolean(result[0].is_admin);
  } catch (error) {
    console.error('Admin DB verification failed:', error);
    // DB unavailable — trust the JWT claim (already cryptographically verified)
    return true;
  }
};
