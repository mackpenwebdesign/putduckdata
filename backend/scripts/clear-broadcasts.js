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

console.log("🧹 Clearing active broadcasts...\n");

const clearAllBroadcasts = async () => {
  try {
    const result = await sql`
      UPDATE broadcasts
      SET is_active = false
      WHERE is_active = true
      RETURNING id, title, targets
    `;

    if (result.length === 0) {
      console.log("✅ No active broadcasts found");
    } else {
      console.log(`✅ Deactivated ${result.length} broadcast(s):`);
      result.forEach((b) => {
        console.log(`   #${b.id}: "${b.title}" (${b.targets})`);
      });
    }

    console.log("\n✨ Fresh start - send new broadcasts!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

clearAllBroadcasts();
