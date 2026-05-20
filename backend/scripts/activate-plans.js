#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../.env") });

const { executeQuery } = await import("../utils/db.js");

// Check current status
const all = await executeQuery(
  "SELECT network, COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM data_plans GROUP BY network"
);
console.log("\n📊 Current status:");
all.forEach((r) =>
  console.log(`  ${r.network}: ${r.active}/${r.total} active`)
);

// Activate all plans
const result = await executeQuery(
  "UPDATE data_plans SET is_active = true RETURNING id"
);
console.log(`\n✅ Activated ${result.length} plans`);

// Confirm
const check = await executeQuery(
  "SELECT network, COUNT(*) as total FROM data_plans WHERE is_active = true GROUP BY network"
);
console.log("\n🟢 Now active:");
check.forEach((r) => console.log(`  ${r.network}: ${r.total} plans`));

process.exit(0);
