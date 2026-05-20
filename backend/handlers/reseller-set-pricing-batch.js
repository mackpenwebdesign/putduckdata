import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
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

    const { prices } = JSON.parse(event.body || "{}");

    if (!Array.isArray(prices) || prices.length === 0) {
      return errorResponse(400, "prices must be a non-empty array");
    }
    if (prices.length > 200) {
      return errorResponse(400, "Maximum 200 prices per batch");
    }

    // Get all plan costs for this reseller
    const planIds = [
      ...new Set(prices.map((p) => p.data_plan_id).filter(Boolean)),
    ];
    if (!planIds.length)
      return errorResponse(400, "No valid data_plan_id values provided");

    const planRows = await executeQuery(
      `SELECT dp.id, dp.plan_name, dp.reseller_price, dp.price,
              COALESCE(rco.cost_price, dp.reseller_price, dp.price) AS effective_cost
       FROM data_plans dp
       LEFT JOIN reseller_cost_overrides rco
         ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
       WHERE dp.id = ANY($2) AND dp.is_active = true`,
      [auth.user.id, planIds]
    );

    const planMap = Object.fromEntries(planRows.map((p) => [p.id, p]));

    // Validate all before saving
    const errors = [];
    const toSave = [];

    for (const entry of prices) {
      const { data_plan_id, custom_price } = entry;
      const plan = planMap[data_plan_id];
      if (!plan) {
        errors.push(`Plan ${data_plan_id} not found`);
        continue;
      }

      const price = parseFloat(custom_price);
      if (isNaN(price) || price < 0) {
        errors.push(`Plan ${data_plan_id}: invalid price`);
        continue;
      }

      const floor = parseFloat(
        plan.effective_cost || plan.reseller_price || plan.price || 0
      );
      if (price < floor) {
        errors.push(
          `Plan ${data_plan_id} (${plan.plan_name}): GH₵${price.toFixed(
            2
          )} < your cost GH₵${floor.toFixed(2)}`
        );
        continue;
      }

      const markup_amount = Math.round((price - floor) * 100) / 100;
      const markup_percentage =
        floor > 0 ? Math.round((markup_amount / floor) * 10000) / 100 : 0;
      toSave.push([
        auth.user.id,
        data_plan_id,
        price,
        markup_amount,
        markup_percentage,
      ]);
    }

    if (errors.length) return errorResponse(400, "Validation failed", errors);

    for (const row of toSave) {
      await executeQuery(
        `INSERT INTO reseller_pricing (reseller_id, data_plan_id, custom_price, markup_amount, markup_percentage, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (reseller_id, data_plan_id)
         DO UPDATE SET custom_price = $3, markup_amount = $4, markup_percentage = $5, is_active = true, updated_at = CURRENT_TIMESTAMP`,
        row
      );
    }

    return successResponse(
      200,
      { updated: toSave.length },
      `${toSave.length} prices updated`
    );
  } catch (err) {
    console.error("reseller-set-pricing-batch error:", err);
    return errorResponse(500, "Failed to update pricing");
  }
};
