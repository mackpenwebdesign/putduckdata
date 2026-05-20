import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

const CACHE = new Map();
const TTL = 3 * 60 * 1000;

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

    const period = parseInt(event.queryStringParameters?.period) || 30;
    const cacheKey = `leaderboard:${period}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL) {
      return successResponse(200, { leaderboard: cached.data, period });
    }

    const isAdmin = users[0].is_admin;

    const rows = await executeQuery(
      `SELECT u.id,
              CASE WHEN u.id = $3 OR $4 THEN u.full_name ELSE 'Reseller #' || u.id END AS name,
              COUNT(t.id)              AS order_count,
              COALESCE(SUM(t.amount), 0) AS revenue
       FROM users u
       LEFT JOIN transactions t ON t.reseller_id = u.id
         AND t.status IN ('success','completed')
         AND t.created_at >= CURRENT_DATE - INTERVAL '${period} days'
       WHERE u.is_reseller = true
       GROUP BY u.id, u.full_name
       ORDER BY order_count DESC, revenue DESC
       LIMIT 20`,
      [auth.user.id, auth.user.id, auth.user.id, isAdmin]
    );

    const leaderboard = rows.map((r, i) => ({
      rank:        i + 1,
      name:        r.name,
      is_you:      r.id === auth.user.id,
      order_count: parseInt(r.order_count || 0),
      revenue:     parseFloat(r.revenue || 0),
    }));

    CACHE.set(cacheKey, { ts: Date.now(), data: leaderboard });
    return successResponse(200, { leaderboard, period });
  } catch (err) {
    console.error('reseller-leaderboard error:', err);
    return errorResponse(500, 'Failed to load leaderboard');
  }
};
