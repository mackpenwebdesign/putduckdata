import axios from 'axios';
import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery, executeTransaction } from '../utils/db.js';
import { generateReference } from '../utils/security.js';
import { sendNotification, NotificationType } from '../utils/notifications.js';

const MIN_AMOUNT = 5.00;
const MAX_MONTHLY = 3;

const MOMO_PREFIXES = {
  MTN:       ['024','054','055','059','025','053'],
  VODAFONE:  ['020','050'],
  AIRTELTIGO:['027','057','026','056'],
};

const networkForPhone = (phone) => {
  const prefix = String(phone).substring(0, 3);
  for (const [net, prefixes] of Object.entries(MOMO_PREFIXES)) {
    if (prefixes.includes(prefix)) return net;
  }
  return null;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');

    const userRows = await executeQuery(
      'SELECT id, full_name, email, is_reseller, commission_balance, total_withdrawn FROM users WHERE id = $1',
      [auth.user.id]
    );
    if (!userRows.length) return errorResponse(404, 'User not found');
    const user = userRows[0];
    if (!user.is_reseller) return errorResponse(403, 'Reseller access required');

    const { amount, account_details } = JSON.parse(event.body || '{}');

    if (!amount || parseFloat(amount) < MIN_AMOUNT) {
      return errorResponse(400, `Minimum withdrawal is GH₵${MIN_AMOUNT}`);
    }
    if (!account_details?.account_number || !account_details?.account_name || !account_details?.momo_network) {
      return errorResponse(400, 'account_details must include account_number, account_name, and momo_network');
    }

    const withdrawAmount = parseFloat(amount);
    const balance = parseFloat(user.commission_balance);

    if (withdrawAmount > balance) {
      return errorResponse(400, `Insufficient balance. Available: GH₵${balance.toFixed(2)}`);
    }

    // Check monthly withdrawal limit
    const thisMonth = await executeQuery(
      `SELECT COUNT(*) AS count FROM withdrawal_requests
       WHERE user_id = $1
         AND status NOT IN ('failed','transfer_failed')
         AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
      [auth.user.id]
    );
    if (parseInt(thisMonth[0]?.count || 0) >= MAX_MONTHLY) {
      return errorResponse(429, `Maximum ${MAX_MONTHLY} withdrawals per month reached`);
    }

    // Check no active pending request
    const pending = await executeQuery(
      `SELECT id FROM withdrawal_requests WHERE user_id = $1 AND status IN ('pending','processing')`,
      [auth.user.id]
    );
    if (pending.length) {
      return errorResponse(409, 'You already have a pending withdrawal request');
    }

    // Validate phone prefix matches network
    const detectedNetwork = networkForPhone(account_details.account_number);
    if (detectedNetwork && detectedNetwork !== account_details.momo_network.toUpperCase()) {
      return errorResponse(400, `Phone number belongs to ${detectedNetwork}, not ${account_details.momo_network}`);
    }

    const reference = generateReference('WDR');

    // Get approved commission IDs to mark as withdrawn
    const approvedComms = await executeQuery(
      `SELECT id FROM commissions
       WHERE referrer_id = $1 AND status = 'approved'
       ORDER BY created_at ASC`,
      [auth.user.id]
    );
    const commissionIds = approvedComms.map((c) => c.id);

    let withdrawalId;
    await executeTransaction(async (sql) => {
      await sql(
        'UPDATE users SET commission_balance = commission_balance - $1, total_withdrawn = total_withdrawn + $1 WHERE id = $2',
        [withdrawAmount, auth.user.id]
      );

      if (commissionIds.length) {
        await sql(
          `UPDATE commissions SET status = 'withdrawn' WHERE id = ANY($1)`,
          [commissionIds]
        );
      }

      const result = await sql(
        `INSERT INTO withdrawal_requests (user_id, amount, commission_ids, account_details, status, reference)
         VALUES ($1, $2, $3, $4, 'processing', $5)
         RETURNING id`,
        [auth.user.id, withdrawAmount, commissionIds, JSON.stringify(account_details), reference]
      );
      withdrawalId = result[0].id;
    });

    // Attempt Paystack MoMo transfer
    let paystackRecipientCode = null;
    let paystackTransferCode  = null;
    let transferError         = null;

    if (process.env.PAYSTACK_SECRET_KEY) {
      try {
        const networkMap = { MTN: 'MTN', VODAFONE: 'VOD', AIRTELTIGO: 'ATL' };
        const bankCode = networkMap[account_details.momo_network?.toUpperCase()] || 'MTN';

        const recipientRes = await axios.post(
          'https://api.paystack.co/transferrecipient',
          {
            type: 'mobile_money',
            name: account_details.account_name,
            account_number: account_details.account_number,
            bank_code: bankCode,
            currency: 'GHS',
          },
          { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );

        paystackRecipientCode = recipientRes.data?.data?.recipient_code;

        if (paystackRecipientCode) {
          const transferRes = await axios.post(
            'https://api.paystack.co/transfer',
            {
              source: 'balance',
              amount: Math.round(withdrawAmount * 100),
              recipient: paystackRecipientCode,
              reason: `Commission withdrawal — ${reference}`,
              currency: 'GHS',
            },
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
          );
          paystackTransferCode = transferRes.data?.data?.transfer_code;
        }
      } catch (err) {
        transferError = err.response?.data?.message || err.message;
        console.error('Paystack transfer error:', transferError);
      }
    }

    // Update withdrawal record with Paystack details
    const finalStatus = paystackTransferCode ? 'processing'
      : transferError ? 'pending_manual' : 'pending_manual';

    await executeQuery(
      `UPDATE withdrawal_requests
       SET status = $1, paystack_recipient_code = $2, paystack_transfer_code = $3, transfer_error = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [finalStatus, paystackRecipientCode, paystackTransferCode, transferError, withdrawalId]
    );

    await sendNotification(auth.user.id, NotificationType.DATA_PURCHASE, {
      title: 'Withdrawal Requested',
      message: `Your withdrawal of GH₵${withdrawAmount.toFixed(2)} to ${account_details.account_number} is ${finalStatus === 'processing' ? 'being processed' : 'under manual review'}.`,
    });

    return successResponse(201, {
      withdrawal_id: withdrawalId,
      reference,
      amount: withdrawAmount,
      status: finalStatus,
      transfer_initiated: !!paystackTransferCode,
    }, finalStatus === 'processing'
        ? 'Withdrawal initiated via Paystack'
        : 'Withdrawal submitted for manual processing');
  } catch (err) {
    console.error('withdrawal-request error:', err);
    return errorResponse(500, 'Failed to process withdrawal');
  }
};
