#!/usr/bin/env node
/**
 * Strip time-period suffixes (Monthly, Weekly, Daily) from plan names.
 * If stripping would create a duplicate (same network + volume), deactivate
 * the old plan instead of renaming it.
 *
 * Run: cd backend && node --env-file=../.env scripts/strip-plan-name-suffixes.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });
dotenv.config({ path: join(__dir, "../../.env") });

const { executeQuery } = await import("../utils/db.js");

const SUFFIX_RE = /\s*(Monthly|Weekly|Daily)\s*$/i;

const plans = await executeQuery("SELECT id, network, plan_name, volume_mb, data_volume, is_active FROM data_plans ORDER BY id");

let renamed = 0, deactivated = 0, skipped = 0;

for (const plan of plans) {
  if (!SUFFIX_RE.test(plan.plan_name)) { skipped++; continue; }

  const newName = plan.plan_name.replace(SUFFIX_RE, "").trim();

  // Check if another active plan with same network + volume already exists
  const dups = plans.filter(p =>
    p.id !== plan.id &&
    p.network === plan.network &&
    p.volume_mb != null &&
    plan.volume_mb != null &&
    p.volume_mb === plan.volume_mb &&
    !SUFFIX_RE.test(p.plan_name)
  );

  if (dups.length > 0) {
    await executeQuery(
      `UPDATE data_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [plan.id]
    );
    deactivated++;
    console.log(`🔕 Deactivated duplicate: "${plan.plan_name}" (kept: "${dups[0].plan_name}")`);
  } else {
    await executeQuery(
      `UPDATE data_plans SET plan_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newName, plan.id]
    );
    renamed++;
    console.log(`✏️  Renamed: "${plan.plan_name}" → "${newName}"`);
  }
}

console.log(`\n📊 Done: ${renamed} renamed, ${deactivated} deactivated as duplicates, ${skipped} unchanged`);
process.exit(0);
