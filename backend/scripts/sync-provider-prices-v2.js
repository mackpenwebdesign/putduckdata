#!/usr/bin/env node
/**
 * Provider Sync v2 — Fuzzy Match by Volume/Network
 * Run: cd backend && node scripts/sync-provider-prices-v2.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });
dotenv.config({ path: join(__dir, "../../.env") });

// Dynamic imports so env is loaded before module constants are evaluated
const { executeQuery } = await import("../utils/db.js");
const { fetchPlans } = await import("../utils/onepapi.js");

async function syncV2() {
  console.log("🔄 1Papi v2 sync (fuzzy match)...\n");

  const providerPlans = await fetchPlans();
  console.log(`✅ ${providerPlans.length} provider plans`);

  let matched = 0,
    updated = 0,
    activated = 0;

  for (const p of providerPlans) {
    const matches = await executeQuery(
      `SELECT id, plan_name, data_volume, network, cost_price
       FROM data_plans
       WHERE LOWER(network) = LOWER($1)
         AND UPPER(REPLACE(data_volume, ' ', '')) = UPPER(REPLACE($2, ' ', ''))
       LIMIT 1`,
      [p.network, p.data_volume]
    );

    if (matches.length === 0) {
      console.log(`❌ No match: ${p.network} ${p.data_volume} (GH₵${p.price})`);
      continue;
    }

    const plan = matches[0];
    const oldCost = parseFloat(plan.cost_price || 0);
    const newCost = parseFloat(p.price);

    if (Math.abs(oldCost - newCost) > 0.01) {
      await executeQuery(
        `UPDATE data_plans SET
           cost_price = $1, provider_plan_id = $2,
           updated_at = CURRENT_TIMESTAMP, is_active = true
         WHERE id = $3`,
        [newCost, p.id, plan.id]
      );
      updated++;
      console.log(`💰 ${plan.plan_name}: GH₵${oldCost.toFixed(2)} → GH₵${newCost.toFixed(2)} ✅`);
    } else {
      await executeQuery(
        `UPDATE data_plans SET provider_plan_id = $1, is_active = true WHERE id = $2`,
        [p.id, plan.id]
      );
    }

    matched++;
    activated++;
  }

  console.log("\n📊 SYNC SUMMARY:");
  console.log(`✅ Matched:        ${matched}`);
  console.log(`💵 Prices updated: ${updated}`);
  console.log(`🟢 Plans activated: ${activated}`);
  console.log(`📦 Provider plans: ${providerPlans.length}`);
  process.exit(0);
}

syncV2().catch((err) => { console.error("Sync failed:", err.message); process.exit(1); });
