import axios from "axios";
import { authenticateUser, hasRole, verifyAdminFromDB } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import {
  createNotification,
  NotificationType,
} from "../utils/notifications.js";
import { buyData } from "../utils/onepapi.js";

// Returns true ONLY when the provider error is specifically about account balance.
// Must require exact phrases to avoid false positives on unrelated errors
// (e.g. "insufficient data plan", "invalid plan", etc.).
const isProviderBalanceError = (msg = "") => {
  const m = msg.toLowerCase();
  return (
    m.includes("insufficient balance") ||
    m.includes("insufficient fund") ||
    m.includes("low balance") ||
    m.includes("not enough balance") ||
    m.includes("account balance") ||
    m.includes("top up your") ||
    m.includes("recharge your")
  );
};

/**
 * Bulk verify pending orders from last 24h and auto-place to provider.
 * Pass optional ids array in body to only retry specific transactions.
 */
const handleVerifyPending24h = async (auth, body = {}) => {
  try {
    const isRealAdmin = await verifyAdminFromDB(auth.user.id);
    if (!isRealAdmin) {
      return errorResponse(403, "Admin access revoked");
    }

    const filterIds = Array.isArray(body.ids) && body.ids.length > 0 ? body.ids : null;

    let pendingTx;
    if (filterIds) {
      // Retry only the specified transaction IDs
      pendingTx = await executeQuery(
        `SELECT id, user_id, amount, status, reference, type, metadata, recipient_phone
         FROM transactions
         WHERE id = ANY($1)
           AND type IN ('data_purchase', 'guest_data_purchase')
           AND status IN ('pending', 'processing', 'success')
         ORDER BY created_at ASC
         LIMIT 100`,
        [filterIds]
      );
    } else {
      // Find all data purchases from last 24h that have no provider_reference
      pendingTx = await executeQuery(
        `SELECT id, user_id, amount, status, reference, type, metadata, recipient_phone
         FROM transactions
         WHERE type IN ('data_purchase', 'guest_data_purchase')
           AND status IN ('pending', 'processing', 'success')
           AND created_at > NOW() - INTERVAL '24 hours'
           AND (metadata->>'provider_reference' IS NULL
                OR metadata->>'provider_reference' = ''
                OR metadata->>'delivery_attempted' IS NULL)
         ORDER BY created_at ASC
         LIMIT 50`
      );
    }

    let placed = 0;
    let failed = 0;
    let skipped = 0;
    const results = [];

    for (const tx of pendingTx) {
      let meta = {};
      try {
        meta =
          typeof tx.metadata === "string"
            ? JSON.parse(tx.metadata)
            : tx.metadata || {};
      } catch {
        meta = {};
      }

      // Skip if already has provider reference
      if (meta.provider_reference || meta.delivery_attempted) {
        skipped++;
        results.push({
          ref: tx.reference,
          status: "skipped",
          reason: "already_has_provider_ref",
        });
        continue;
      }

      // ── SECURITY: Always verify with Paystack for external payments ──────
      // data_purchase = wallet-funded (no Paystack reference) — skip Paystack check.
      // ALL other types (guest_data_purchase, wallet_fund, etc.) MUST be verified
      // regardless of current DB status — this prevents chargebacked or fraudulently
      // marked-success transactions from receiving data delivery.
      const isExternalPayment = tx.type !== "data_purchase";

      if (isExternalPayment) {
        if (!tx.reference) {
          skipped++;
          results.push({
            ref: tx.id,
            status: "skipped",
            reason: "no_paystack_reference",
          });
          continue;
        }

        try {
          const paystackRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(
              tx.reference
            )}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
              timeout: 10000,
            }
          );
          const pdata = paystackRes.data?.data;

          if (!pdata || pdata.status !== "success") {
            const failReason = pdata?.status || "unknown_paystack_error";

            // Paystack says pending — user hasn't completed the MoMo prompt yet.
            // Skip this record and leave the DB unchanged so the webhook can
            // handle it naturally when the user pays.
            if (failReason === "pending") {
              skipped++;
              results.push({
                ref: tx.reference,
                status: "skipped",
                reason: "payment_still_pending_on_paystack",
              });
              continue;
            }

            // Payment abandoned or failed — mark failed, no delivery.
            // delivery_attempted is intentionally NOT set here because we never
            // reached the provider — this field means "tried to deliver data".
            await executeQuery(
              `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [
                JSON.stringify({
                  paystack_status: failReason,
                  admin_bulk_verified: true,
                  verified_by: auth.user.id,
                }),
                tx.id,
              ]
            );
            failed++;
            results.push({
              ref: tx.reference,
              status: "failed",
              reason: `paystack_status_${failReason}`,
            });
            continue;
          }

          // Verify amount matches (prevents amount-tampered references)
          const expectedAmount = parseFloat(tx.amount);
          const expectedPesewas = Math.round(expectedAmount * 100);
          const paidPesewas = Math.round((pdata.amount / 100) * 100);

          if (paidPesewas < expectedPesewas) {
            await executeQuery(
              `UPDATE transactions SET status = 'failed', metadata = metadata || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [
                JSON.stringify({
                  paystack_status: "amount_mismatch",
                  paid_pesewas: paidPesewas,
                  expected_pesewas: expectedPesewas,
                  admin_bulk_verified: true,
                  verified_by: auth.user.id,
                  delivery_attempted: true,
                }),
                tx.id,
              ]
            );
            failed++;
            results.push({
              ref: tx.reference,
              status: "failed",
              reason: "amount_mismatch",
            });
            continue;
          }

          // Paystack confirmed success — ensure DB reflects this
          if (tx.status !== "success") {
            await executeQuery(
              `UPDATE transactions SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [tx.id]
            );
            tx.status = "success";
          }
        } catch (psErr) {
          console.error(
            `Paystack pre-verify failed for ${tx.reference}:`,
            psErr.message
          );
          skipped++;
          results.push({
            ref: tx.reference,
            status: "skipped",
            reason: "paystack_api_error",
          });
          continue;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const phoneNumber = meta.phone_number || tx.recipient_phone;
      const dataPlanId = meta.data_plan_id;
      const network = meta.network;

      if (!phoneNumber || !dataPlanId || !network) {
        skipped++;
        results.push({
          ref: tx.reference,
          status: "skipped",
          reason: "missing_phone_or_plan_or_network",
        });
        continue;
      }

      // Fetch plan details
      const planRows = await executeQuery(
        `SELECT id, network, plan_name, data_volume, price,
                COALESCE(cost_price, 0) AS cost_price,
                provider_plan_id, volume_mb
         FROM data_plans WHERE id = $1 AND is_active = true`,
        [dataPlanId]
      );

      if (planRows.length === 0) {
        skipped++;
        results.push({
          ref: tx.reference,
          status: "skipped",
          reason: "plan_not_found_or_inactive",
        });
        continue;
      }

      const plan = planRows[0];

      try {
        let providerRef = null;
        let finalStatus = "pending";
        let providerError = null;

        // ── 1Papi provider ────────────────────────────────────────────────
        if (plan.provider_plan_id) {
          const onepapiWebhookUrl = `${process.env.FRONTEND_URL || "https://putduckdata.com"}/api/1papi-webhook`;
          const providerResult = await buyData(phoneNumber, plan.provider_plan_id, onepapiWebhookUrl);
          providerRef = providerResult.reference || null;

          if (providerResult.success && providerResult.status !== "failed") {
            if (providerResult.status === "completed") {
              finalStatus = "completed";
            } else if (providerResult.status === "pending_manual") {
              finalStatus = "processing";
            } else {
              finalStatus = "pending";
            }

            await executeQuery(
              `UPDATE transactions SET
                 status = $1,
                 metadata = metadata || $2::jsonb,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [
                finalStatus,
                JSON.stringify({
                  provider: "1papi",
                  provider_reference: providerRef,
                  provider_status: providerResult.status,
                  delivery_attempted: true,
                  admin_bulk_verified: true,
                  verified_by: auth.user.id,
                  verified_at: new Date().toISOString(),
                }),
                tx.id,
              ]
            );
            placed++;
            results.push({
              ref: tx.reference,
              status: "placed",
              provider: "1papi",
              provider_ref: providerRef,
              final_status: finalStatus,
            });
          } else {
            providerError = providerResult.message || "Provider rejected the order";

            if (isProviderBalanceError(providerError)) {
              // Provider has insufficient balance — keep queued for manual, don't refund
              await executeQuery(
                `UPDATE transactions SET
                   status = 'processing',
                   metadata = metadata || $1::jsonb,
                   updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [
                  JSON.stringify({
                    provider_error: providerError,
                    needs_manual_fulfil: true,
                    manual_reason: "provider_low_balance",
                    admin_bulk_verified: true,
                    verified_by: auth.user.id,
                    verified_at: new Date().toISOString(),
                  }),
                  tx.id,
                ]
              );
              skipped++;
              results.push({
                ref: tx.reference,
                status: "skipped",
                reason: "provider_low_balance",
                error: providerError,
              });
            } else {
              finalStatus = "failed";

              if (tx.type === "data_purchase" && tx.user_id) {
                await executeTransaction(async (sql) => {
                  await sql(
                    "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    [parseFloat(tx.amount), tx.user_id]
                  );
                  await sql(
                    `UPDATE transactions SET
                       status = 'failed',
                       metadata = metadata || $1::jsonb,
                       updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2`,
                    [
                      JSON.stringify({
                        provider: "1papi",
                        provider_error: providerError,
                        auto_refunded: true,
                        refund_amount: parseFloat(tx.amount),
                        admin_bulk_verified: true,
                        verified_by: auth.user.id,
                        verified_at: new Date().toISOString(),
                      }),
                      tx.id,
                    ]
                  );
                });
                try {
                  await createNotification(
                    tx.user_id,
                    NotificationType.DATA_PURCHASE,
                    "Bulk Verify Failed — Refunded",
                    `Your order (${tx.reference}) failed during bulk verification. GH₵${parseFloat(tx.amount).toFixed(2)} has been refunded to your wallet.`,
                    { refunded: true, amount: parseFloat(tx.amount) }
                  );
                } catch (_) {}
              } else {
                await executeQuery(
                  `UPDATE transactions SET
                     status = 'failed',
                     metadata = metadata || $1::jsonb,
                     updated_at = CURRENT_TIMESTAMP
                   WHERE id = $2`,
                  [
                    JSON.stringify({
                      provider: "1papi",
                      provider_error: providerError,
                      delivery_attempted: true,
                      admin_bulk_verified: true,
                      verified_by: auth.user.id,
                      verified_at: new Date().toISOString(),
                    }),
                    tx.id,
                  ]
                );
              }
              failed++;
              results.push({
                ref: tx.reference,
                status: "failed",
                provider: "1papi",
                error: providerError,
              });
            }
          }
        } else {
          // No provider_plan_id — queue for manual
          await executeQuery(
            `UPDATE transactions SET
               status = 'processing',
               metadata = metadata || $1::jsonb,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [
              JSON.stringify({
                provider_mode: "no_provider_id",
                needs_manual_fulfil: true,
                admin_bulk_verified: true,
                verified_by: auth.user.id,
                verified_at: new Date().toISOString(),
              }),
              tx.id,
            ]
          );
          placed++;
          results.push({
            ref: tx.reference,
            status: "queued_manual",
            reason: "no_provider_plan_id",
          });
        }
      } catch (err) {
        console.error(`Bulk verify error for ${tx.reference}:`, err.message);
        failed++;
        results.push({
          ref: tx.reference,
          status: "error",
          error: err.message,
        });
      }
    }

    return successResponse(
      200,
      {
        total_checked: pendingTx.length,
        placed,
        failed,
        skipped,
        provider: "1papi",
        results,
      },
      `Bulk verify complete: ${placed} placed, ${failed} failed, ${skipped} skipped`
    );
  } catch (error) {
    console.error("Bulk verify pending 24h error:", error);
    return errorResponse(500, error.message || "Bulk verification failed");
  }
};

