import crypto from 'crypto';

/**
 * Generate secure random token
 * @param {number} bytes - Number of bytes (default 32)
 * @returns {string} Hex token
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token for storage (one-way)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate password reset token
 * @returns {Object} { token, hashedToken, expiresAt }
 */
export const generatePasswordResetToken = () => {
  const token = generateSecureToken(32);
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return { token, hashedToken, expiresAt };
};

/**
 * Verify token hasn't expired
 * @param {Date} expiresAt - Expiration date
 * @returns {boolean} True if still valid
 */
export const isTokenValid = (expiresAt) => {
  return new Date() < new Date(expiresAt);
};
