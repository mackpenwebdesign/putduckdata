/**
 * Local development server
 * Run: node server.js
 * This starts the Express app on PORT (default 8888) for local dev.
 * In production, Vercel uses api/index.js directly (serverless).
 */

// 1. Load environment variables immediately
import "dotenv/config";

// TEMP DEBUG - remove after fixing
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL
    ? "✅ Loaded: " + process.env.DATABASE_URL.substring(0, 40) + "..."
    : "❌ NOT LOADED - check your .env file"
);

// 2. Import core modules
import app from "./api/index.js";
import cron from "node-cron";
import { syncPricesCron } from "./handlers/auto-sync-plans.js";

const PORT = process.env.PORT || 8888;

/**
 * Scheduled Tasks
 * Weekly auto-sync: Sunday midnight (00:00) Ghana time
 */
cron.schedule(
  "0 0 * * 0",
  async () => {
    console.log("🤖 Weekly price sync starting...");
    try {
      await syncPricesCron(null); // null userId for automated cron
      console.log("✅ Weekly price sync complete");
    } catch (error) {
      console.error("❌ Weekly price sync failed:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Africa/Accra", // Set to local Ghana time
  }
);

/**
 * Start Server
 */
app.listen(PORT, () => {
  console.log(`\n  PutDuckData API`);
  console.log(`  Local:   http://localhost:${PORT}/api`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log("🕐 Weekly auto-sync enabled (Sundays 00:00 GMT)");
  console.log("\n");
});
