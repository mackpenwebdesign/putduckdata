import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');

    const userRows = await executeQuery(
      'SELECT is_reseller FROM users WHERE id = $1',
      [auth.user.id]
    );
    if (!userRows.length) return errorResponse(404, 'User not found');
    if (!userRows[0].is_reseller) return errorResponse(403, 'Reseller access required');

    const params = event.queryStringParameters || {};
    const limit  = Math.min(parseInt(params.limit) || 20, 100);
    const offset = parseInt(params.offset) || 0;

    const history = await executeQuery(
      `SELECT id, amount, account_details, status, reference,
              paystack_transfer_code, transfer_error, admin_note, created_at, updated_at
       FROM withdrawal_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [auth.user.id, limit, offset]
    );

    const total = await executeQuery(
      'SELECT COUNT(*) AS count FROM withdrawal_requests WHERE user_id = $1',
      [auth.user.id]
    );

    return successResponse(200, {
      history: history.map((w) => ({
        id: w.id,
        amount: parseFloat(w.amount),
        account_details: w.account_details,
        status: w.status,
        reference: w.reference,
        transfer_code: w.paystack_transfer_code,
        error: w.transfer_error,
        admin_note: w.admin_note,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
      pagination: {
        total: parseInt(total[0]?.count || 0),
        limit,
        offset,
        has_more: offset + limit < parseInt(total[0]?.count || 0),
      },
    });
  } catch (err) {
    console.error('withdrawal-history error:', err);
    return errorResponse(500, 'Failed to load withdrawal history');
  }
};
