/**
 * Buy Data (Legacy endpoint)
 * POST /api/buy-data
 *
 * Kept for backward compatibility. Validates the phone/plan pair
 * then forwards to the main data-purchase handler.
 *
 * Accepts: { data_plan_id, recipient_phone }
 */
import { executeQuery } from "../utils/db.js";
import { authenticateUser } from "../utils/auth.js";
import { errorResponse, corsResponse } from "../utils/response.js";
import { handler as dataPurchaseHandler } from "./data-purchase.js";

const NETWORK_PREFIXES = {
  MTN: ["024", "025", "053", "054", "055", "059"],
  TELECEL: ["020", "050"],
  AIRTEL_TIGO: ["027", "057", "026", "056"],
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const body = JSON.parse(event.body);
    const { data_plan_id, recipient_phone } = body;

    if (!data_plan_id || !recipient_phone) {
      return errorResponse(
        400,
        "data_plan_id and recipient_phone are required"
      );
    }

    // Fetch plan to get network and price
    const plans = await executeQuery(
      "SELECT network, price, reseller_price FROM data_plans WHERE id = $1 AND is_active = true",
      [data_plan_id]
    );

    if (plans.length === 0) {
      return errorResponse(404, "Data plan not found or inactive");
    }

    // Verify phone prefix matches plan's network
    const phonePrefix = recipient_phone.substring(0, 3);
    const detectedEntry = Object.entries(NETWORK_PREFIXES).find(
      ([, prefixes]) => prefixes.includes(phonePrefix)
    );

    if (detectedEntry && detectedEntry[0] !== plans[0].network) {
      return errorResponse(
        400,
        `Phone number belongs to ${detectedEntry[0]}, not ${plans[0].network}. Please select the correct plan.`
      );
    }

    // Determine effective price for reseller
    let amount = parseFloat(plans[0].price);
    try {
      const auth = await authenticateUser(event.headers);
      if (auth.authenticated) {
        const userRows = await executeQuery(
          "SELECT is_reseller FROM users WHERE id = $1",
          [auth.user.id]
        );
        if (userRows[0]?.is_reseller) {
          const resellerPriceRows = await executeQuery(
            `SELECT COALESCE(rco.cost_price, dp.reseller_price, dp.price) AS effective_price
             FROM data_plans dp
             LEFT JOIN reseller_cost_overrides rco
               ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
             WHERE dp.id = $2`,
            [auth.user.id, data_plan_id]
          );
          if (resellerPriceRows.length > 0) {
            amount = parseFloat(resellerPriceRows[0].effective_price);
          }
        }
      }
    } catch {
      /* ignore auth errors, fall back to retail price */
    }

    // Forward to main data-purchase handler in the expected format
    const mappedEvent = {
      ...event,
      body: JSON.stringify({
        network: plans[0].network,
        data_plan_id: parseInt(data_plan_id),
        phone_number: recipient_phone,
        amount: amount,
      }),
    };

    return dataPurchaseHandler(mappedEvent);
  } catch (error) {
    console.error("Buy data error:", error);
    return errorResponse(500, "Purchase failed. Please try again.");
  }
};
