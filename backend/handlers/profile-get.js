import { authenticateUser } from '../utils/auth.js';
import { executeQuery } from '../utils/db.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';

/**
 * Get User Profile
 * GET /api/profile-get
 *
 * Returns complete profile information for authenticated user
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Get complete user profile
    const users = await executeQuery(
      `SELECT id, full_name, email, is_admin, country, wallet_balance,
              created_at
       FROM users
       WHERE id = $1`,
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, 'User not found');
    }

    const user = users[0];

    // Get transaction statistics
    const stats = await executeQuery(
      `SELECT
         COUNT(*) as total_transactions,
         SUM(CASE WHEN type = 'wallet_fund' AND status = 'success' THEN amount ELSE 0 END) as total_funded,
         SUM(CASE WHEN type = 'data_purchase' AND status = 'success' THEN amount ELSE 0 END) as total_spent
       FROM transactions
       WHERE user_id = $1`,
      [auth.user.id]
    );

    return successResponse(200, {
      profile: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_admin: user.is_admin,
        country: user.country,
        wallet_balance: parseFloat(user.wallet_balance),
        created_at: user.created_at
      },
      statistics: {
        total_transactions: parseInt(stats[0]?.total_transactions) || 0,
        total_funded: parseFloat(stats[0]?.total_funded) || 0,
        total_spent: parseFloat(stats[0]?.total_spent) || 0
      }
    });

  } catch (error) {
    console.error('Profile get error:', error);
    return errorResponse(500, 'Failed to retrieve profile');
  }
};
