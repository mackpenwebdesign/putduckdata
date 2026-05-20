import { authenticateUser, hasRole, verifyAdminFromDB } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');
    if (!hasRole(auth.user, 'admin')) return errorResponse(403, 'Admin access required');
    if (!(await verifyAdminFromDB(auth.user.id))) return errorResponse(403, 'Admin access required');

    // GET — list all resellers OR get plans for a specific reseller
    if (event.httpMethod === 'GET') {
      const { reseller_id } = event.queryStringParameters || {};

      if (!reseller_id) {
        const rows = await executeQuery(
          `SELECT id, full_name, email, referral_code
           FROM users WHERE is_reseller = true OR is_admin = true ORDER BY full_name`
        );
        return successResponse(200, { resellers: rows });
      }

      const plans = await executeQuery(
        `SELECT dp.id, dp.network, dp.plan_name, dp.data_volume, dp.validity_days,
                dp.price AS platform_price,
                rco.cost_price AS admin_base_price,
                rp.custom_price AS reseller_custom_price
         FROM data_plans dp
         LEFT JOIN reseller_cost_overrides rco
           ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
         LEFT JOIN reseller_pricing rp
           ON rp.data_plan_id = dp.id AND rp.reseller_id = $1 AND rp.is_active = true
         WHERE dp.is_active = true
         ORDER BY dp.network, dp.price`,
        [reseller_id]
      );

      return successResponse(200, {
        plans: plans.map((p) => ({
          id: p.id,
          network: p.network,
          plan_name: p.plan_name,
          data_volume: p.data_volume,
          validity_days: p.validity_days,
          platform_price: parseFloat(p.platform_price || 0),
          admin_base_price: p.admin_base_price !== null ? parseFloat(p.admin_base_price) : null,
          reseller_custom_price: p.reseller_custom_price !== null ? parseFloat(p.reseller_custom_price) : null,
        })),
      });
    }

    // POST — set admin base price, or reset to platform default
    if (event.httpMethod === 'POST') {
      const { reseller_id, data_plan_id, base_price, reset } = JSON.parse(event.body || '{}');

      if (!reseller_id || !data_plan_id) {
        return errorResponse(400, 'reseller_id and data_plan_id are required');
      }

      if (reset) {
        await executeQuery(
          `DELETE FROM reseller_cost_overrides WHERE reseller_id = $1 AND data_plan_id = $2`,
          [reseller_id, data_plan_id]
        );
        return successResponse(200, null, 'Price reset to platform default');
      }

      const price = parseFloat(base_price);
      if (isNaN(price) || price < 0) {
        return errorResponse(400, 'base_price must be 0 or a positive number');
      }

      // Try upsert; if no unique constraint, fall back to delete + insert
      try {
        await executeQuery(
          `INSERT INTO reseller_cost_overrides (reseller_id, data_plan_id, cost_price)
           VALUES ($1, $2, $3)
           ON CONFLICT (reseller_id, data_plan_id)
           DO UPDATE SET cost_price = EXCLUDED.cost_price`,
          [reseller_id, data_plan_id, price]
        );
      } catch {
        await executeQuery(
          `DELETE FROM reseller_cost_overrides WHERE reseller_id = $1 AND data_plan_id = $2`,
          [reseller_id, data_plan_id]
        );
        await executeQuery(
          `INSERT INTO reseller_cost_overrides (reseller_id, data_plan_id, cost_price)
           VALUES ($1, $2, $3)`,
          [reseller_id, data_plan_id, price]
        );
      }

      return successResponse(200, { reseller_id, data_plan_id, base_price: price }, 'Base price updated');
    }

    return errorResponse(405, 'Method not allowed');
  } catch (err) {
    console.error('admin-reseller-pricing error:', err);
    return errorResponse(500, 'Failed to manage reseller pricing');
  }
};
