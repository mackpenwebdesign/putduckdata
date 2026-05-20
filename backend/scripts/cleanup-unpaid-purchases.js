#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const cleanup = async () => {
  console.log("🔍 Checking unpaid purchase records...\n");

  // Preview what will be deleted
  const preview = await sql`
    SELECT id, type, status, amount, reference, created_at
    FROM transactions
    WHERE type IN ('data_purchase', 'guest_data_purchase')
      AND status NOT IN ('success', 'completed')
    ORDER BY created_at DESC
  `;

  if (preview.length === 0) {
    console.log("✅ No unpaid purchase records found. Nothing to delete.");
    return;
  }

  console.log(`Found ${preview.length} unpaid purchase record(s) to delete:\n`);
  preview.forEach((tx) => {
    console.log(
      `   [${tx.id}] ${tx.type} | status: ${tx.status} | GH₵${parseFloat(tx.amount).toFixed(2)} | ref: ${tx.reference} | ${new Date(tx.created_at).toLocaleString()}`
    );
  });

  // Delete them
  const deleted = await sql`
    DELETE FROM transactions
    WHERE type IN ('data_purchase', 'guest_data_purchase')
      AND status NOT IN ('success', 'completed')
    RETURNING id
  `;

  console.log(`\n✅ Deleted ${deleted.length} unpaid purchase record(s).`);
};

cleanup().catch((err) => {
  console.error("❌ Cleanup failed:", err.message);
  process.exit(1);
});
