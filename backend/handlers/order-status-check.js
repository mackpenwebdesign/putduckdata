import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import { checkOrderStatus } from "../utils/onepapi.js";
import {
  createNotification,
  NotificationType,
} from "../utils/notifications.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";

/**
 * Order Status Check — User-facing
 * POST /api/order-status-check
 *
 * Checks pending/processing orders against the Smart Data Hub API
 * and updates local DB. Users can only check their own orders.
 *
 * Body: { transaction_ids: [id1, id2, ...] }
 *   If omitted, checks ALL user's pending/processing data_purchase orders (max 20).
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // Rate limit: 10 checks per minute per IP
    const clientIp = getClientIp(event.headers);
    const rateCheck = checkRateLimit(`order_check:${clientIp}`, 10);
    if (!rateCheck.allowed) {
      return errorResponse(429, "Too many requests. Please wait.");
    }

    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const requestedIds = body.transaction_ids || [];

    // Only check orders that have a provider_reference (i.e. were submitted to the API)
    let query, params;
    if (requestedIds.length > 0) {
      query = `SELECT id, user_id, amount, status, reference, metadata
               FROM transactions
               WHERE user_id = $1
                 AND type = 'data_purchase'
                 AND status IN ('pending', 'processing')
                 AND id = ANY($2)
               LIMIT 20`;
      params = [auth.user.id, requestedIds];
    } else {
      query = `SELECT id, user_id, amount, status, reference, metadata
               FROM transactions
               WHERE user_id = $1
                 AND type = 'data_purchase'
                 AND status IN ('pending', 'processing')
               ORDER BY created_at DESC
               LIMIT 20`;
      params = [auth.user.id];
    }

    const pendingTx = await executeQuery(query, params);

    if (pendingTx.length === 0) {
      return successResponse(200, {
        updated: [],
        message: "No pending orders to check",
      });
    }

    const updated = [];

    for (const tx of pendingTx) {
      const providerRef = tx.metadata?.provider_reference;
      if (!providerRef) continue; // No provider reference — can't check status

      try {
        const providerData = await checkOrderStatus(providerRef);
        const status = (providerData.status || "").toLowerCase();

        if (["completed", "success", "delivered"].includes(status)) {
          await executeQuery(
            `UPDATE transactions
             SET status = 'completed',
                 metadata = metadata || $1::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [
              JSON.stringify({
                provider_synced: true,
                provider_status: status,
                synced_at: new Date().toISOString(),
              }),
              tx.id,
            ]
          );
          updated.push({
            id: tx.id,
            reference: tx.reference,
            new_status: "completed",
          });
        } else if (["failed", "rejected", "cancelled"].includes(status)) {
          // Refund user
          await executeTransaction(async (sql) => {
            await sql(
              "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
              [parseFloat(tx.amount), tx.user_id]
            );
            await sql(
              `UPDATE transactions
               SET status = 'failed',
                   metadata = metadata || $1::jsonb,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [
                JSON.stringify({
                  provider_synced: true,
                  provider_status: status,
                  auto_refunded: true,
                  refund_amount: parseFloat(tx.amount),
                  synced_at: new Date().toISOString(),
                }),
                tx.id,
              ]
            );
          });
          try {
            await createNotification(
              tx.user_id,
              NotificationType.DATA_PURCHASE,
              "Order Failed — Refunded",
              `Your order (${tx.reference}) failed. GH₵${parseFloat(
                tx.amount
              ).toFixed(2)} has been refunded.`,
              { refunded: true, amount: parseFloat(tx.amount) }
            );
          } catch (_) {
            /* non-critical */
          }
          updated.push({
            id: tx.id,
            reference: tx.reference,
            new_status: "failed",
            refunded: true,
          });
        } else {
          // Still pending on provider side
          updated.push({
            id: tx.id,
            reference: tx.reference,
            new_status: tx.status,
            provider_status: status,
          });
        }
      } catch (err) {
        console.error(`Status check failed for ${tx.reference}:`, err.message);
      }
    }

    return successResponse(
      200,
      { updated },
      updated.length > 0
        ? `${updated.length} order(s) checked`
        : "Orders checked, no status changes"
    );
  } catch (error) {
    console.error("Order status check error:", error);
    return errorResponse(500, "Failed to check order status");
  }
};
