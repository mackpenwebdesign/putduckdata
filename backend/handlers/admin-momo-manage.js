import { authenticateUser, hasRole } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import {
  createNotification,
  notifyAdmins,
  NotificationType,
} from "../utils/notifications.js";
import { generateReference } from "../utils/security.js";
import { buyData } from "../utils/onepapi.js";

const parseMeta = (m) => {
  if (!m) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m);
    } catch {
      return {};
    }
  }
  return m;
};


export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated)
      return errorResponse(401, "Authentication required");
    if (!hasRole(auth.user, "admin"))
      return errorResponse(403, "Admin access required");

    // ── GET — list payments ──────────────────────────────────────────────────
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const status = params.status || "pending";
      const type = params.type || "all"; // 'all' | 'momo' | 'afa'

      let typeFilter = "";
      if (type === "momo")
        typeFilter = `AND m.transaction_type != 'afa_purchase'`;
      if (type === "afa")
        typeFilter = `AND m.transaction_type = 'afa_purchase'`;

      const payments = await executeQuery(
        `SELECT
           m.*,
           COALESCE(u.full_name,  m.metadata->>'buyer_name')     AS full_name,
           COALESCE(u.email,      m.metadata->>'buyer_contact')   AS email,
           COALESCE(u.phone_number, m.metadata->>'buyer_contact') AS user_phone
         FROM momo_payments m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.status = $1 ${typeFilter}
         ORDER BY m.created_at DESC`,
        [status]
      );

      return successResponse(200, { payments, count: payments.length });
    }

    // ── PUT — approve or reject ──────────────────────────────────────────────
    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body);
      const { payment_id, action, admin_note } = body;

      if (!payment_id || !["approve", "reject"].includes(action)) {
        return errorResponse(
          400,
          "payment_id and action (approve/reject) required"
        );
      }

      const rows = await executeQuery(
        "SELECT * FROM momo_payments WHERE id = $1",
        [payment_id]
      );
      if (!rows.length) return errorResponse(404, "Payment not found");
      const payment = rows[0];
      if (payment.status !== "pending")
        return errorResponse(400, "Payment already processed");

      const meta = parseMeta(payment.metadata);
      const isAfa = payment.transaction_type === "afa_purchase";

      // ── APPROVE ─────────────────────────────────────────────────────────────
      if (action === "approve") {
        // SECURITY FIX: Verify payment was received before approving
        // Only approve if there's proof of payment (webhook confirmed) or verify via Paystack

        let paymentVerified = false;
        let paymentStatus = null;

        // For transactions with reference, verify via Paystack
        if (payment.reference) {
          try {
            const axios = await import("axios");
            const paystackRes = await axios.default.get(
              `https://api.paystack.co/transaction/verify/${encodeURIComponent(
                payment.reference
              )}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
                timeout: 15000,
              }
            );

            if (paystackRes.data?.data) {
              paymentStatus = paystackRes.data.data.status;
              paymentVerified = paymentStatus === "success";
            }
          } catch (psErr) {
            console.error(
              "Paystack verification error in approve:",
              psErr.message
            );
            // If Paystack fails, check if already verified via webhook
            // (momo_payments.status would be 'confirmed' from webhook)
          }
        }

        // If reference is null or verification failed, check for webhook confirmation
        // momo_payments with status 'confirmed' means webhook already verified the payment
        if (!paymentVerified && payment.status === "confirmed") {
          paymentVerified = true;
          paymentStatus = "confirmed";
        }

        // SECURITY: Do not approve without payment verification
        if (!paymentVerified) {
          return errorResponse(
            400,
            paymentStatus
              ? `Cannot approve: Payment status is "${paymentStatus}". Only confirmed payments can be approved.`
              : "Cannot approve: Payment not verified. Please wait for payment confirmation or use verify_paystack first."
          );
        }

        if (isAfa) {
          // Mark momo_payment approved (payment confirmed via verification)
          await executeQuery(
            `UPDATE momo_payments
             SET status = 'approved', reviewed_by = $1,
                 reviewed_at = CURRENT_TIMESTAMP, admin_note = $2
             WHERE id = $3`,
            [auth.user.id, admin_note || null, payment_id]
          );

          // Credit reseller commission
          if (meta.reseller_id && meta.data_plan_id) {
            try {
              const planRows = await executeQuery(
                `SELECT dp.price AS platform_price,
                        COALESCE(rp.custom_price, dp.price) AS custom_price
                 FROM data_plans dp
                 LEFT JOIN reseller_pricing rp
                   ON rp.reseller_id = $1 AND rp.data_plan_id = dp.id AND rp.is_active = true
                 WHERE dp.id = $2 AND dp.is_active = true LIMIT 1`,
                [meta.reseller_id, meta.data_plan_id]
              );
              if (planRows.length) {
                const commission = Math.max(
                  0,
                  Math.round(
                    (parseFloat(planRows[0].custom_price || 0) -
                      parseFloat(planRows[0].platform_price || 0)) *
                      100
                  ) / 100
                );
                if (commission > 0) {
                  await executeQuery(
                    "UPDATE users SET commission_balance = commission_balance + $1 WHERE id = $2",
                    [commission, meta.reseller_id]
                  );
                }
              }
            } catch (commErr) {
              console.error("AFA commission credit error:", commErr.message);
            }
          }

          // Attempt automatic data delivery via configured provider
          const txRef = generateReference("AFAD");
          const phone = meta.recipient_phone;
          const network = meta.network;
          const volumeMb = parseFloat(meta.volume_mb || 0);
          const capacityGB = volumeMb >= 1 ? volumeMb / 1000 : 1;

          let deliveryResult = null;
          let txStatus = "pending";
          let txMeta = {
            guest: true,
            afa: true,
            afa_momo_ref: payment.reference,
            phone_number: phone,
            network,
            data_plan_id: meta.data_plan_id,
            plan_name: meta.plan_name,
            data_volume: meta.data_volume,
            volume_mb: meta.volume_mb,
            provider_plan_id: meta.provider_plan_id,
            buyer_name: meta.buyer_name,
            buyer_contact: meta.buyer_contact,
            reseller_code: meta.reseller_code,
            reseller_name: meta.reseller_name,
            payment_confirmed_by: auth.user.id,
            payment_verified: paymentVerified,
          };

          try {
            if (meta.provider_plan_id && phone) {
              // 1Papi delivery
              deliveryResult = await buyData(phone, meta.provider_plan_id);
              if (deliveryResult.success && deliveryResult.status !== "failed") {
                txStatus = deliveryResult.status === "completed" ? "completed" : "processing";
                txMeta.provider = "1papi";
                txMeta.provider_reference = deliveryResult.reference;
                txMeta.provider_status = deliveryResult.status;
                txMeta.delivery_attempted = true;
                console.log("AFA 1Papi delivery status:", txStatus);
              } else {
                txMeta.needs_manual_fulfil = true;
                txMeta.provider = "1papi";
                txMeta.provider_error = deliveryResult.message;
                txMeta.delivery_attempted = true;
                console.warn("AFA 1Papi delivery failed, falling back to manual:", deliveryResult?.message);
              }
            } else {
              txMeta.needs_manual_fulfil = true;
              txMeta.reason = "no_provider_plan_id";
            }
          } catch (deliveryErr) {
            console.error("AFA delivery error:", deliveryErr.message);
            txMeta.needs_manual_fulfil = true;
            txMeta.delivery_error = deliveryErr.message;
          }

          // Create the delivery transaction record
          await executeQuery(
            `INSERT INTO transactions
               (user_id, type, amount, status, reference, reseller_id, metadata)
             VALUES (NULL, 'guest_data_purchase', $1, $2, $3, $4, $5)`,
            [
              parseFloat(payment.amount),
              txStatus,
              txRef,
              meta.reseller_id || null,
              JSON.stringify(txMeta),
            ]
          );

          const needsManual = txMeta.needs_manual_fulfil;
          return successResponse(
            200,
            {
              payment_id,
              action: "approved",
              type: "afa",
              needs_manual: needsManual,
              payment_verified: paymentVerified,
            },
            needsManual
              ? "AFA order approved. Delivery queued in Manual Queue."
              : "AFA order approved and data delivery initiated."
          );
        }

        // ── Regular MoMo wallet fund ─────────────────────────────────────────
        // SECURITY: Only proceed after payment verification
        await executeTransaction(async (sql) => {
          await sql(
            `UPDATE momo_payments
             SET status = 'approved', reviewed_by = $1,
                 reviewed_at = CURRENT_TIMESTAMP, admin_note = $2
             WHERE id = $3`,
            [auth.user.id, admin_note || null, payment_id]
          );
          await sql(
            "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
            [payment.amount, payment.user_id]
          );
          await sql(
            "UPDATE transactions SET status = 'success' WHERE reference = $1",
            [payment.reference]
          );
        });

        await createNotification(
          payment.user_id,
          NotificationType.MOMO_APPROVED,
          "MoMo Payment Approved",
          `Your MoMo payment of GH₵${parseFloat(payment.amount).toFixed(
            2
          )} has been approved and credited to your wallet.`,
          { amount: payment.amount, reference: payment.reference }
        );

        return successResponse(
          200,
          {
            payment_id,
            action: "approved",
            type: "wallet",
            payment_verified: paymentVerified,
          },
          "Payment approved and wallet credited"
        );
      }

      // ── REJECT ───────────────────────────────────────────────────────────────
      await executeQuery(
        `UPDATE momo_payments
         SET status = 'rejected', reviewed_by = $1,
             reviewed_at = CURRENT_TIMESTAMP, admin_note = $2
         WHERE id = $3`,
        [auth.user.id, admin_note || "Payment rejected", payment_id]
      );

      if (!isAfa && payment.user_id) {
        await executeQuery(
          "UPDATE transactions SET status = 'failed' WHERE reference = $1",
          [payment.reference]
        );
        await createNotification(
          payment.user_id,
          NotificationType.MOMO_REJECTED,
          "MoMo Payment Rejected",
          `Your MoMo payment of GH₵${parseFloat(payment.amount).toFixed(
            2
          )} was rejected.${admin_note ? " Reason: " + admin_note : ""}`,
          { amount: payment.amount, reference: payment.reference }
        );
      }

      return successResponse(
        200,
        { payment_id, action: "rejected" },
        "Payment rejected"
      );
    }

    return errorResponse(405, "Method not allowed");
  } catch (error) {
    console.error("Admin MoMo manage error:", error);
    return errorResponse(500, "Failed to process MoMo payment");
  }
};
