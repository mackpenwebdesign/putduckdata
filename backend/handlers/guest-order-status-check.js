import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { checkOrderStatus } from "../utils/onepapi.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";

/**
 * Guest Order Status Check
 * POST /api/guest-order-status-check
 * Body: { reference }
 *
 * Public — no auth required.
 * Polls 1Papi for the latest delivery status and syncs DB.
 * Rate-limited to prevent abuse.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
    const clientIp = getClientIp(event.headers);
    const rateCheck = checkRateLimit(`guest_status_check:${clientIp}`, 10);
    if (!rateCheck.allowed)
      return errorResponse(429, "Too many requests. Please wait.");

    const body = event.body ? JSON.parse(event.body) : {};
    const reference = (body.reference || "").trim().toUpperCase();
    if (!reference) return errorResponse(400, "reference is required");

    const rows = await executeQuery(
      `SELECT id, status, metadata
       FROM transactions
       WHERE reference = $1 AND (type = 'guest_data_purchase' OR user_id IS NULL)
       LIMIT 1`,
      [reference]
    );

    if (rows.length === 0) {
      return errorResponse(404, "Order not found");
    }

    const tx = rows[0];

    // Nothing to do for terminal states
    if (["completed", "failed"].includes(tx.status)) {
      return successResponse(200, { status: tx.status, changed: false }, "Order already finalized");
    }

    const meta =
      typeof tx.metadata === "string"
        ? JSON.parse(tx.metadata || "{}")
        : tx.metadata || {};

    const providerRef = meta.provider_reference;
    if (!providerRef) {
      return successResponse(200, { status: tx.status, changed: false }, "Order pending provider assignment");
    }

    const providerData = await checkOrderStatus(providerRef);
    const providerStatus = (providerData.status || "").toLowerCase();

    let newStatus = tx.status;
    let changed = false;

    if (["completed", "success", "delivered"].includes(providerStatus)) {
      await executeQuery(
        `UPDATE transactions
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP,
             metadata = COALESCE(metadata, '{}') || $1::jsonb
         WHERE reference = $2`,
        [
          JSON.stringify({
            provider_synced: true,
            provider_status: providerStatus,
            synced_at: new Date().toISOString(),
          }),
          reference,
        ]
      );
      newStatus = "completed";
      changed = true;
    } else if (["failed", "rejected", "cancelled"].includes(providerStatus)) {
      await executeQuery(
        `UPDATE transactions
         SET status = 'failed', updated_at = CURRENT_TIMESTAMP,
             metadata = COALESCE(metadata, '{}') || $1::jsonb
         WHERE reference = $2`,
        [
          JSON.stringify({
            delivery_failed: true,
            needs_manual_refund: true,
            provider_synced: true,
            provider_status: providerStatus,
            synced_at: new Date().toISOString(),
          }),
          reference,
        ]
      );
      newStatus = "failed";
      changed = true;
    }

    return successResponse(
      200,
      { status: newStatus, provider_status: providerStatus, changed },
      changed ? "Order status updated" : "No status change"
    );
  } catch (error) {
    console.error("Guest order status check error:", error);
    return errorResponse(500, "Failed to check order status");
  }
};
