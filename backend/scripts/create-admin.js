#!/usr/bin/env node
/**
 * Create or update the admin account.
 * Run: cd backend && node scripts/create-admin.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });
dotenv.config({ path: join(__dir, "../../.env") });

const { default: bcrypt } = await import("bcryptjs");
const { executeQuery } = await import("../utils/db.js");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mackpenwebdesign@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Goday1999@";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

const result = await executeQuery(
  `INSERT INTO users (full_name, email, password_hash, is_admin, wallet_balance)
   VALUES ($1, $2, $3, true, 0)
   ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         is_admin      = true,
         full_name     = EXCLUDED.full_name,
         updated_at    = CURRENT_TIMESTAMP
   RETURNING id, email, is_admin`,
  [ADMIN_NAME, ADMIN_EMAIL, hash]
);

const admin = result[0];
console.log("\n✅ Admin account ready:");
console.log(`   ID:       ${admin.id}`);
console.log(`   Email:    ${admin.email}`);
console.log(`   Password: ${ADMIN_PASSWORD}`);
console.log(`   is_admin: ${admin.is_admin}\n`);
process.exit(0);
