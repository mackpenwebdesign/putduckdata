/**
 * Comprehensive Security Middleware
 */

import { getClientIp } from "./security.js";
import { executeQuery } from "./db.js";

/**
 * Check if account is locked
 * @param {string} email - User email
 * @returns {Promise<Object>} { locked: boolean, until: Date|null }
 */
export const isAccountLocked = async (email) => {
  try {
    const locks = await executeQuery(
      `SELECT locked_until FROM account_lockouts
       WHERE email = $1 AND locked_until > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (locks.length > 0) {
      return { locked: true, until: locks[0].locked_until };
    }

    return { locked: false, until: null };
  } catch (error) {
    console.error("Lock check error:", error);
    return { locked: false, until: null };
  }
};

/**
 * Record failed login attempt
 * @param {string} email - User email
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 */
export const recordFailedLogin = async (email, ipAddress, userAgent) => {
  try {
    await executeQuery(
      "INSERT INTO failed_login_attempts (email, ip_address, user_agent) VALUES ($1, $2, $3)",
      [email, ipAddress, userAgent]
    );

    // Check if should lock account
    const recentAttempts = await executeQuery(
      `SELECT COUNT(*) as count FROM failed_login_attempts
       WHERE email = $1 AND attempt_time > CURRENT_TIMESTAMP - INTERVAL '15 minutes'`,
      [email]
    );

    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

    if (parseInt(recentAttempts[0].count) >= maxAttempts) {
      // Lock account for 15 minutes
      await executeQuery(
        `INSERT INTO account_lockouts (email, locked_until, reason)
         VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '15 minutes', 'too_many_failed_attempts')`,
        [email]
      );

      return true; // Account locked
    }

    return false;
  } catch (error) {
    console.error("Failed login recording error:", error);
    return false;
  }
};

/**
 * Clear failed login attempts after successful login
 * @param {string} email - User email
 */
export const clearFailedLogins = async (email) => {
  try {
    await executeQuery("DELETE FROM failed_login_attempts WHERE email = $1", [
      email,
    ]);
  } catch (error) {
    console.error("Clear failed logins error:", error);
  }
};

/**
 * HTTPS-only enforcement (for production)
 * @param {Object} headers - Request headers
 * @returns {boolean} True if HTTPS or development
 */
export const enforceHTTPS = (headers) => {
  if (process.env.NODE_ENV !== "production") {
    return true; // Allow HTTP in development
  }

  const protocol = headers["x-forwarded-proto"] || headers["protocol"];
  return protocol === "https";
};

/**
 * Content Security Policy headers
 */
export const getSecurityHeaders = () => {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.paystack.co https://*.neon.tech; frame-src https://checkout.paystack.com;",
  };
};

/**
 * Sanitize error messages (remove sensitive data)
 * @param {Error} error - Error object
 * @returns {string} Safe error message
 */
export const sanitizeErrorMessage = (error) => {
  const message = error.message || "An error occurred";

  // Remove database connection strings
  const sanitized = message
    .replace(/postgresql:\/\/[^\s]+/gi, "postgresql://***")
    .replace(/password[=:]\s*[^\s]+/gi, "password=***")
    .replace(/secret[=:]\s*[^\s]+/gi, "secret=***")
    .replace(/token[=:]\s*[^\s]+/gi, "token=***")
    .replace(/key[=:]\s*[^\s]+/gi, "key=***");

  // In production, use generic messages
  if (process.env.NODE_ENV === "production") {
    return "An error occurred while processing your request";
  }

  return sanitized;
};

/**
 * Validate request origin (CORS)
 * @param {Object} headers - Request headers
 * @returns {boolean} True if origin is allowed
 */
export const validateRequestOrigin = (headers) => {
  if (process.env.NODE_ENV !== "production") {
    return true; // Allow all in development
  }

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://putduckdata.com",
  ].filter(Boolean);

  const origin = headers.origin || headers.referer;

  if (!origin) {
    return false;
  }

  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
};

/**
 * Known bot/crawler user agent patterns
 */
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /perl/i,
  /libwww/i,
  /lwp-trivial/i,
  /httpunit/i,
  /nutch/i,
  /phpcrawl/i,
  /biglotron/i,
  /teoma/i,
  /convera/i,
  /gigablast/i,
  /ia_archiver/i,
  /webmon/i,
  /httrack/i,
  /grub\.org/i,
  /netresearchserver/i,
  /speedy/i,
  /fluffy/i,
  /findlink/i,
  /panscient/i,
  /iodc/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /axios\/0/i,
  /node-fetch/i,
  /HeadlessChrome/i,
  /PhantomJS/i,
  /Selenium/i,
  /puppeteer/i,
];

/**
 * Detect if request is from a bot/crawler
 * @param {Object} headers - Request headers
 * @returns {boolean} True if likely a bot
 */
export const isBot = (headers) => {
  const userAgent = headers["user-agent"] || "";

  // No user agent is suspicious
  if (!userAgent || userAgent.length < 10) {
    return true;
  }

  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
};

/**
 * Check request for suspicious patterns (script injection attempts)
 * @param {string} body - Request body string
 * @returns {boolean} True if suspicious
 */
export const hasSuspiciousPayload = (body) => {
  if (!body || typeof body !== "string") return false;

  const suspiciousPatterns = [
    /<script/i,
    /javascript\s*:/i,
    /on\w+\s*=\s*['"]/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /document\.write/i,
    /window\.location/i,
    /\.innerHTML\s*=/i,
    /fromCharCode/i,
    /&#x?[0-9a-f]+;/i, // HTML entities used for evasion
    /\x00/, // Null bytes
    /\bSELECT\b.*\bFROM\b/i, // SQL injection
    /\bUNION\b.*\bSELECT\b/i,
    /\bDROP\b.*\bTABLE\b/i,
    /\b(OR|AND)\b\s+\d+\s*=\s*\d+/i, // SQL tautology
    /'\s*(OR|AND)\s+'.*'/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(body));
};

/**
 * Validate request size to prevent memory exhaustion
 * @param {string} body - Request body
 * @param {number} maxSize - Maximum body size in bytes (default 1MB)
 * @returns {boolean} True if within limits
 */
export const isBodySizeValid = (body, maxSize = 1048576) => {
  if (!body) return true;
  return Buffer.byteLength(body, "utf8") <= maxSize;
};

/**
 * Validate request timestamp to prevent request replay attacks.
 * Clients should include X-Request-Timestamp header (Unix ms).
 * Requests older than 5 minutes or with future timestamps > 1 min are rejected.
 * @param {Object} headers - Request headers
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateRequestTimestamp = (headers) => {
  const tsHeader = headers["x-request-timestamp"];
  if (!tsHeader) return { valid: true, error: null }; // optional header — skip if absent

  const ts = parseInt(tsHeader, 10);
  if (isNaN(ts)) return { valid: false, error: "Invalid X-Request-Timestamp" };

  const now = Date.now();
  const diff = now - ts;

  if (diff > 5 * 60 * 1000)
    return {
      valid: false,
      error: "Request timestamp too old — possible replay attack",
    };
  if (diff < -60 * 1000)
    return { valid: false, error: "Request timestamp is in the future" };

  return { valid: true, error: null };
};
