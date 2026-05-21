import axios from "axios";
import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import { sendNotification, NotificationType } from "../utils/notifications.js";
import {
  verifyTransactionIntegrity,
  verifyGuestTransactionIntegrity,
} from "../utils/transaction-integrity.js";
import { buyData } from "../utils/onepapi.js";

/**
 * Verify Paystack Payment
 * GET /api/payment-verify?reference=xxx
 * GET /api/payment-verify?reference=xxx&guest=true  (no auth required)
 *
 * Security:
 * - Authenticated mode: requires auth + verifies ownership
 * - Guest mode: no auth, but only returns limited data
 * - Verifies payment with Paystack API
 * - Uses database transactions to ensure data consistency
 * - Prevents double-crediting and double-delivery
 * - Never delivers data if payment is not confirmed successful
 */

// ─── Helper: Notify admins safely (won't crash the main flow) ────────────────
async function notifyAdmins(type, title, message) {
  try {
    const admins = await executeQuery(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 10"
    );
    await Promise.allSettled(
      admins.map((admin) =>
        sendNotification(admin.id, type, { title, message })
      )
    );
  } catch (err) {
    console.error("notifyAdmins error:", err.message);
  }
}

// Returns true when a 1Papi error message indicates an account balance problem.
const isProviderBalanceError = (msg = "") => {
  const m = msg.toLowerCase();
  return (
    m.includes("insufficient") ||
    m.includes("balance") ||
    m.includes("low fund") ||
    m.includes("not enough") ||
    m.includes("top up")
  );
};

// ─── Helper: Verify reference with Paystack ───────────────────────────────────
async function verifyWithPaystack(reference) {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      reference
    )}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      timeout: 15000, // 15s timeout — don't hang forever
    }
  );
  return response.data.data;
}

