import { authenticateUser, hasRole, verifyAdminFromDB } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery, executeTransaction } from '../utils/db.js';
import { generateReference } from '../utils/security.js';
import { createNotification, NotificationType } from '../utils/notifications.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');
    if (!hasRole(auth.user, 'admin')) return errorResponse(403, 'Admin access required');
    if (!(await verifyAdminFromDB(auth.user.id))) return errorResponse(403, 'Admin access required');

    const body = JSON.parse(event.body);
    const { user_id, amount, reason, operation } = body;

    if (!user_id || !amount || amount <= 0) {
      return errorResponse(400, 'Valid user_id and positive amount are required');
    }

    const isDeduct = operation === 'deduct';

    // Verify target user exists
    const users = await executeQuery('SELECT id, full_name, wallet_balance FROM users WHERE id = $1', [user_id]);
    if (users.length === 0) return errorResponse(404, 'User not found');

    const targetUser = users[0];

    // If deducting, check sufficient balance
    if (isDeduct && parseFloat(targetUser.wallet_balance) < amount) {
      return errorResponse(400, `Insufficient balance. User has GH₵${parseFloat(targetUser.wallet_balance).toFixed(2)}`);
    }

    const reference = generateReference(isDeduct ? 'ADMIN-DEDUCT' : 'ADMIN-FUND');

    await executeTransaction(async (sql) => {
      if (isDeduct) {
        await sql('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, user_id]);
      } else {
        await sql('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, user_id]);
      }
      await sql(
        `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
         VALUES ($1, $2, $3, 'success', $4, $5)`,
        [user_id, isDeduct ? 'admin_deduct' : 'admin_fund', amount, reference,
         JSON.stringify({ funded_by: auth.user.id, operation: isDeduct ? 'deduct' : 'credit', reason: reason || (isDeduct ? 'Admin deduction' : 'Admin fund') })]
      );
    });

    // Notify the user
    await createNotification(
      user_id,
      NotificationType.ADMIN_FUND,
      isDeduct ? 'Wallet Deduction by Admin' : 'Wallet Funded by Admin',
      isDeduct
        ? `GH₵${parseFloat(amount).toFixed(2)} has been deducted from your wallet${reason ? '. Reason: ' + reason : ''}`
        : `Your wallet has been credited with GH₵${parseFloat(amount).toFixed(2)}${reason ? '. Reason: ' + reason : ''}`,
      { amount, operation: isDeduct ? 'deduct' : 'credit' }
    );

    const updated = await executeQuery('SELECT wallet_balance FROM users WHERE id = $1', [user_id]);

    return successResponse(200, {
      user_id,
      user_name: targetUser.full_name,
      operation: isDeduct ? 'deduct' : 'credit',
      amount: parseFloat(amount),
      new_balance: parseFloat(updated[0].wallet_balance),
      reference
    }, `Successfully ${isDeduct ? 'deducted' : 'funded'} GH₵${parseFloat(amount).toFixed(2)} ${isDeduct ? 'from' : 'to'} ${targetUser.full_name}`);
  } catch (error) {
    console.error('Admin fund wallet error:', error);
    return errorResponse(500, 'Failed to process wallet operation');
  }
};
