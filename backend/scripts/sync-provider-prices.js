#!/usr/bin/env node
/**
 * Provider Price Sync — matches by network + data_volume
 * Run: cd backend && node scripts/sync-provider-prices.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPaths = [join(__dirname, "../.env"), join(__dirname, "../../.env")];

let loaded = false;
for (const p of envPaths) {
  const result = dotenv.config({ path: p });
  if (!result.error) {
    console.log(`✅ Loaded .env from: ${p}`);
    loaded = true;
    break;
  }
}
if (!loaded)
  console.warn("⚠️  No .env file found — relying on system env vars");

const { executeQuery } = await import("../utils/db.js");
const { fetchPlans } = await import("../utils/onepapi.js");

async function syncProviderPrices() {
  console.log("🚀 Starting price sync (match by network + volume)...\n");

  if (!process.env.PROVIDER_API_KEY) {
    console.error("❌ PROVIDER_API_KEY is not set in your .env file.");
    process.exit(1);
  }

  const providerPlans = await fetchPlans();
  console.log(`✅ Got ${providerPlans.length} plans from provider\n`);

  let updated = 0,
    skipped = 0,
    notFound = 0;

  for (const p of providerPlans) {
    // Match by network + data_volume (case-insensitive)
    const matches = await executeQuery(
      `SELECT id, plan_name, cost_price 
       FROM data_plans 
       WHERE UPPER(network) = UPPER($1) 
         AND UPPER(data_volume) = UPPER($2)`,
      [p.network, p.data_volume]
    );

    if (matches.length === 0) {
      console.log(`❌ No match: ${p.network} ${p.data_volume}`);
      notFound++;
      continue;
    }

    const plan = matches[0];
    const oldCost = parseFloat(plan.cost_price) || 0;
    const newCost = parseFloat(p.price);

    if (Math.abs(oldCost - newCost) > 0.01) {
      await executeQuery(
        `UPDATE data_plans 
         SET cost_price = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newCost, plan.id]
      );
      updated++;
      console.log(
        `💰 ${plan.plan_name}: GH₵${oldCost.toFixed(2)} → GH₵${newCost.toFixed(
          2
        )} ✅`
      );
    } else {
      skipped++;
      console.log(
        `✔️  ${plan.plan_name}: GH₵${oldCost.toFixed(2)} (no change)`
      );
    }
  }

  console.log("\n📊 SYNC SUMMARY:");
  console.log(`💰 Prices updated: ${updated}`);
  console.log(`✔️  No change:      ${skipped}`);
  console.log(`❌ Not found:      ${notFound}`);
  console.log(`📦 Total provider: ${providerPlans.length}`);
  console.log("\n✅ Done! Deploy to apply new prices.");
}

syncProviderPrices().catch((e) => {
  console.error("❌ Fatal:", e.message);
  process.exit(1);
});
