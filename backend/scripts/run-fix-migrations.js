import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env') });
dotenv.config({ path: join(__dir, '../.env') });

const sql = neon(process.env.DATABASE_URL);

const steps = [
  { name: 'index: transactions.type',             fn: () => sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)` },
  { name: 'index: transactions.created_at',       fn: () => sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)` },
  { name: 'index: momo_payments.user_id',         fn: () => sql`CREATE INDEX IF NOT EXISTS idx_momo_user_id ON momo_payments(user_id)` },
  { name: 'index: momo_payments.status',          fn: () => sql`CREATE INDEX IF NOT EXISTS idx_momo_status ON momo_payments(status)` },
  { name: 'index: momo_payments.reference',       fn: () => sql`CREATE INDEX IF NOT EXISTS idx_momo_reference ON momo_payments(reference)` },
  { name: 'index: broadcasts.is_active',          fn: () => sql`CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON broadcasts(is_active)` },
  { name: 'index: broadcasts.targets',            fn: () => sql`CREATE INDEX IF NOT EXISTS idx_broadcasts_targets ON broadcasts(targets)` },
  { name: 'index: broadcasts.created_at',         fn: () => sql`CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at DESC)` },
  {
    name: 'broadcasts — drop and recreate active_broadcasts view',
    fn: async () => {
      await sql`DROP VIEW IF EXISTS active_broadcasts`;
      await sql`
        CREATE VIEW active_broadcasts AS
        SELECT id, title, message, url, targets, is_active, created_at
        FROM broadcasts
        WHERE is_active = true
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
        LIMIT 5
      `;
    },
  },
];

const run = async () => {
  console.log(`🔧 Fixing ${steps.length} steps...\n`);
  let ok = 0, fail = 0;
  for (const step of steps) {
    try {
      await step.fn();
      console.log(`  ✅ ${step.name}`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${step.name}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n${fail === 0 ? '✅' : '⚠️ '} Done — ${ok} passed, ${fail} failed`);
};

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