/**
 * Admin Order Tracking
 * GET /api/admin-orders?type=all&status=all&limit=50&offset=0&search=
 *
 * Returns all transactions across all users with user details
 * Admin can filter by type, status, and search by user name/email/reference
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();

  // ── GET: list / search orders ─────────────────────────────────────────
  if (event.httpMethod === "GET")
    try {
      const auth = await authenticateUser(event.headers);
      if (!auth.authenticated)
        return errorResponse(401, "Authentication required");
      if (!hasRole(auth.user, "admin"))
        return errorResponse(403, "Admin access required");
      const isRealAdmin = await verifyAdminFromDB(auth.user.id);
      if (!isRealAdmin) return errorResponse(403, "Admin access revoked");

      const params = event.queryStringParameters || {};
      const type = params.type || "all";
      const status = params.status || "all";
      const search = params.search || "";
      const limit = Math.min(parseInt(params.limit) || 50, 100);
      const offset = parseInt(params.offset) || 0;

      // Build query conditions
      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (type !== "all") {
        conditions.push(`t.type = $${paramIdx++}`);
        values.push(type);
      }

      if (status !== "all") {
        conditions.push(`t.status = $${paramIdx++}`);
        values.push(status);
      }

      if (search.trim()) {
        conditions.push(
          `(u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR t.reference ILIKE $${paramIdx} OR t.recipient_phone ILIKE $${paramIdx})`
        );
        values.push(`%${search.trim()}%`);
        paramIdx++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Get transactions with user info (LEFT JOIN to include guest orders where user_id is null)
      const transactions = await executeQuery(
        `SELECT t.id, t.user_id, t.type, t.amount, t.status, t.reference,
              t.recipient_phone, t.metadata, t.created_at,
              COALESCE(u.full_name, 'Guest') as user_name,
              COALESCE(u.email, 'guest') as user_email
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...values, limit, offset]
      );

      // Get total count
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}`,
        values
      );

      const total = parseInt(countResult[0].total);

      // Get summary stats (include both 'success' and 'completed' as successful; include guest purchases)
      const stats = await executeQuery(
        `SELECT
        COUNT(*) FILTER (WHERE status IN ('success', 'completed')) as successful,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('success', 'completed') AND type IN ('wallet_fund', 'wallet_funding')), 0) as total_funded,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('success', 'completed') AND type IN ('data_purchase', 'guest_data_purchase')), 0) as total_purchases,
        COUNT(*) FILTER (WHERE type IN ('data_purchase', 'guest_data_purchase') AND status IN ('success', 'completed')) as data_orders,
        COUNT(*) FILTER (WHERE type IN ('wallet_fund', 'wallet_funding') AND status IN ('success', 'completed')) as fund_orders
       FROM transactions`
      );

      return successResponse(200, {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          user_id: tx.user_id,
          user_name: tx.user_name,
          user_email: tx.user_email,
          type: tx.type,
          amount: parseFloat(tx.amount),
          status: tx.status,
          reference: tx.reference,
          recipient_phone: tx.recipient_phone,
          metadata: tx.metadata,
          created_at: tx.created_at,
        })),
        stats: {
          successful: parseInt(stats[0].successful),
          pending: parseInt(stats[0].pending),
          failed: parseInt(stats[0].failed),
          total_funded: parseFloat(stats[0].total_funded),
          total_purchases: parseFloat(stats[0].total_purchases),
          data_orders: parseInt(stats[0].data_orders),
          fund_orders: parseInt(stats[0].fund_orders),
        },
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
        },
      });
    } catch (error) {
      console.error("Admin orders error:", error);
      return errorResponse(500, "Failed to retrieve orders");
    }

  // ── PUT: update a single order status ────────────────────────────────
  if (event.httpMethod === "PUT") {
    try {
      const auth = await authenticateUser(event.headers);
      if (!auth.authenticated)
        return errorResponse(401, "Authentication required");
      if (!hasRole(auth.user, "admin"))
        return errorResponse(403, "Admin access required");

      const body = JSON.parse(event.body || "{}");
      const { transaction_id, action, admin_note } = body;

      if (!action) {
        return errorResponse(400, "action is required");
      }

      const validActions = [
        "complete",
        "fail",
        "refund",
        "pending",
        "processing",
        "abandon",
        "verify_paystack",
        "verify_pending_24h",
      ];
      if (!validActions.includes(action)) {
        return errorResponse(
          400,
          `action must be one of: ${validActions.join(", ")}`
        );
      }

      // ── Bulk: verify all pending orders from last 24h ────────────────────
      if (action === "verify_pending_24h") {
        return await handleVerifyPending24h(auth, body);
      }

      if (!transaction_id) {
        return errorResponse(400, "transaction_id is required");
      }

      // Defense-in-depth: re-verify admin status from DB for destructive actions
      const isRealAdmin = await verifyAdminFromDB(auth.user.id);
      if (!isRealAdmin) {
        return errorResponse(403, "Admin access revoked");
      }

      // Fetch the transaction
      const txRows = await executeQuery(
        "SELECT id, user_id, amount, status, reference, type, created_at FROM transactions WHERE id = $1",
        [transaction_id]
      );
      if (txRows.length === 0)
        return errorResponse(404, "Transaction not found");

      const tx = txRows[0];

      if (action === "verify_paystack") {
        // ── Admin-triggered Paystack verification ──────────────────────────
        if (!tx.reference)
          return errorResponse(400, "Transaction has no Paystack reference");
        if (tx.status === "success" || tx.status === "completed") {
          return successResponse(
            200,
            { transaction_id, paystack_status: tx.status },
            "Transaction already verified"
          );
        }

        // Try-catch with proper error handling and timeout
        let pdata;
        try {
          const paystackRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(
              tx.reference
            )}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
              timeout: 15000, // 15s timeout — don't hang forever
            }
          );

          // Validate response structure
          if (!paystackRes.data) {
            console.error("Paystack verify: missing response data", {
              reference: tx.reference,
            });
            return errorResponse(502, "Invalid response from payment provider");
          }

          pdata = paystackRes.data.data;

          if (!pdata) {
            console.error("Paystack verify: missing data object", {
              reference: tx.reference,
              response: paystackRes.data,
            });
            return errorResponse(502, "Invalid payment verification response");
          }

          console.log("Paystack verify success:", {
            reference: tx.reference,
            status: pdata.status,
            amount: pdata.amount,
          });
        } catch (psErr) {
          console.error("Paystack verify error:", {
            reference: tx.reference,
            error: psErr.message,
            code: psErr.code,
            response: psErr.response?.data,
          });

          // Handle specific error types
          if (psErr.code === "ECONNABORTED") {
            return errorResponse(
              504,
              "Payment provider timeout. Please try again."
            );
          }
          if (psErr.response) {
            return errorResponse(
              psErr.response.status,
              psErr.response.data?.message || "Payment provider error"
            );
          }
          if (psErr.request) {
            return errorResponse(
              503,
              "Cannot connect to payment provider. Please try again later."
            );
          }
          return errorResponse(
            502,
            "Payment verification failed. Please try again."
          );
        }

        if (pdata.status === "success") {
          // Payment confirmed — credit wallet for wallet_fund transactions
          if (tx.type === "wallet_fund" || tx.type === "wallet_funding") {
            await executeTransaction(async (sql) => {
              const check = await sql(
                "SELECT status FROM transactions WHERE id = $1 FOR UPDATE",
                [tx.id]
              );
              if (check[0].status === "success") return; // already done
              await sql(
                "UPDATE transactions SET status = $1, metadata = COALESCE(metadata, $2::jsonb) || $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
                [
                  "success",
                  JSON.stringify({
                    admin_verified: true,
                    verified_by: auth.user.id,
                  }),
                  tx.id,
                ]
              );
              await sql(
                "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [parseFloat(tx.amount), tx.user_id]
              );
            });
            await createNotification(
              tx.user_id,
              NotificationType.WALLET_FUND_SUCCESS,
              "Wallet Funded",
              `Your wallet has been credited GH₵${parseFloat(tx.amount).toFixed(
                2
              )} (verified by admin).`,
              { amount: parseFloat(tx.amount), reference: tx.reference }
            );
          } else {
            await executeQuery(
              `UPDATE transactions SET status = 'success', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [
                JSON.stringify({
                  admin_verified: true,
                  verified_by: auth.user.id,
                }),
                tx.id,
              ]
            );
          }
          return successResponse(
            200,
            { transaction_id, paystack_status: "success" },
            "Paystack verified: payment successful — transaction updated"
          );
        } else {
          // Payment not successful on Paystack
          await executeQuery(
            `UPDATE transactions SET status = 'failed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [
              JSON.stringify({
                admin_verified: true,
                paystack_result: pdata.status,
                verified_by: auth.user.id,
              }),
              tx.id,
            ]
          );
          return successResponse(
            200,
            { transaction_id, paystack_status: pdata.status },
            `Paystack result: ${pdata.status} — marked as failed`
          );
        }
      } else if (action === "abandon") {
        // ── Flag abandoned (pending with no payment activity) ─────────────
        await executeQuery(
          `UPDATE transactions SET status = 'failed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [
            JSON.stringify({
              abandoned: true,
              flagged_by: auth.user.id,
              admin_note: admin_note || "Abandoned by admin",
            }),
            tx.id,
          ]
        );
        return successResponse(
          200,
          { transaction_id, action },
          "Transaction flagged as abandoned"
        );
      } else if (action === "refund") {
        // Refund: credit wallet + mark failed
        await executeTransaction(async (sql) => {
          await sql(
            "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [parseFloat(tx.amount), tx.user_id]
          );
          await sql(
            `UPDATE transactions SET status = 'failed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [
              JSON.stringify({
                admin_refunded: true,
                refund_by: auth.user.id,
                admin_note: admin_note || null,
              }),
              tx.id,
            ]
          );
        });
        await createNotification(
          tx.user_id,
          NotificationType.DATA_PURCHASE,
          "Order Refunded by Admin",
          `Your order (${tx.reference}) has been refunded. GH₵${parseFloat(
            tx.amount
          ).toFixed(2)} credited to your wallet.`,
          {
            refunded: true,
            amount: parseFloat(tx.amount),
            reference: tx.reference,
          }
        );
      } else if (action === "complete") {
        // SECURITY FIX: Verify payment with Paystack before marking as complete
        // Only allow completion for types that require payment verification
        const requiresVerification =
          tx.type === "wallet_fund" ||
          tx.type === "wallet_funding" ||
          tx.type === "guest_data_purchase";

        if (requiresVerification && tx.reference) {
          // Verify payment via Paystack API first
          let paystackVerified = false;
          let paystackStatus = null;

          try {
            const paystackRes = await axios.get(
              `https://api.paystack.co/transaction/verify/${encodeURIComponent(
                tx.reference
              )}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
                timeout: 15000,
              }
            );

            if (paystackRes.data?.data) {
              paystackStatus = paystackRes.data.data.status;
              paystackVerified = paystackStatus === "success";
            }
          } catch (psErr) {
            console.error(
              "Paystack verification error for complete action:",
              psErr.message
            );
          }

          // Only allow completion if Paystack confirms payment was successful
          if (!paystackVerified) {
            return errorResponse(
              400,
              paystackStatus
                ? `Cannot complete: Paystack status is "${paystackStatus}". Only completed payments can be marked as done.`
                : "Cannot complete: Payment verification failed. Please try again."
            );
          }

          // Payment verified - mark as completed with verification metadata
          await executeQuery(
            `UPDATE transactions SET status = 'completed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [
              JSON.stringify({
                admin_updated_by: auth.user.id,
                admin_note: admin_note || null,
                paystack_verified: true,
                paystack_status: paystackStatus,
              }),
              tx.id,
            ]
          );

          await createNotification(
            tx.user_id,
            NotificationType.DATA_PURCHASE_SUCCESS,
            "Order Completed",
            `Your order (${tx.reference}) has been marked as completed and payment verified.`,
            { reference: tx.reference }
          );

          return successResponse(
            200,
            { transaction_id, action: "complete", paystack_verified: true },
            "Order completed and payment verified successfully"
          );
        } else {
          // Non-payment transactions (like data_purchase from wallet) can be completed directly
          // as they were already paid via wallet deduction
          await executeQuery(
            `UPDATE transactions SET status = 'completed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [
              JSON.stringify({
                admin_updated_by: auth.user.id,
                admin_note: admin_note || null,
              }),
              tx.id,
            ]
          );

          await createNotification(
            tx.user_id,
            NotificationType.DATA_PURCHASE_SUCCESS,
            "Order Completed",
            `Your order (${tx.reference}) has been marked as completed.`,
            { reference: tx.reference }
          );
        }
      } else if (action === "fail") {
        await executeQuery(
          `UPDATE transactions SET status = 'failed', metadata = COALESCE(metadata, '{}') || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [
            JSON.stringify({
              admin_updated_by: auth.user.id,
              admin_note: admin_note || null,
            }),
            tx.id,
          ]
        );
      } else {
        const newStatus = {
          pending: "pending",
          processing: "processing",
        }[action];

        await executeQuery(
          `UPDATE transactions SET status = $1, metadata = COALESCE(metadata, '{}') || $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [
            newStatus,
            JSON.stringify({
              admin_updated_by: auth.user.id,
              admin_note: admin_note || null,
            }),
            tx.id,
          ]
        );
      }

      return successResponse(
        200,
        { transaction_id, action },
        `Order ${action} successful`
      );
    } catch (error) {
      console.error("Admin orders PUT error:", error);
      return errorResponse(500, "Failed to update order");
    }
  }

  return errorResponse(405, "Method not allowed");
};
