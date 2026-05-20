import { authenticateUser, hasRole, verifyAdminFromDB } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery, executeTransaction } from '../utils/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');
    if (!hasRole(auth.user, 'admin')) return errorResponse(403, 'Admin access required');
    if (!(await verifyAdminFromDB(auth.user.id))) return errorResponse(403, 'Admin access required');

    // ── PUT: approve or reject a withdrawal request ──────────────────────────
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { withdrawal_id, action, admin_note } = body;

      if (!withdrawal_id || !['approve', 'reject'].includes(action)) {
        return errorResponse(400, 'withdrawal_id and action (approve|reject) are required');
      }

      const rows = await executeQuery(
        'SELECT * FROM withdrawal_requests WHERE id = $1 LIMIT 1',
        [withdrawal_id]
      );
      if (!rows.length) return errorResponse(404, 'Withdrawal request not found');

      const wr = rows[0];
      if (!['pending', 'pending_manual', 'processing'].includes(wr.status)) {
        return errorResponse(400, `Cannot ${action} a request with status: ${wr.status}`);
      }

      if (action === 'approve') {
        await executeTransaction(async (sql) => {
          await sql(
            `UPDATE withdrawal_requests
             SET status = 'completed', admin_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [admin_note || null, auth.user.id, withdrawal_id]
          );
          await sql(
            'UPDATE users SET total_withdrawn = total_withdrawn + $1 WHERE id = $2',
            [parseFloat(wr.amount), wr.user_id]
          );
        });
        return successResponse(200, null, 'Withdrawal approved and marked completed');
      }

      if (action === 'reject') {
        await executeTransaction(async (sql) => {
          await sql(
            `UPDATE withdrawal_requests
             SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [admin_note || null, auth.user.id, withdrawal_id]
          );
          // Refund commission balance
          await sql(
            'UPDATE users SET commission_balance = commission_balance + $1 WHERE id = $2',
            [parseFloat(wr.amount), wr.user_id]
          );
        });
        return successResponse(200, null, 'Withdrawal rejected and amount refunded to reseller');
      }
    }

    if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');

    const [overview, topResellers, pending] = await Promise.all([
      executeQuery(`
        SELECT
          COUNT(*) FILTER (WHERE is_reseller = true) AS total_resellers,
          COUNT(*) FILTER (WHERE brand_pro_active = true) AS brand_pro_count,
          COALESCE(SUM(commission_balance), 0) AS total_pending_commissions,
          COALESCE(SUM(total_withdrawn), 0) AS total_paid_out
        FROM users
      `),
      executeQuery(`
        SELECT u.id, u.full_name, u.email, u.phone_number, u.momo_phone, u.referral_code,
               u.commission_balance, u.total_withdrawn, u.brand_pro_active,
               COUNT(t.id)                AS order_count,
               COALESCE(SUM(t.amount), 0) AS revenue
        FROM users u
        LEFT JOIN transactions t ON t.reseller_id = u.id AND t.status IN ('success','completed')
        WHERE u.is_reseller = true
        GROUP BY u.id, u.full_name, u.email, u.phone_number, u.momo_phone, u.referral_code, u.commission_balance, u.total_withdrawn, u.brand_pro_active
        ORDER BY revenue DESC
        LIMIT 10
      `),
      executeQuery(`
        SELECT wr.id, wr.amount, wr.status, wr.reference, wr.created_at,
               u.full_name, u.email, wr.account_details
        FROM withdrawal_requests wr
        JOIN users u ON u.id = wr.user_id
        WHERE wr.status IN ('pending','pending_manual','processing')
        ORDER BY wr.created_at ASC
        LIMIT 20
      `),
    ]);

    return successResponse(200, {
      overview: {
        total_resellers:          parseInt(overview[0]?.total_resellers || 0),
        brand_pro_count:          parseInt(overview[0]?.brand_pro_count || 0),
        total_pending_commissions: parseFloat(overview[0]?.total_pending_commissions || 0),
        total_paid_out:           parseFloat(overview[0]?.total_paid_out || 0),
      },
      top_resellers: topResellers.map((r) => ({
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        momo_phone: r.momo_phone,
        referral_code: r.referral_code,
        commission_balance: parseFloat(r.commission_balance || 0),
        total_withdrawn: parseFloat(r.total_withdrawn || 0),
        brand_pro: r.brand_pro_active,
        order_count: parseInt(r.order_count || 0),
        revenue: parseFloat(r.revenue || 0),
      })),
      pending_withdrawals: pending.map((w) => ({
        id: w.id,
        full_name: w.full_name,
        email: w.email,
        amount: parseFloat(w.amount),
        status: w.status,
        reference: w.reference,
        account_details: w.account_details,
        created_at: w.created_at,
      })),
    });
  } catch (err) {
    console.error('admin-reseller-stats error:', err);
    return errorResponse(500, 'Failed to load reseller stats');
  }
};
