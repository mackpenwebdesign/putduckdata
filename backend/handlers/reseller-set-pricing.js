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

    const { data_plan_id, custom_price } = JSON.parse(event.body || "{}");

    if (!data_plan_id || custom_price == null) {
      return errorResponse(400, "data_plan_id and custom_price are required");
    }
    if (isNaN(parseFloat(custom_price)) || parseFloat(custom_price) < 0) {
      return errorResponse(400, "custom_price must be a positive number");
    }

    // Get the reseller's base cost for this plan
    const planRows = await executeQuery(
      `SELECT dp.id, dp.plan_name, dp.reseller_price, dp.price,
              COALESCE(rco.cost_price, dp.reseller_price, dp.price) AS effective_cost
       FROM data_plans dp
       LEFT JOIN reseller_cost_overrides rco
         ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
       WHERE dp.id = $2 AND dp.is_active = true`,
      [auth.user.id, data_plan_id]
    );

    if (!planRows.length)
      return errorResponse(404, "Data plan not found or inactive");
    const plan = planRows[0];

    const price = parseFloat(custom_price);
    const floor = parseFloat(
      plan.effective_cost || plan.reseller_price || plan.price || 0
    );

    if (price < floor) {
      return errorResponse(
        400,
        `Custom price (GH₵${price.toFixed(
          2
        )}) cannot be below your cost price (GH₵${floor.toFixed(2)})`
      );
    }

    const markup_amount = Math.round((price - floor) * 100) / 100;
    const markup_percentage =
      floor > 0 ? Math.round((markup_amount / floor) * 10000) / 100 : 0;

    await executeQuery(
      `INSERT INTO reseller_pricing (reseller_id, data_plan_id, custom_price, markup_amount, markup_percentage, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (reseller_id, data_plan_id)
       DO UPDATE SET custom_price = $3, markup_amount = $4, markup_percentage = $5, is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [auth.user.id, data_plan_id, price, markup_amount, markup_percentage]
    );

    return successResponse(
      200,
      {
        data_plan_id,
        plan_name: plan.plan_name,
        custom_price: price,
        your_cost: floor,
        markup_amount,
        markup_percentage,
      },
      "Price updated"
    );
  } catch (err) {
    console.error("reseller-set-pricing error:", err);
    return errorResponse(500, "Failed to update pricing");
  }
};
