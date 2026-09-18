import { executeQuery } from "../utils/db.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { sendNotification, NotificationType } from "../utils/notifications.js";

/**
 * 5stardata Order Status Webhook
 * POST /api/5star-webhook
 *
 * 5stardata POSTs here when an order resolves (webhook URL set via admin-provider set-webhook).
 * Payload: { event, reference, status, phone, network, data, timestamp }
 * event: "order.delivered" | "order.failed"
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }

    const {
      event: eventType,
      reference,
      status: providerStatus,
      phone,
      network,
      data: dataVolume,
    } = body;

    if (!reference || !eventType) {
      return errorResponse(400, "Missing required fields");
    }

    if (eventType !== "order.delivered" && eventType !== "order.failed") {
      return successResponse(200, null, "Event not handled");
    }

    const rows = await executeQuery(
      "SELECT id, user_id, amount, status, metadata FROM transactions WHERE reference = $1 LIMIT 1",
      [reference.trim()]
    );

    if (rows.length === 0) {
      console.warn("5stardata webhook: transaction not found:", reference);
      return successResponse(200, null, "Transaction not found");
    }

    const tx = rows[0];

    if (["completed", "failed"].includes(tx.status)) {
      console.log("5stardata webhook: already in terminal state:", reference, tx.status);
      return successResponse(200, null, "Already finalized");
    }

    const meta =
      typeof tx.metadata === "string"
        ? JSON.parse(tx.metadata || "{}")
        : tx.metadata || {};

    if (eventType === "order.delivered") {
      await executeQuery(
        `UPDATE transactions
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP,
             metadata = COALESCE(metadata, '{}') || $1::jsonb
         WHERE reference = $2`,
        [
          JSON.stringify({
            provider_delivered: true,
            provider_status: providerStatus || "completed",
            delivery_completed_at: new Date().toISOString(),
          }),
          reference,
        ]
      );

      if (tx.user_id) {
        await sendNotification(
          tx.user_id,
          NotificationType.DATA_PURCHASE_SUCCESS,
          {
            dataVolume: dataVolume || meta.data_volume,
            network: network || meta.network,
            phone: phone || meta.phone_number,
          }
        ).catch(() => {});
      }

      console.log("5stardata webhook: order delivered:", reference);
    } else {
      // order.failed
      const isGuest = tx.user_id === null;
      const sellingPrice = parseFloat(tx.amount);

      await executeQuery(
        `UPDATE transactions
         SET status = 'failed', updated_at = CURRENT_TIMESTAMP,
             metadata = COALESCE(metadata, '{}') || $1::jsonb
         WHERE reference = $2`,
        [
          JSON.stringify({
            delivery_failed: true,
            needs_manual_refund: isGuest,
            provider_failed_at: new Date().toISOString(),
          }),
          reference,
        ]
      );

      if (!isGuest && sellingPrice > 0) {
        try {
          await executeQuery(
            "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [sellingPrice, tx.user_id]
          );
          await executeQuery(
            `UPDATE transactions SET metadata = metadata || $1::jsonb WHERE reference = $2`,
            [
              JSON.stringify({ auto_refunded: true, refund_amount: sellingPrice }),
              reference,
            ]
          );
          await sendNotification(tx.user_id, NotificationType.DATA_PURCHASE, {
            title: "Data Purchase Failed — Refunded",
            refunded: true,
            amount: sellingPrice,
          }).catch(() => {});
        } catch (refundErr) {
          console.error("5stardata webhook: refund error:", reference, refundErr.message);
        }
      }

      console.log("5stardata webhook: order failed:", reference, "guest:", isGuest);
    }

    return successResponse(200, null, "Webhook processed");
  } catch (error) {
    console.error("5stardata webhook error:", error);
    return errorResponse(500, "Webhook processing failed");
  }
};
