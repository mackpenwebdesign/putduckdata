import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');

    const users = await executeQuery(
      'SELECT is_reseller, is_admin FROM users WHERE id = $1',
      [auth.user.id]
    );
    if (!users.length) return errorResponse(404, 'User not found');
    if (!users[0].is_reseller && !users[0].is_admin) return errorResponse(403, 'Reseller access required');

    const params = event.queryStringParameters || {};
    const limit  = Math.min(parseInt(params.limit) || 50, 100);
    const offset = parseInt(params.offset) || 0;

    const customers = await executeQuery(
      `SELECT u.id, u.full_name, u.email, u.created_at,
              COUNT(t.id)                              AS total_orders,
              COALESCE(SUM(t.amount), 0)              AS total_spent,
              MAX(t.created_at)                       AS last_order_at
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       LEFT JOIN transactions t ON t.user_id = u.id AND t.reseller_id = $1
         AND t.status IN ('success','completed')
       WHERE r.referrer_id = $1
       GROUP BY u.id, u.full_name, u.email, u.created_at
       ORDER BY last_order_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [auth.user.id, limit, offset]
    );

    const total = await executeQuery(
      'SELECT COUNT(*) AS count FROM referrals WHERE referrer_id = $1',
      [auth.user.id]
    );

    return successResponse(200, {
      customers: customers.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        joined_at: c.created_at,
        total_orders: parseInt(c.total_orders || 0),
        total_spent:  parseFloat(c.total_spent || 0),
        last_order_at: c.last_order_at,
      })),
      pagination: {
        total: parseInt(total[0]?.count || 0),
        limit,
        offset,
        has_more: offset + limit < parseInt(total[0]?.count || 0),
      },
    });
  } catch (err) {
    console.error('reseller-customers error:', err);
    return errorResponse(500, 'Failed to load customers');
  }
};
