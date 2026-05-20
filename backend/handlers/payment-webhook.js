// Alias — both /api/payment-webhook and /api/paystack-webhook
// use the same complete handler (supports wallet funding + guest purchases)
export { handler } from './paystack-webhook.js';
