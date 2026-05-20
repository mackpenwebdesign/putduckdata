import { authenticateWithMaintenance } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';
import { generateReference } from '../utils/security.js';
import { notifyAdmins, NotificationType } from '../utils/notifications.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateWithMaintenance(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');
    if (auth.maintenanceBlocked) return errorResponse(503, auth.maintenanceMessage);

    const body = JSON.parse(event.body);
    const { amount, phone_number, transaction_type } = body;

    if (!amount || amount < 10) return errorResponse(400, 'Minimum amount is GH₵10');
    if (!phone_number || !/^0\d{9}$/.test(phone_number)) return errorResponse(400, 'Valid phone number required (10 digits starting with 0)');
    if (!['wallet_fund', 'data_purchase'].includes(transaction_type)) {
      return errorResponse(400, 'Transaction type must be wallet_fund or data_purchase');
    }

    const reference = generateReference('MOMO');

    // Create MoMo payment request
    await executeQuery(
      `INSERT INTO momo_payments (user_id, amount, phone_number, transaction_type, reference, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [auth.user.id, amount, phone_number, transaction_type, reference, JSON.stringify(body.metadata || {})]
    );

    // Also create a pending transaction
    await executeQuery(
      `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
       VALUES ($1, 'wallet_fund', $2, 'pending', $3, $4)`,
      [auth.user.id, amount, reference, JSON.stringify({ payment_method: 'momo', phone_number })]
    );

    // Get user name for admin notification
    const users = await executeQuery('SELECT full_name FROM users WHERE id = $1', [auth.user.id]);

    // Notify admins
    await notifyAdmins(
      NotificationType.MOMO_REQUEST,
      'New MoMo Payment Request',
      `${users[0]?.full_name || 'A user'} submitted a MoMo payment of GH₵${parseFloat(amount).toFixed(2)} from ${phone_number}`,
      { user_id: auth.user.id, amount, phone_number, reference }
    );

    return successResponse(201, {
      reference,
      amount: parseFloat(amount),
      status: 'pending',
      message: 'Your MoMo payment has been submitted. It will be reviewed and approved shortly.'
    }, 'MoMo payment submitted successfully');
  } catch (error) {
    console.error('MoMo submit error:', error);
    return errorResponse(500, 'Failed to submit MoMo payment');
  }
};
