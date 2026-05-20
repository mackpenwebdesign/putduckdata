#!/usr/bin/env node
/**
 * Sync + Insert Missing Plans from 1Papi
 * - Updates cost_price + provider_plan_id for existing plans
 * - Inserts new plans not yet in DB (price = cost * 1.20, validity = 90 days)
 * Run: cd backend && node --env-file=../.env scripts/sync-add-missing-plans.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });
dotenv.config({ path: join(__dir, "../../.env") });

const { executeQuery } = await import("../utils/db.js");
const { fetchPlans } = await import("../utils/onepapi.js");

const MARKUP = 1.20; // 20% above cost price for new plans

const normalizeVol = (v) => (v || "").toUpperCase().replace(/\s/g, "");

async function run() {
  console.log("🔄 Fetching plans from 1Papi...\n");

  const providerPlans = await fetchPlans();
  console.log(`📦 ${providerPlans.length} plans from provider\n`);

  let inserted = 0, updated = 0, skipped = 0;

  for (const p of providerPlans) {
    const existing = await executeQuery(
      `SELECT id, plan_name, cost_price, provider_plan_id
       FROM data_plans
       WHERE LOWER(network) = LOWER($1)
         AND UPPER(REPLACE(data_volume, ' ', '')) = $2`,
      [p.network, normalizeVol(p.data_volume)]
    );

    const costPrice = parseFloat(p.price);

    if (existing.length > 0) {
      const row = existing[0];
      const oldCost = parseFloat(row.cost_price || 0);
      const costChanged = Math.abs(oldCost - costPrice) > 0.01;
      const idChanged = row.provider_plan_id !== p.id;

      if (costChanged || idChanged) {
        await executeQuery(
          `UPDATE data_plans
           SET cost_price = $1, provider_plan_id = $2,
               validity_days = 90, updated_at = CURRENT_TIMESTAMP, is_active = true
           WHERE id = $3`,
          [costPrice, p.id, row.id]
        );
        updated++;
        console.log(`✏️  Updated: ${p.network} ${p.data_volume} → cost GH₵${costPrice.toFixed(2)} (was GH₵${oldCost.toFixed(2)})`);
      } else {
        // Ensure validity_days = 90 even if nothing else changed
        await executeQuery(
          `UPDATE data_plans SET validity_days = 90, provider_plan_id = $1, is_active = true WHERE id = $2`,
          [p.id, row.id]
        );
        skipped++;
      }
    } else {
      // New plan — insert with 20% markup
      const retailPrice = parseFloat((costPrice * MARKUP).toFixed(2));
      const volumeMb = p.volume_mb || null;

      await executeQuery(
        `INSERT INTO data_plans
           (network, plan_name, data_volume, validity_days, price, cost_price, provider_plan_id, volume_mb, is_active)
         VALUES ($1, $2, $3, 90, $4, $5, $6, $7, true)`,
        [
          p.network,
          p.plan_name,
          p.data_volume,
          retailPrice,
          costPrice,
          p.id,
          volumeMb,
        ]
      );
      inserted++;
      console.log(`➕ Inserted: ${p.network} ${p.data_volume} — cost GH₵${costPrice.toFixed(2)}, retail GH₵${retailPrice.toFixed(2)}`);
    }
  }

  console.log("\n📊 DONE:");
  console.log(`➕ Inserted: ${inserted}`);
  console.log(`✏️  Updated:  ${updated}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`📦 Total from provider: ${providerPlans.length}`);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Script failed:", err.message);
  process.exit(1);
});
