import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';
import { generateReference, checkRateLimit, getClientIp } from '../utils/security.js';
import { notifyAdmins, NotificationType } from '../utils/notifications.js';
import { isBot, hasSuspiciousPayload } from '../utils/security-middleware.js';

const NETWORK_PREFIXES = {
  MTN:        ['024', '025', '053', '054', '055', '059'],
  TELECEL:    ['020', '050'],
  AIRTEL_TIGO:['027', '057', '026', '056'],
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  try {
    if (isBot(event.headers))           return errorResponse(403, 'Request blocked');
    if (hasSuspiciousPayload(event.body)) return errorResponse(400, 'Invalid request');

    const clientIp = getClientIp(event.headers);
    const rateCheck = checkRateLimit(`afa_momo:${clientIp}`, 3);
    if (!rateCheck.allowed) return errorResponse(429, 'Too many requests. Please wait.');

    const body = JSON.parse(event.body || '{}');
    const {
      reseller_code,
      buyer_name,
      buyer_contact,
      recipient_phone,
      network,
      data_plan_id,
      momo_sender_phone,
    } = body;

    // Validation
    if (!reseller_code)                    return errorResponse(400, 'reseller_code is required');
    if (!buyer_name?.trim())               return errorResponse(400, 'Your name is required');
    if (!buyer_contact?.trim())            return errorResponse(400, 'Your contact (phone or email) is required');
    if (!/^0\d{9}$/.test(recipient_phone)) return errorResponse(400, 'Recipient phone must be 10 digits starting with 0');
    if (!/^0\d{9}$/.test(momo_sender_phone)) return errorResponse(400, 'Your MoMo number must be 10 digits starting with 0');
    if (!data_plan_id || !network)         return errorResponse(400, 'data_plan_id and network are required');

    if (!['MTN', 'TELECEL', 'AIRTEL_TIGO'].includes(network)) {
      return errorResponse(400, 'Invalid network');
    }

    // Validate recipient phone prefix matches network
    const prefix = recipient_phone.slice(0, 3);
    if (!(NETWORK_PREFIXES[network] || []).includes(prefix)) {
      return errorResponse(400, `Recipient number prefix doesn't match ${network}`);
    }

    // Resolve reseller and plan
    const rows = await executeQuery(
      `SELECT u.id AS reseller_id, u.full_name AS reseller_name, u.is_reseller,
              COALESCE(rp.custom_price, dp.price) AS price,
              dp.plan_name, dp.data_volume, dp.validity_days,
              dp.volume_mb, dp.provider_plan_id
       FROM users u
       JOIN data_plans dp ON dp.id = $1 AND dp.is_active = true AND dp.network = $2
       LEFT JOIN reseller_pricing rp
         ON rp.reseller_id = u.id AND rp.data_plan_id = dp.id AND rp.is_active = true
       WHERE u.referral_code = $3 AND (u.is_reseller = true OR u.is_admin = true)
       LIMIT 1`,
      [data_plan_id, network, reseller_code]
    );

    if (!rows.length) return errorResponse(404, 'Invalid shop link or plan unavailable');

    const r = rows[0];
    const reference = generateReference('AFA');

    await executeQuery(
      `INSERT INTO momo_payments
         (user_id, amount, phone_number, transaction_type, reference, status, metadata)
       VALUES (NULL, $1, $2, 'afa_purchase', $3, 'pending', $4)`,
      [
        parseFloat(r.price),
        momo_sender_phone,
        reference,
        JSON.stringify({
          buyer_name:     buyer_name.trim(),
          buyer_contact:  buyer_contact.trim(),
          recipient_phone,
          network,
          data_plan_id,
          plan_name:      r.plan_name,
          data_volume:    r.data_volume,
          validity_days:  r.validity_days,
          volume_mb:      r.volume_mb,
          provider_plan_id: r.provider_plan_id,
          reseller_code,
          reseller_id:    r.reseller_id,
          reseller_name:  r.reseller_name,
        }),
      ]
    );

    await notifyAdmins(
      NotificationType.MOMO_REQUEST,
      'New AFA MoMo Order',
      `${buyer_name.trim()} ordered ${r.data_volume} (${network}) for ${recipient_phone} via partner ${r.reseller_name}. MoMo from: ${momo_sender_phone}. Ref: ${reference}`,
      { reference, buyer_name, recipient_phone, reseller_code, reseller_id: r.reseller_id }
    );

    return successResponse(201, {
      reference,
      status: 'pending',
      plan:   r.data_volume,
      amount: parseFloat(r.price),
      message: 'Order submitted! Admin will confirm your MoMo payment and deliver your data shortly.',
    });
  } catch (err) {
    console.error('guest-afa-momo error:', err.message);
    return errorResponse(500, 'Failed to submit order');
  }
};
