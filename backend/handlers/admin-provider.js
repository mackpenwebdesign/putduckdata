import { executeQuery, executeTransaction } from "../utils/db.js";
import { authenticateUser, hasRole } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { fetchPlans, checkOrderStatus } from "../utils/onepapi.js";
import {
  createNotification,
  NotificationType,
} from "../utils/notifications.js";

/**
 * Admin — Provider Management (1Papi)
 * GET  /api/admin-provider?action=balance|plans|key-info|sync|sync-orders
 * POST /api/admin-provider  { action: "check-order", reference: "..." }
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) {
      return errorResponse(401, auth.error);
    }
    if (!hasRole(auth.user, "admin")) {
      return errorResponse(403, "Admin access required");
    }

    const action = event.queryStringParameters?.action;

    // ── GET actions ──────────────────────────────────────────────────────────
    if (event.httpMethod === "GET") {
      switch (action) {
        case "balance": {
          return errorResponse(501, "Balance check not supported by 1Papi");
        }

        case "plans": {
          const plans = await fetchPlans();
          return successResponse(200, { plans, total: plans.length });
        }

        case "key-info": {
          return errorResponse(501, "Key info not supported by 1Papi");
        }

        case "sync": {
          // Fetch plans from provider and update provider_plan_id + cost_price in our DB
          const plans = await fetchPlans();
          let updated = 0;
          let skipped = 0;

          for (const p of plans) {
            const dbNetwork = (p.network || "")
              .toUpperCase()
              .replace(/[\s_-]/g, "")
              .replace(/^AT$|^AIRTELTIGO$/, "AIRTEL_TIGO")
              .replace(/^VODAFONE$/, "TELECEL");
            const dbVolume = (p.data_volume || "")
              .toUpperCase()
              .replace(/\s/g, "");

            // Match by provider_plan_id OR network+data_volume fallback.
            // Always write provider_plan_id so future syncs work by ID.
            const result = await executeQuery(
              `UPDATE data_plans
               SET cost_price       = $1,
                   provider_plan_id = $2,
                   updated_at       = CURRENT_TIMESTAMP
               WHERE provider_plan_id = $2
                  OR (network = $3 AND UPPER(REPLACE(data_volume, ' ', '')) = $4)
               RETURNING id`,
              [parseFloat(p.price), p.id, dbNetwork, dbVolume]
            );
            if (result.length > 0) {
              updated++;
            } else {
              skipped++;
            }
          }

          return successResponse(
            200,
            {
              updated,
              skipped,
              total_provider_plans: plans.length,
            },
            `Synced ${updated} plan prices from 1Papi`
          );
        }

        case "sync-orders": {
          // Check all pending/processing data_purchase transactions against provider
          const pendingTx = await executeQuery(
            `SELECT id, user_id, amount, status, reference, metadata
             FROM transactions
             WHERE type = 'data_purchase'
               AND status IN ('pending', 'processing')
               AND metadata->>'provider_reference' IS NOT NULL
             ORDER BY created_at ASC
             LIMIT 50`
          );

          let synced = 0,
            completed = 0,
            failed = 0,
            unchanged = 0;
          const results = [];

          for (const tx of pendingTx) {
            const providerRef = tx.metadata?.provider_reference;
            if (!providerRef) {
              unchanged++;
              continue;
            }

            try {
              const providerStatus = await checkOrderStatus(providerRef);
              const status = (providerStatus.status || "").toLowerCase();

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
                completed++;
                results.push({
                  ref: tx.reference,
                  from: tx.status,
                  to: "completed",
                });
              } else if (["failed", "rejected", "cancelled"].includes(status)) {
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
                    ).toFixed(2)} has been refunded to your wallet.`,
                    { refunded: true, amount: parseFloat(tx.amount) }
                  );
                } catch (_) {
                  /* notification failure is non-critical */
                }
                failed++;
                results.push({
                  ref: tx.reference,
                  from: tx.status,
                  to: "failed",
                  refunded: true,
                });
              } else {
                unchanged++;
                results.push({
                  ref: tx.reference,
                  status: tx.status,
                  provider_status: status,
                });
              }
              synced++;
            } catch (err) {
              console.error(
                `Sync check failed for ${tx.reference}:`,
                err.message
              );
              results.push({ ref: tx.reference, error: err.message });
            }
          }

          return successResponse(
            200,
            {
              total_checked: pendingTx.length,
              synced,
              completed,
              failed,
              unchanged,
              results,
            },
            `Synced ${synced} orders: ${completed} completed, ${failed} failed, ${unchanged} unchanged`
          );
        }

        default:
          return errorResponse(
            400,
            "Invalid action. Use: balance, plans, key-info, sync, sync-orders"
          );
      }
    }

    // ── POST actions ─────────────────────────────────────────────────────────
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body);

      if (body.action === "check-order") {
        if (!body.reference) {
          return errorResponse(400, "reference is required");
        }
        const result = await checkOrderStatus(body.reference);
        return successResponse(200, { order: result });
      }

      return errorResponse(400, "Invalid action. POST supports: check-order");
    }

    return errorResponse(405, "Method not allowed");
  } catch (error) {
    console.error("Admin provider error:", error);
    return errorResponse(500, error.message || "Provider API error");
  }
};
