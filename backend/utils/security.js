import crypto from 'crypto';

/**
 * Security utilities for rate limiting, IP tracking, and request validation
 */

// In-memory rate limiting store (use Redis in production for distributed systems)
const rateLimitStore = new Map();
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX) || 60; // requests per minute

/**
 * Simple rate limiter
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed per minute
 * @returns {Object} { allowed: boolean, remaining: number }
 */
export const checkRateLimit = (identifier, maxRequests = MAX_REQUESTS) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  const record = rateLimitStore.get(identifier);

  // Reset if window expired
  if (now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Increment count
  record.count++;

  if (record.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - record.count };
};

/**
 * Extract client IP from request headers
 * @param {Object} headers - Request headers
 * @returns {string} Client IP address
 */
export const getClientIp = (headers) => {
  // Check common headers used by proxies and CDNs
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return headers['x-real-ip'] ||
         headers['client-ip'] ||
         'unknown';
};

/**
 * Validate request origin to prevent CSRF
 * @param {Object} headers - Request headers
 * @param {Array<string>} allowedOrigins - List of allowed origins
 * @returns {boolean} True if origin is allowed
 */
export const validateOrigin = (headers, allowedOrigins = []) => {
  if (process.env.NODE_ENV === 'development') {
    return true; // Allow all in development
  }

  const origin = headers.origin || headers.referer;

  if (!origin) {
    return false; // Reject requests without origin
  }

  return allowedOrigins.some(allowed => origin.startsWith(allowed));
};

/**
 * Generate a unique reference for transactions
 * @param {string} prefix - Prefix for the reference
 * @returns {string} Unique reference
 */
export const generateReference = (prefix = 'TXN') => {
  const random = crypto.randomBytes(5).toString('hex'); // 10 hex chars
  return `${prefix}-${random}`.toUpperCase();
};

/**
 * Mask sensitive data for logging
 * @param {string} data - Sensitive data
 * @param {number} visibleChars - Number of characters to show
 * @returns {string} Masked data
 */
export const maskSensitiveData = (data, visibleChars = 4) => {
  if (!data || data.length <= visibleChars) {
    return '***';
  }

  const visible = data.slice(-visibleChars);
  return '*'.repeat(data.length - visibleChars) + visible;
};

/**
 * Clean up expired rate limit records (call periodically)
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Auto cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
