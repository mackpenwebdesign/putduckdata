import crypto from "crypto";
import { executeQuery, executeTransaction } from "../utils/db.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { sendNotification, NotificationType } from "../utils/notifications.js";
import { buyData } from "../utils/onepapi.js";

/**
 * Paystack Webhook Handler
 * POST /api/paystack-webhook
 *
 * Security:
 * - Validates Paystack signature
 * - Prevents replay attacks
 * - Idempotent processing
 * - NEVER delivers data if payment fails
 *
 * Events handled:
 * - charge.success (wallet funding + guest data purchases)
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(event.body)
      .digest("hex");

    const paystackSignature = event.headers["x-paystack-signature"];

    if (!paystackSignature) {
      console.error("Missing Paystack signature header");
      return errorResponse(401, "Invalid signature");
    }
    const hashBuf = Buffer.from(hash, "hex");
    const sigBuf = Buffer.from(paystackSignature, "hex");
    const signatureValid =
      hashBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(hashBuf, sigBuf);
    if (!signatureValid) {
      console.error("Invalid Paystack signature");
      return errorResponse(401, "Invalid signature");
    }

    const webhookEvent = JSON.parse(event.body);
    const { event: eventType, data } = webhookEvent;

    console.log("Paystack webhook received:", eventType, data.reference);

    // Handle charge.success event
    if (eventType === "charge.success") {
      const reference = data.reference;
      const paidAmount = data.amount / 100; // Convert from pesewas
      const status = data.status;

      // Find transaction
      const transactions = await executeQuery(
        "SELECT id, user_id, type, amount, status, metadata FROM transactions WHERE reference = $1",
        [reference]
      );

      if (transactions.length === 0) {
        console.error("Transaction not found:", reference);
        return successResponse(200, null, "Transaction not found");
      }

      const transaction = transactions[0];

      // Parse metadata first — needed for delivery_attempted idempotency check
      let meta = {};
      try {
        meta =
          typeof transaction.metadata === "string"
            ? JSON.parse(transaction.metadata)
            : transaction.metadata || {};
      } catch {
        meta = {};
      }

      // Idempotency: skip already-processed transactions.
      //
      // Non-guest (wallet_fund, afa_registration): status="success" means fully done —
      // the wallet was credited atomically. Skip immediately.
      //
      // Guest purchases: status changes to "pending" after GigHub accepts the order,
      // so status="success" alone is NOT a reliable idempotency signal. We also check
      // delivery_attempted which is set on EVERY delivery outcome (success, fail, exception).
      const isGuestTx = transaction.user_id === null || meta.guest === true;

      // Hard stop: transaction was already failed (e.g. abandoned via verify endpoint).
      // Even a legitimate charge.success retry must not resurrect a failed record.
      if (transaction.status === "failed") {
        console.log("Transaction already failed — ignoring webhook:", reference);
        return successResponse(200, null, "Transaction already failed");
      }

      if (transaction.status === "success") {
        if (!isGuestTx) {
          // wallet_fund / afa_registration — status=success means wallet credited, done.
          console.log("Transaction already processed:", reference);
          return successResponse(200, null, "Already processed");
        }
        if (meta.delivery_attempted) {
          // Guest — payment confirmed + delivery already attempted.
          console.log("Guest transaction already delivered:", reference);
          return successResponse(200, null, "Already processed");
        }
        // Guest — status=success but delivery not yet attempted. Allow through.
      } else if (meta.delivery_attempted) {
        // Delivery was already attempted on a previous webhook fire
        // (status is pending/failed after GigHub/SmartDataHub call).
        console.log("Delivery already attempted for:", reference);
        return successResponse(200, null, "Already processed");
      }

      // Verify amount: paidAmount (total charged incl. fee) should be >= stored amount
      const expectedAmount = parseFloat(transaction.amount);
      const expectedTotal = meta.total_charged || expectedAmount;
      // Compare in pesewas (integers) to eliminate floating-point tolerance exploits
      const paid_pesewas = Math.round(paidAmount * 100);
      const expected_pesewas = Math.round(expectedAmount * 100);
      if (paid_pesewas < expected_pesewas) {
        console.error("Amount mismatch (pesewas):", {
          expected_pesewas,
          paid_pesewas,
          reference,
        });
        return successResponse(200, null, "Amount mismatch");
      }

      // SECURITY FIX: Verify payment channel is mobile_money - reject card payments
      const paymentChannel =
        data.channel || data.authorization?.channel || "unknown";
      if (paymentChannel !== "mobile_money") {
        console.error("Rejected non-MoMo payment:", paymentChannel, reference);
        await executeQuery(
          "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
          [reference]
        );
        return successResponse(
          200,
          null,
          "Card payments not accepted - please use MoMo"
        );
      }

      // ================================================================
      // CRITICAL FIX: Handle FAILED/ABANDONED/PENDING payments - never deliver data!
      // ================================================================
      if (status !== "success") {
        // Payment FAILED, ABANDONED, or PENDING - mark transaction as failed, do NOT deliver data
        console.log(
          `Payment ${status || "unknown"} for reference:`,
          reference,
          "- marking as failed (no data delivered)"
        );
        await executeQuery(
          "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
          [reference]
        );
        return successResponse(
          200,
          null,
          status === "abandoned"
            ? "Payment abandoned - transaction marked as failed"
            : status === "pending"
            ? "Payment pending - transaction marked as failed"
            : "Payment failed - transaction marked as failed"
        );
      }

      // Only process successful payments
      // ================================================================
      // Process successful payment
      // ================================================================
      const isGuest = transaction.user_id === null || meta.guest === true;

      if (isGuest) {
        // Atomically claim delivery ownership — only one process wins if webhook fires twice.
        // The WHERE clause ensures the row is only updated when delivery_attempted is NOT set,
        // so concurrent webhook retries will get 0 rows back and exit.
        const claimed = await executeQuery(
          `UPDATE transactions
           SET status = 'success', updated_at = CURRENT_TIMESTAMP,
               metadata = COALESCE(metadata, '{}') || '{"delivery_lock": true}'::jsonb
           WHERE reference = $1
             AND status != 'failed'
             AND (metadata->>'delivery_lock' IS NULL OR metadata->>'delivery_lock' != 'true')
             AND (metadata->>'delivery_attempted' IS NULL OR metadata->>'delivery_attempted' != 'true')
           RETURNING id`,
          [reference]
        );

        if (claimed.length === 0) {
          console.log("Delivery lock already held for:", reference);
          return successResponse(200, null, "Already processing");
        }
        console.log("Guest purchase payment confirmed:", reference);

        // Attempt data delivery via 1Papi
        try {
          const phoneNumber = meta.phone_number;
          const dataPlanId = meta.data_plan_id;

          // Credit reseller commission if applicable
          const resellerIdMeta = meta.reseller_id;
          const resellerCommission = parseFloat(meta.reseller_commission || 0);
          if (resellerIdMeta && resellerCommission > 0) {
            try {
              await executeQuery(
                "UPDATE users SET commission_balance = commission_balance + $1 WHERE id = $2",
                [resellerCommission, resellerIdMeta]
              );
              await executeQuery(
                `INSERT INTO commissions (referrer_id, referred_user_id, transaction_id, amount, commission_rate, status)
                 VALUES ($1, $2, $3, $4, $5, 'approved')`,
                [resellerIdMeta, null, transaction.id, resellerCommission, 0]
              );
              console.log(`Reseller ${resellerIdMeta} credited GH₵${resellerCommission} commission`);
            } catch (commErr) {
              console.error("Reseller commission credit error:", commErr.message);
            }
          }

          if (phoneNumber && dataPlanId) {
            // 1Papi delivery
            const planRows = await executeQuery(
              "SELECT provider_plan_id FROM data_plans WHERE id = $1 AND is_active = true",
              [dataPlanId]
            );
            const providerPlanId = planRows[0]?.provider_plan_id;

            if (providerPlanId) {
              const result = await buyData(phoneNumber, providerPlanId);
              if (result.success && result.status !== "failed") {
                const deliveryStatus = result.status === "completed" ? "completed" : "processing";
                await executeQuery(
                  `UPDATE transactions SET status = $1, metadata = metadata || $2::jsonb WHERE reference = $3`,
                  [
                    deliveryStatus,
                    JSON.stringify({
                      provider: "1papi",
                      provider_reference: result.reference,
                      provider_status: result.status,
                      delivery_attempted: true,
                    }),
                    reference,
                  ]
                );
                console.log(`1Papi guest data delivery ${deliveryStatus}:`, reference);
              } else {
                // 1Papi rejected the order — mark failed so admin can refund from Paystack
                await executeQuery(
                  `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb WHERE reference = $2`,
                  [
                    JSON.stringify({
                      delivery_failed: true,
                      provider: "1papi",
                      provider_error: result.message,
                      needs_manual_refund: true,
                      delivery_attempted: true,
                    }),
                    reference,
                  ]
                );
                console.warn("1Papi guest delivery rejected (webhook):", reference, result.message);
              }
            } else {
              // No provider_plan_id — plan not synced, queue for manual delivery
              await executeQuery(
                `UPDATE transactions SET metadata = metadata || $1::jsonb WHERE reference = $2`,
                [
                  JSON.stringify({
                    needs_manual_fulfil: true,
                    reason: "no_provider_plan_id",
                    delivery_attempted: true,
                  }),
                  reference,
                ]
              );
            }
          }
        } catch (deliveryErr) {
          console.error(
            "Guest delivery error (payment already confirmed):",
            deliveryErr.message
          );
          // Unexpected exception — mark failed, admin can refund from Paystack
          await executeQuery(
            `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb WHERE reference = $2`,
            [
              JSON.stringify({
                delivery_error: deliveryErr.message,
                needs_manual_refund: true,
                delivery_attempted: true,
              }),
              reference,
            ]
          ).catch(() => {});
        }
      } else if (transaction.type === "afa_registration") {
        // AFA registration payment confirmed
        await executeQuery(
          "UPDATE transactions SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
          [reference]
        );
        if (transaction.user_id) {
          await sendNotification(
            transaction.user_id,
            NotificationType.WALLET_FUND_SUCCESS,
            { amount: expectedAmount }
          );
        }
        console.log("AFA registration payment confirmed:", reference);
      } else {
        // Authenticated user — credit wallet
        await executeTransaction(async (sql) => {
          await sql(
            "UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE reference = $2",
            ["success", reference]
          );

          await sql(
            "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [expectedAmount, transaction.user_id]
          );
        });

        // Send notification
        await sendNotification(
          transaction.user_id,
          NotificationType.WALLET_FUND_SUCCESS,
          { amount: expectedAmount }
        );
      }

      console.log("Payment processed successfully:", reference);
    }

    return successResponse(200, null, "Webhook processed");
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return errorResponse(500, "Webhook processing failed");
  }
};
