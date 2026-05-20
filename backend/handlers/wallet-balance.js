import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Get Wallet Balance
 * GET /api/wallet-balance
 *
 * Returns current user's wallet balance
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
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Get wallet balance
    const users = await executeQuery(
      'SELECT wallet_balance FROM users WHERE id = $1',
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, 'User not found');
    }

    return successResponse(200, {
      balance: parseFloat(users[0].wallet_balance)
    });

  } catch (error) {
    console.error('Wallet balance error:', error);
    return errorResponse(500, 'Failed to retrieve wallet balance');
  }
};
