import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";

/**
 * Guest Order Track
 * GET /api/guest-order-track?reference=GUEST_XXX
 *
 * Public — no auth required.
 * Returns order status for a guest purchase by reference.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET")
    return errorResponse(405, "Method not allowed");

  try {
    const clientIp = getClientIp(event.headers);
    const rateCheck = checkRateLimit(`guest_track:${clientIp}`, 20);
    if (!rateCheck.allowed)
      return errorResponse(429, "Too many requests. Please wait.");

    const reference = event.queryStringParameters?.reference;
    if (!reference) return errorResponse(400, "reference is required");

    const rows = await executeQuery(
      `SELECT id, reference, status, amount, metadata, created_at, updated_at
       FROM transactions
       WHERE reference = $1 AND (type = 'guest_data_purchase' OR user_id IS NULL)
       LIMIT 1`,
      [reference.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return errorResponse(
        404,
        "Order not found. Please check your reference number."
      );
    }

    const tx = rows[0];
    let meta = {};
    try {
      meta =
        typeof tx.metadata === "string"
          ? JSON.parse(tx.metadata)
          : tx.metadata || {};
    } catch {
      meta = {};
    }

    const statusMessages = {
      pending: "Payment received. Your data is being processed.",
      success: "Payment confirmed. Data delivery is in progress.",
      processing: "Your order is being processed by our team.",
      completed: "Data delivered successfully!",
      failed: "This order failed. Please contact support for a refund.",
    };

    let enhancedMessage = statusMessages[tx.status] || "Order status updated.";

    if (meta.needs_manual_fulfil && tx.status !== "failed") {
      enhancedMessage = "Payment confirmed. Your data bundle is being prepared — it will be delivered to your number shortly.";
    } else if (meta.delivery_failed && meta.needs_manual_refund) {
      enhancedMessage = "Your payment was received but we had a delivery issue. Please contact support — a refund will be processed for you.";
    } else if (tx.status === "failed") {
      enhancedMessage = meta.needs_manual_refund
        ? "Your payment was received but delivery failed. Please contact support for a refund."
        : "Payment was not completed. Please contact support if money was deducted.";
    }

    return successResponse(
      200,
      {
        id: tx.id,
        reference: tx.reference,
        status: tx.status,
        status_message: enhancedMessage,
        phone: meta.phone_number || null,
        network: meta.network || null,
        plan_name: meta.plan_name || null,
        data_volume: meta.data_volume || null,
        volume_mb: meta.volume_mb || null,
        validity_days: meta.validity_days || null,
        purchase_date: tx.created_at,
        provider_reference: meta.provider_reference || null,
        amount: parseFloat(tx.amount),
        created_at: tx.created_at,
        updated_at: tx.updated_at,
      },
      "Order found"
    );
  } catch (error) {
    console.error("Guest order track error:", error);
    return errorResponse(500, "Failed to look up order");
  }
};
