import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { authenticateUser } from "../utils/auth.js";

/**
 * Get Available Data Plans
 * GET /api/data-plans?network=MTN
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET")
    return errorResponse(405, "Method not allowed");

  try {
    const network = event.queryStringParameters?.network;

    // Determine if requester is reseller/admin to show reseller_price
    let isReseller = false;
    let isAdmin = false;
    let authUserId = null;
    try {
      const auth = await authenticateUser(event.headers);
      if (auth.authenticated) {
        isAdmin = auth.user.is_admin;
        authUserId = auth.user.id;
        if (!isAdmin) {
          const userRows = await executeQuery(
            "SELECT is_reseller FROM users WHERE id = $1",
            [auth.user.id]
          );
          isReseller = userRows[0]?.is_reseller || false;
        }
      }
    } catch {
      /* unauthenticated — fine */
    }

    // For resellers, show the global reseller_price set by admin
    let query;
    const params = [];
    if (isReseller && authUserId) {
      query = `
        SELECT
          dp.id,
          dp.network,
          dp.plan_name,
          dp.data_volume,
          COALESCE(dp.validity_days, 30) AS validity_days,
          dp.reseller_price AS price,
          dp.cost_price,
          dp.reseller_price,
          dp.reseller_pro_price,
          dp.provider_plan_id,
          dp.volume_mb
        FROM data_plans dp
        WHERE dp.is_active = true
      `;
    } else {
      query = `
        SELECT
          id,
          network,
          plan_name,
          data_volume,
          COALESCE(validity_days, 30) AS validity_days,
          price,
          cost_price,
          reseller_price,
          reseller_pro_price,
          provider_plan_id,
          volume_mb
        FROM data_plans
        WHERE is_active = true
      `;
    }

    if (network) {
      const validNetworks = ["MTN", "TELECEL", "AIRTEL_TIGO"];
      if (!validNetworks.includes(network.toUpperCase())) {
        return errorResponse(
          400,
          "Invalid network. Must be MTN, TELECEL, or AIRTEL_TIGO"
        );
      }
      query += ` AND network = $${params.length + 1}`;
      params.push(network.toUpperCase());
    }

    query += " ORDER BY network, price ASC";

    const plans = await executeQuery(query, params);

    const groupedPlans = plans.reduce((acc, plan) => {
      if (!acc[plan.network]) acc[plan.network] = [];
      const entry = {
        id: plan.id,
        plan_name: plan.plan_name,
        data_volume: plan.data_volume,
        validity_days: plan.validity_days,
        price: parseFloat(plan.price || 0),
        provider_plan_id: plan.provider_plan_id,
        volume_mb: plan.volume_mb,
      };
      if (isReseller || isAdmin) {
        entry.reseller_price = plan.reseller_price
          ? parseFloat(plan.reseller_price)
          : null;
        entry.reseller_pro_price = plan.reseller_pro_price
          ? parseFloat(plan.reseller_pro_price)
          : null;
      }
      if (isAdmin) {
        entry.cost_price = plan.cost_price ? parseFloat(plan.cost_price) : null;
      }
      acc[plan.network].push(entry);
      return acc;
    }, {});

    return successResponse(200, { plans: groupedPlans, total: plans.length });
  } catch (error) {
    console.error("Data plans error:", error);
    return errorResponse(500, "Failed to retrieve data plans");
  }
};
