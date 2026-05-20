import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Verify JWT Token & Get User Info
 * GET /api/auth-verify
 *
 * Used to verify if a user's token is still valid and get fresh user data
 * Useful for persistent login and role verification
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication failed');
    }

    // Fetch fresh user data from database
    const users = await executeQuery(
      'SELECT id, full_name, email, is_admin, is_reseller, referral_code, wallet_balance, created_at FROM users WHERE id = $1',
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, 'User not found');
    }

    const user = users[0];

    return successResponse(200, {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_admin: user.is_admin,
        is_reseller: user.is_reseller,
        referral_code: user.referral_code,
        wallet_balance: parseFloat(user.wallet_balance),
        created_at: user.created_at
      }
    }, 'Token is valid');

  } catch (error) {
    console.error('Token verification error:', error);
    return errorResponse(500, 'Verification failed');
  }
};
