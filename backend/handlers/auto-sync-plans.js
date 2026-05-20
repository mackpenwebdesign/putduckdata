import { executeQuery } from "../utils/db.js";
import { fetchPlans } from "../utils/onepapi.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { authenticateUser, hasRole, verifyAdminFromDB } from "../utils/auth.js";

/**
 * Auto Sync Data Plans from 1Papi
 * GET /api/auto-sync-plans — syncs cost_price and provider_plan_id (admin only)
 */

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET") return errorResponse(405, "GET only");

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated || !hasRole(auth.user, "admin")) {
      return errorResponse(403, "Admin access required");
    }
    if (!(await verifyAdminFromDB(auth.user.id))) {
      return errorResponse(403, "Admin access required");
    }

    const result = await syncPricesCron(auth.user.id);
    return successResponse(
      200,
      result,
      `Synced ${result.updated} / ${result.total} plans`
    );
  } catch (error) {
    console.error("Auto-sync error:", error);
    return errorResponse(500, "Sync failed: " + error.message);
  }
};

// Normalize provider network names to our DB format
const normalizeNetwork = (network) => {
  const n = (network || "").toUpperCase().replace(/[\s_-]/g, "");
  if (n === "AIRTELTIGO" || n === "AT") return "AIRTEL_TIGO";
  if (n === "TELECEL" || n === "VODAFONE") return "TELECEL";
  if (n === "MTN") return "MTN";
  return (network || "").toUpperCase();
};

/**
 * 1Papi cost_price sync — called by HTTP handler and weekly cron
 */
export const syncPricesCron = async (userId = null) => {
  const plans = await fetchPlans();
  let updated = 0;
  let skipped = 0;

  for (const p of plans) {
    const dbNetwork = normalizeNetwork(p.network);
    const dbVolume = (p.data_volume || "").toUpperCase().replace(/\s/g, "");

    const result = await executeQuery(
      `UPDATE data_plans
       SET cost_price        = $1,
           provider_plan_id  = $2,
           updated_at        = CURRENT_TIMESTAMP
       WHERE provider_plan_id = $2
          OR (network = $3 AND UPPER(REPLACE(data_volume, ' ', '')) = $4)
       RETURNING id`,
      [parseFloat(p.price), p.id, dbNetwork, dbVolume]
    );
    if (result.length > 0) updated++;
    else skipped++;
  }

  await executeQuery(
    `INSERT INTO security_audit_log (user_id, event_type, status, details)
     VALUES ($1, 'provider_price_sync', 'success', $2)`,
    [
      userId,
      JSON.stringify({
        updated,
        skipped,
        total: plans.length,
        timestamp: new Date().toISOString(),
      }),
    ]
  );

  console.log(`1Papi sync: ${updated} updated, ${skipped} skipped, total ${plans.length}`);
  return { updated, skipped, total: plans.length };
};
