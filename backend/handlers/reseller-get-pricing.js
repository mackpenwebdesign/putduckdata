import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET")
    return errorResponse(405, "Method not allowed");

  try {
    const params = event.queryStringParameters || {};
    const resellerCode = params.reseller_code;

    // ── PUBLIC: by reseller_code ──────────────────────────────────────────────
    if (resellerCode) {
      const resellerRows = await executeQuery(
        "SELECT id, full_name, reseller_store_name, branding_config, brand_pro_active, branding_enabled FROM users WHERE referral_code = $1 AND (is_reseller = true OR is_admin = true)",
        [resellerCode]
      );
      if (!resellerRows.length)
        return errorResponse(404, "Reseller shop not found");
      const reseller = resellerRows[0];

      const [plans, momoSettings] = await Promise.all([
        executeQuery(
          `SELECT dp.id, dp.network, dp.plan_name, dp.data_volume, dp.validity_days,
                  COALESCE(rp.custom_price, rco.cost_price, dp.price) AS price,
                  rp.custom_price IS NOT NULL AS has_custom_price
           FROM data_plans dp
           LEFT JOIN reseller_pricing rp
             ON rp.data_plan_id = dp.id AND rp.reseller_id = $1 AND rp.is_active = true
           LEFT JOIN reseller_cost_overrides rco
             ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
           WHERE dp.is_active = true
           ORDER BY dp.network, dp.price`,
          [reseller.id]
        ),
        executeQuery(
          `SELECT setting_key, setting_value FROM system_settings
           WHERE setting_key IN ('momo_number','momo_network','momo_account_name')`
        ),
      ]);

      const momo = {};
      for (const row of momoSettings) {
        try {
          momo[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
          momo[row.setting_key] = row.setting_value;
        }
      }

      return successResponse(200, {
        reseller: {
          code: resellerCode,
          name: reseller.reseller_store_name || reseller.full_name,
          branding:
            reseller.brand_pro_active && reseller.branding_enabled
              ? reseller.branding_config
              : null,
        },
        plans: plans.map((p) => ({
          id: p.id,
          network: p.network,
          plan_name: p.plan_name,
          data_volume: p.data_volume,
          validity_days: p.validity_days,
          price: parseFloat(p.price),
        })),
        momo,
      });
    }

    // ── PRIVATE: authenticated reseller pricing table ─────────────────────────
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated)
      return errorResponse(401, "Authentication required");

    const users = await executeQuery(
      "SELECT is_reseller, is_admin FROM users WHERE id = $1",
      [auth.user.id]
    );
    if (!users.length) return errorResponse(404, "User not found");
    if (!users[0].is_reseller && !users[0].is_admin)
      return errorResponse(403, "Reseller access required");

    const plans = await executeQuery(
      `SELECT dp.id, dp.network, dp.plan_name, dp.data_volume, dp.validity_days,
              dp.price AS platform_price,
              COALESCE(rco.cost_price, dp.reseller_price, dp.price) AS your_cost,
              rp.custom_price,
              rp.markup_amount,
              rp.markup_percentage
       FROM data_plans dp
       LEFT JOIN reseller_pricing rp
         ON rp.data_plan_id = dp.id AND rp.reseller_id = $1
       LEFT JOIN reseller_cost_overrides rco
         ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
       WHERE dp.is_active = true
       ORDER BY dp.network, dp.price`,
      [auth.user.id]
    );

    return successResponse(200, {
      plans: plans.map((p) => ({
        id: p.id,
        network: p.network,
        plan_name: p.plan_name,
        data_volume: p.data_volume,
        validity_days: p.validity_days,
        platform_price: parseFloat(p.platform_price || 0),
        your_cost: parseFloat(p.your_cost || 0),
        custom_price: p.custom_price ? parseFloat(p.custom_price) : null,
        markup_amount: p.markup_amount ? parseFloat(p.markup_amount) : null,
        markup_percentage: p.markup_percentage
          ? parseFloat(p.markup_percentage)
          : null,
      })),
    });
  } catch (err) {
    console.error("reseller-get-pricing error:", err);
    return errorResponse(500, "Failed to get pricing");
  }
};
