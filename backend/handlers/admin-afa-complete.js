import { authenticateUser, hasRole } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';
import { createNotification } from '../utils/notifications.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');
    if (!hasRole(auth.user, 'admin')) return errorResponse(403, 'Admin access required');

    // ── GET: list AFA orders ──────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const statusFilter = params.status || 'all';

      let whereClause = "WHERE t.type = 'afa_registration'";
      const queryParams = [];

      if (statusFilter === 'pending_form') {
        whereClause += " AND t.status = 'success' AND (t.metadata->>'delivery_status' IS NULL OR t.metadata->>'delivery_status' = '')";
      } else if (statusFilter === 'ongoing') {
        whereClause += " AND t.metadata->>'delivery_status' = 'ongoing'";
      } else if (statusFilter === 'completed') {
        whereClause += " AND t.status = 'completed'";
      }

      const orders = await executeQuery(
        `SELECT t.id, t.user_id, t.amount, t.status, t.metadata, t.reference, t.created_at, t.updated_at,
                u.full_name AS user_name, u.email AS user_email
         FROM transactions t
         LEFT JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT 100`,
        queryParams
      );

      return successResponse(200, { orders });
    }

    // ── POST: mark complete ───────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { transaction_id, credentials_note } = body;

      if (!transaction_id) return errorResponse(400, 'transaction_id is required');

      const rows = await executeQuery(
        `SELECT id, user_id, status, metadata FROM transactions
         WHERE id = $1 AND type = 'afa_registration'`,
        [transaction_id]
      );

      if (!rows.length) return errorResponse(404, 'AFA order not found');
      const tx = rows[0];

      if (tx.status === 'completed') return errorResponse(409, 'Order already marked complete');

      const adminRows = await executeQuery('SELECT full_name FROM users WHERE id = $1', [auth.user.id]);
      const adminName = adminRows[0]?.full_name || 'Admin';

      await executeQuery(
        `UPDATE transactions
         SET status = 'completed',
             metadata = metadata || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify({
          delivery_status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: adminName,
          credentials_note: credentials_note || '',
        }), transaction_id]
      );

      if (tx.user_id) {
        await createNotification(
          tx.user_id, 'broadcast',
          'AFA Registration Complete',
          `Your AFA registration has been processed. Dial *1848# to verify eligibility. ${credentials_note ? `Note: ${credentials_note}` : ''}`,
          { transaction_id }
        );
      }

      return successResponse(200, null, 'AFA order marked as complete');
    }

    return errorResponse(405, 'Method not allowed');
  } catch (err) {
    console.error('Admin AFA complete error:', err);
    return errorResponse(500, 'Operation failed');
  }
};
