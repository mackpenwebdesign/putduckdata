import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env') });
dotenv.config({ path: join(__dir, '../.env') });

const { fetchPlans, buyData, checkOrderStatus } = await import('../utils/onepapi.js');

const phone = process.argv[2] || '0241234567';
const planId = process.argv[3];

console.log('📋 Fetching 1Papi plans...\n');
const plans = await fetchPlans();
console.log(`Found ${plans.length} plans:\n`);
plans.slice(0, 5).forEach(p => {
  console.log(`  [${p.id}] ${p.network} ${p.data_volume} — GH₵${p.price}`);
});

if (planId && phone) {
  console.log(`\n📦 Buying plan ${planId} → ${phone}\n`);
  const result = await buyData(phone, planId);
  console.log('Result:', JSON.stringify(result, null, 2));
  if (result.success) {
    console.log(`\n✅ SUCCESS — ref: ${result.reference}`);
  } else {
    console.log(`\n❌ FAILED — ${result.message}`);
  }
} else {
  console.log('\nUsage: node scripts/test-provider.js <phone> <plan_id>');
}
