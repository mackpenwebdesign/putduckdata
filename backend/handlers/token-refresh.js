import { authenticateUser, generateToken } from '../utils/auth.js';
import { executeQuery } from '../utils/db.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';

/**
 * Refresh JWT Token
 * POST /api/token-refresh
 *
 * Generates a new token for authenticated users
 * Useful for extending sessions without re-login
 *
 * Security:
 * - Requires valid existing token
 * - Old token remains valid until expiry
 * - Can implement token rotation if needed
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Get fresh user data from database
    const users = await executeQuery(
      'SELECT id, email, is_admin FROM users WHERE id = $1',
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, 'User not found');
    }

    const user = users[0];

    // Generate new token
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      is_admin: user.is_admin
    });

    // Optional: Blacklist old token for immediate rotation
    // Uncomment if you want stricter security
    // await blacklistToken(auth.user.jti, user.id, 'token_refresh', new Date(auth.user.exp * 1000));

    return successResponse(200, {
      token: newToken,
      expires_in: '7d'
    }, 'Token refreshed successfully');

  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse(500, 'Failed to refresh token');
  }
};