// ─── Helper: Safe metadata parser ────────────────────────────────────────────
function parseMeta(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "GET") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const reference = event.queryStringParameters?.reference;
    const isGuest = event.queryStringParameters?.guest === "true";

    if (!reference) {
      return errorResponse(400, "Payment reference is required");
    }

    // Sanitize reference — only allow alphanumeric + hyphens/underscores
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(reference)) {
      return errorResponse(400, "Invalid payment reference format");
    }

    // =========================================================================
    // GUEST VERIFICATION PATH
    // =========================================================================
    if (isGuest) {
      // Fetch the transaction — must exist
      const transactions = await executeQuery(
        "SELECT id, user_id, type, amount, status, metadata FROM transactions WHERE reference = $1 LIMIT 1",
        [reference]
      );

      if (transactions.length === 0) {
        return errorResponse(404, "Transaction not found");
      }

      const transaction = transactions[0];
      const meta = parseMeta(transaction.metadata);

      // ── Replay protection: already fully processed ────────────────────────
      if (transaction.status === "success") {
        const alreadyDelivered =
          meta.delivery_attempted ||
          meta.provider_reference ||
          meta.needs_manual_fulfil;

        return successResponse(200, {
          status: "already_verified",
          message: "Payment already verified",
          delivery_status: alreadyDelivered
            ? meta.delivery_failed
              ? "failed"
              : "processing"
            : "pending",
          amount: parseFloat(transaction.amount),
          network: meta.network || null,
          plan_name: meta.plan_name || null,
          phone_number: meta.phone_number || null,
          reference,
        });
      }

      // ── Already failed previously — stop immediately ──────────────────────
      if (transaction.status === "failed") {
        return errorResponse(400, "Payment verification failed previously");
      }

      // SECURITY FIX: Verify guest transaction integrity (prevent tampering)
      // Check both new field name and legacy field name for backward compatibility
      const storedHash =
        meta.guest_integrity_hash || meta.integrity_hash || null;
      if (storedHash && meta.phone_number && meta.data_plan_id) {
        const expectedAmountPencewas = Math.round(
          parseFloat(transaction.amount) * 100
        );
        const integrityOk = verifyGuestTransactionIntegrity(
          reference,
          expectedAmountPencewas,
          meta.phone_number,
          String(meta.data_plan_id),
          storedHash
        );
        if (!integrityOk) {
          console.error("Guest transaction integrity check FAILED:", reference);
          return errorResponse(
            400,
            "Transaction integrity verification failed"
          );
        }
      }

      // ── Verify with Paystack (single call for all guest types) ────────────
      let paymentData;
      try {
        paymentData = await verifyWithPaystack(reference);
      } catch (psErr) {
        console.error("Paystack verify error (guest):", psErr.message);
        return errorResponse(
          502,
          "Could not verify payment with provider. Please try again."
        );
      }

      // SECURITY FIX: Verify payment channel is MoMo only - reject card payments
      const paymentChannel =
        paymentData.channel || paymentData.authorization?.channel || "unknown";
      if (paymentChannel !== "mobile_money") {
        console.error(
          "Rejected non-MoMo payment via verify:",
          paymentChannel,
          reference
        );
        await executeQuery(
          "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
          [reference]
        );
        return errorResponse(
          400,
          "Card payments not accepted. Please use Mobile Money."
        );
      }

      // ── Pending: MoMo prompt not yet completed — leave DB as-is, don't mark failed ──
      // Webhook will fire charge.success when user completes the MoMo prompt.
      if (paymentData.status === "pending") {
        console.log("Payment pending for reference:", reference, "- leaving DB unchanged");
        return successResponse(200, {
          status: "pending",
          message: "Payment is still pending. Please complete the MoMo prompt on your phone then tap Check Again.",
          reference,
        });
      }

      // ── All other non-success statuses (abandoned, failed) — mark failed ─────
      if (paymentData.status !== "success") {
        console.log(
          `Payment ${paymentData.status || "unknown"} for reference:`,
          reference,
          "- marking as failed (no data delivered)"
        );
        await executeQuery(
          "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
          [reference]
        );
        if (paymentData.status === "abandoned") {
          return errorResponse(400, "Payment was abandoned. Please try again.");
        }
        return errorResponse(400, "Payment was not successful");
      }

      // ── Payment confirmed successful → mark success atomically ────────────
      // Use row-level lock to prevent race conditions on concurrent requests
      const lockResult = await executeQuery(
        `SELECT id, status FROM transactions WHERE reference = $1 FOR UPDATE LIMIT 1`,
        [reference]
      );

      if (!lockResult.length) {
        return errorResponse(404, "Transaction not found");
      }

      // Race condition guard: another request may have already processed this
      if (lockResult[0].status === "success") {
        return successResponse(200, {
          status: "already_verified",
          message: "Payment already verified",
          amount: parseFloat(transaction.amount),
          reference,
        });
      }

      if (lockResult[0].status === "failed") {
        return errorResponse(400, "Payment verification failed previously");
      }

      await executeQuery(
        "UPDATE transactions SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
        [reference]
      );

      // ── Credit reseller commission if applicable ──────────────────────────
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
          console.log(
            `Reseller ${resellerIdMeta} credited GH₵${resellerCommission} commission`
          );
        } catch (commErr) {
          // Commission failure must NOT block delivery
          console.error("Reseller commission credit error:", commErr.message);
        }
      }

      // ── DATA DELIVERY ─────────────────────────────────────────────────────
      // Atomically claim delivery ownership. The webhook uses the same lock, so
      // whichever fires first wins — the other gets 0 rows back and skips delivery.
      const deliveryClaimed = await executeQuery(
        `UPDATE transactions
         SET metadata = COALESCE(metadata, '{}') || '{"delivery_lock": true}'::jsonb
         WHERE reference = $1
           AND status != 'failed'
           AND (metadata->>'delivery_lock' IS NULL OR metadata->>'delivery_lock' != 'true')
           AND (metadata->>'delivery_attempted' IS NULL OR metadata->>'delivery_attempted' != 'true')
         RETURNING id`,
        [reference]
      );

      if (deliveryClaimed.length === 0) {
        // Webhook already claimed delivery or already attempted — don't double-deliver
        console.log("Verify: delivery already locked or attempted for:", reference);
        return successResponse(200, {
          status: "success",
          message: "Payment verified successfully. Data delivery is in progress.",
          delivery_status: "processing",
          delivery_error: null,
          amount: parseFloat(transaction.amount),
          network: meta.network || null,
          plan_name: meta.plan_name || null,
          phone_number: meta.phone_number || null,
          reference,
        });
      }

      let deliveryStatus = "pending";
      let deliveryError = null;

      const phoneNumber = meta.phone_number;
      const dataPlanId = meta.data_plan_id;
      const network = meta.network;

      // Only attempt delivery if we have the required fields
      if (!phoneNumber || !dataPlanId) {
        console.warn(
          "Guest delivery skipped — missing phone or plan:",
          reference
        );
        return successResponse(200, {
          status: "success",
          message: "Payment verified successfully",
          delivery_status: "pending",
          delivery_error: null,
          amount: parseFloat(transaction.amount),
          network: meta.network || null,
          plan_name: meta.plan_name || null,
          phone_number: meta.phone_number || null,
          reference,
        });
      }

      try {
        // ── 1Papi delivery ────────────────────────────────────────────────
        const providerPlanId = meta.provider_plan_id;

        if (!providerPlanId) {
          await executeQuery(
            `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb WHERE reference = $2`,
            [
              JSON.stringify({
                delivery_failed: true,
                reason: "no_provider_plan_id",
                delivery_attempted: true,
                refund_eligible: true,
                needs_manual_refund: true,
              }),
              reference,
            ]
          );
          await notifyAdmins(
            NotificationType.ADMIN_ALERT,
            "Guest Order Failed — No Provider Plan ID",
            `Reference: ${reference} | Metadata missing provider_plan_id. Manual refund required.`
          );
          deliveryStatus = "failed";
          deliveryError = "Data plan configuration error. Please contact support for a refund.";
          console.error("Guest delivery failed — no provider_plan_id in metadata:", reference);
        } else {
          const result = await buyData(phoneNumber, providerPlanId);

          if (result.success && result.status !== "failed") {
            await executeQuery(
              `UPDATE transactions SET status = 'success', metadata = metadata || $1::jsonb WHERE reference = $2`,
              [
                JSON.stringify({
                  provider: "1papi",
                  provider_reference: result.reference,
                  provider_status: result.status,
                  delivery_attempted: true,
                }),
                reference,
              ]
            );
            deliveryStatus = result.status === "completed" ? "completed" : "processing";
            console.log(`1Papi guest delivery ${result.status}:`, reference);
          } else if (isProviderBalanceError(result.message)) {
            // Provider has insufficient balance — keep payment as success, queue for manual delivery.
            // Intentionally NOT setting delivery_attempted so the admin retry can re-try via 1Papi.
            await executeQuery(
              `UPDATE transactions SET status = 'success', metadata = metadata || $1::jsonb WHERE reference = $2`,
              [
                JSON.stringify({
                  provider: "1papi",
                  provider_error: result.message,
                  needs_manual_fulfil: true,
                  manual_reason: "provider_low_balance",
                }),
                reference,
              ]
            );
            await notifyAdmins(
              NotificationType.ADMIN_ALERT,
              "Guest Order Queued — Provider Low Balance",
              `Reference: ${reference} | Error: "${result.message}" | Needs manual delivery.`
            );
            deliveryStatus = "processing";
            console.warn("1Papi low balance — guest order queued manual:", reference, result.message);
          } else {
            await executeQuery(
              `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb WHERE reference = $2`,
              [
                JSON.stringify({
                  delivery_failed: true,
                  provider: "1papi",
                  provider_error: result.message,
                  delivery_attempted: true,
                  refund_eligible: true,
                  needs_manual_refund: true,
                }),
                reference,
              ]
            );
            await notifyAdmins(
              NotificationType.ADMIN_ALERT,
              "Guest Order Failed — Refund Needed",
              `Reference: ${reference} | Provider: 1Papi | Error: "${result.message}"`
            );
            deliveryStatus = "failed";
            deliveryError = result.message;
            console.warn("1Papi guest delivery rejected:", reference, result.message);
          }
        }
      } catch (deliveryErr) {
        // Unexpected delivery error — mark failed, flag for refund
        console.error(
          "Guest delivery exception:",
          reference,
          deliveryErr.message
        );
        deliveryStatus = "failed";
        deliveryError = "Delivery error. Please contact support.";
        try {
          await executeQuery(
            `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb WHERE reference = $2`,
            [
              JSON.stringify({
                delivery_error: deliveryErr.message,
                delivery_attempted: true,
                refund_eligible: true,
                needs_manual_refund: true,
              }),
              reference,
            ]
          );
          await notifyAdmins(
            NotificationType.ADMIN_ALERT,
            "Guest Order Exception — Refund Needed",
            `Reference: ${reference} | Exception: "${deliveryErr.message}"`
          );
        } catch (updateErr) {
          console.error(
            "Failed to update transaction after delivery exception:",
            updateErr.message
          );
        }
      }

      return successResponse(200, {
        status: "success",
        message: "Payment verified successfully",
        delivery_status: deliveryStatus,
        delivery_error: deliveryError,
        amount: parseFloat(transaction.amount),
        network: meta.network || null,
        plan_name: meta.plan_name || null,
        phone_number: meta.phone_number || null,
        reference,
      });
    }

    // =========================================================================
    // AUTHENTICATED VERIFICATION PATH
    // =========================================================================
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }

    // Fetch transaction
    const transactions = await executeQuery(
      "SELECT id, user_id, amount, status, metadata FROM transactions WHERE reference = $1 LIMIT 1",
      [reference]
    );

    if (transactions.length === 0) {
      return errorResponse(404, "Transaction not found");
    }

    const transaction = transactions[0];

    // Ownership check — user can only verify their own transactions
    if (transaction.user_id !== auth.user.id) {
      return errorResponse(403, "Unauthorized access to transaction");
    }

    // Replay protection
    if (transaction.status === "success") {
      return successResponse(200, {
        status: "already_verified",
        message: "Payment already verified and credited",
        amount: parseFloat(transaction.amount),
      });
    }

    if (transaction.status === "failed") {
      return errorResponse(400, "Payment verification failed previously");
    }

    // Verify with Paystack
    let paymentData;
    try {
      paymentData = await verifyWithPaystack(reference);
    } catch (psErr) {
      console.error("Paystack verify error (auth):", psErr.message);
      return errorResponse(
        502,
        "Could not verify payment with provider. Please try again."
      );
    }

    // SECURITY FIX: Verify payment channel is MoMo only - reject card payments
    const authPaymentChannel =
      paymentData.channel || paymentData.authorization?.channel || "unknown";
    if (authPaymentChannel !== "mobile_money") {
      console.error(
        "Rejected non-MoMo payment via verify (auth):",
        authPaymentChannel,
        reference
      );
      await executeQuery(
        "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
        [reference]
      );
      return errorResponse(
        400,
        "Card payments not accepted. Please use Mobile Money."
      );
    }

    // Pending: MoMo not yet confirmed — leave DB unchanged, webhook will handle success
    if (paymentData.status === "pending") {
      console.log("Payment pending for reference:", reference, "- leaving DB unchanged");
      return successResponse(200, {
        status: "pending",
        message: "Payment is still pending. Please complete the MoMo prompt on your phone then tap Check Again.",
        reference,
      });
    }

    // All other non-success statuses — mark failed
    if (paymentData.status !== "success") {
      console.log(
        `Payment ${paymentData.status || "unknown"} for reference:`,
        reference,
        "- marking as failed (no wallet credited)"
      );
      await executeQuery(
        "UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
        [reference]
      );
      if (paymentData.status === "abandoned") {
        return errorResponse(400, "Payment was abandoned. Please try again.");
      }
      return errorResponse(400, "Payment was not successful");
    }

    // Parse metadata
    const meta = parseMeta(transaction.metadata);

    // Verify transaction integrity (guards against DB-level amount tampering)
    const expectedAmount = parseFloat(transaction.amount);
    const integrityOk = verifyTransactionIntegrity(
      reference,
      Math.round(expectedAmount * 100),
      auth.user.id,
      meta.integrity_hash || null
    );
    if (!integrityOk) {
      console.error(
        "Transaction integrity check FAILED — possible tampering:",
        reference
      );
      return errorResponse(400, "Transaction integrity verification failed");
    }

    // Amount verification — compare in pesewas to avoid floating-point exploits
    const paidPesewas = Math.round((paymentData.amount / 100) * 100);
    const expectedPesewas = Math.round(expectedAmount * 100);
    if (paidPesewas < expectedPesewas) {
      console.error(
        `Amount mismatch on ${reference}: paid=${paidPesewas} expected=${expectedPesewas}`
      );
      return errorResponse(400, "Payment amount mismatch");
    }

    // Atomic DB transaction with row locking — prevents double-crediting under concurrency
    await executeTransaction(async (sql) => {
      // Lock user row
      await sql("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
        auth.user.id,
      ]);

      // Re-check transaction status under lock (race condition guard)
      const txCheck = await sql(
        "SELECT status FROM transactions WHERE reference = $1 FOR UPDATE",
        [reference]
      );
      if (txCheck.length > 0 && txCheck[0].status === "success") {
        return; // Already processed by a concurrent request — skip
      }

      // Mark transaction success
      await sql(
        "UPDATE transactions SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
        [reference]
      );

      // Credit wallet
      await sql(
        "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [expectedAmount, auth.user.id]
      );
    });

    // Fetch updated balance
    const users = await executeQuery(
      "SELECT wallet_balance FROM users WHERE id = $1",
      [auth.user.id]
    );

    // Send success notification
    await sendNotification(auth.user.id, NotificationType.WALLET_FUND_SUCCESS, {
      amount: expectedAmount,
    });

    return successResponse(200, {
      status: "success",
      message: "Payment verified and wallet credited",
      amount: expectedAmount,
      new_balance: parseFloat(users[0].wallet_balance),
    });
  } catch (error) {
    console.error("Payment verification unhandled error:", error);

    if (error.response) {
      return errorResponse(
        error.response.status,
        error.response.data?.message || "Payment verification failed"
      );
    }

    return errorResponse(500, "Payment verification failed");
  }
};
