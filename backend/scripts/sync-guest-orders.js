#!/usr/bin/env node
/**
 * Sync Guest Order Statuses
 * Finds pending/processing guest_data_purchase orders (<24h)
 * Polls provider for status → updates DB + notifies
 */

import { executeQuery, executeTransaction } from "../utils/db.js";
import { checkOrderStatus, buyData } from "../utils/onepapi.js";
import {
  createNotification,
  notifyAdmins,
  NotificationType,
} from "../utils/notifications.js";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = 50;

async function syncGuestOrders() {
  console.log("🔍 Scanning guest orders...");

  // Find stuck guest orders (<24h, pending/processing, has provider_ref)
  const stuckOrders = await executeQuery(
    `
    SELECT id, reference, status, metadata, recipient_phone, amount, created_at
    FROM transactions 
    WHERE type = 'guest_data_purchase' 
      AND status IN ('pending', 'processing')
      AND created_at > NOW() - INTERVAL '24 hours'
      AND metadata->>'provider_reference' IS NOT NULL
    ORDER BY updated_at ASC
    LIMIT $1
  `,
    [LIMIT]
  );

  console.log(`📋 Found ${stuckOrders.length} stuck guest orders`);

  let completed = 0,
    failed = 0,
    refunded = 0,
    unchanged = 0;

  for (const order of stuckOrders) {
    let meta = {};
    try {
      meta =
        typeof order.metadata === "string"
          ? JSON.parse(order.metadata)
          : order.metadata || {};
    } catch {}

    const providerRef = meta.provider_reference;
    const phone = order.recipient_phone || meta.phone_number;

    console.log(`\n📦 Processing ${order.reference} (1papi:${providerRef})`);

    try {
      let newStatus = order.status;
      let providerData = null;

      // Poll 1Papi status
      if (providerRef) {
        providerData = await checkOrderStatus(providerRef);
        console.log(`   1Papi: ${providerData?.status}`);

        if (providerData?.status === "completed") {
          newStatus = "completed";
        } else if (providerData?.status === "failed") {
          newStatus = "failed";
        }
        // pending/pending_manual → keep pending
      }

      if (!DRY_RUN) {
        if (newStatus !== order.status) {
          await executeQuery(
            `
            UPDATE transactions 
            SET status = $1, metadata = metadata || $2::jsonb, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `,
            [
              newStatus,
              JSON.stringify({
                auto_synced: true,
                synced_at: new Date().toISOString(),
                provider_status: providerData?.status,
              }),
              order.id,
            ]
          );

          if (newStatus === "completed") {
            completed++;
            await createNotification(
              null,
              NotificationType.GUEST_ORDER_COMPLETE,
              "Order Complete",
              `Guest order ${order.reference} delivered!`
            );
          } else if (newStatus === "failed") {
            failed++;
            // Notify admins for manual refund
            await notifyAdmins(
              NotificationType.ADMIN_ALERT,
              "Guest Order Failed",
              `Guest ${order.reference} failed at provider. Manual refund needed. Phone: ${phone}`
            );
          }
        } else {
          unchanged++;
        }
      } else {
        console.log(`   [DRY] Would set: ${newStatus}`);
      }
    } catch (err) {
      console.error(`❌ Error ${order.reference}:`, err.message);
    }
  }

  console.log("\n✅ SUMMARY:", {
    scanned: stuckOrders.length,
    completed,
    failed,
    refunded,
    unchanged,
  });
}

syncGuestOrders().catch(console.error);
