import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

const CACHE = new Map();
const TTL = 5 * 60 * 1000;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');

    const users = await executeQuery(
      `SELECT id, full_name, email, is_reseller, is_admin, referral_code,
              commission_balance, total_withdrawn, reseller_store_name,
              branding_enabled, brand_pro_active, brand_pro_setup_paid, branding_config
       FROM users WHERE id = $1`,
      [auth.user.id]
    );
    if (!users.length) return errorResponse(404, 'User not found');
    const user = users[0];

    if (!user.is_reseller && !user.is_admin) {
      return errorResponse(403, 'Reseller access required');
    }

    const cacheKey = `stats:${user.id}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL) {
      return successResponse(200, cached.data);
    }

    // Referral stats
    const refStats = await executeQuery(
      `SELECT COUNT(*) AS total_referrals,
              COALESCE(SUM(total_earned), 0) AS total_earned
       FROM referrals WHERE referrer_id = $1`,
      [user.id]
    );

    // Commission balance breakdown
    const commBreakdown = await executeQuery(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)  AS pending,
         COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS approved
       FROM commissions WHERE referrer_id = $1`,
      [user.id]
    );

    // Transaction count via referral
    const txStats = await executeQuery(
      `SELECT COUNT(*) AS total_transactions,
              COALESCE(SUM(amount), 0) AS total_revenue
       FROM transactions WHERE reseller_id = $1 AND status IN ('success','completed')`,
      [user.id]
    );

    // Recent referrals
    const recentReferrals = await executeQuery(
      `SELECT r.id, u.full_name, u.email, r.total_earned, r.status, r.created_at
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [user.id]
    );

    // Recent commissions
    const recentCommissions = await executeQuery(
      `SELECT c.id, c.amount, c.commission_rate, c.status, c.created_at,
              u.full_name AS from_user
       FROM commissions c
       JOIN users u ON u.id = c.referred_user_id
       WHERE c.referrer_id = $1
       ORDER BY c.created_at DESC LIMIT 10`,
      [user.id]
    );

    const data = {
      referral_code: user.referral_code,
      store_name: user.reseller_store_name,
      brand_pro: {
        active: user.brand_pro_active,
        setup_paid: user.brand_pro_setup_paid,
        branding_enabled: user.branding_enabled,
        config: user.branding_config,
      },
      balance: {
        available:       parseFloat(user.commission_balance || 0),
        total_withdrawn: parseFloat(user.total_withdrawn || 0),
        pending:         parseFloat(commBreakdown[0]?.pending || 0),
        approved:        parseFloat(commBreakdown[0]?.approved || 0),
      },
      statistics: {
        total_referrals:  parseInt(refStats[0]?.total_referrals || 0),
        total_earned:     parseFloat(refStats[0]?.total_earned || 0),
        total_transactions: parseInt(txStats[0]?.total_transactions || 0),
        total_revenue:    parseFloat(txStats[0]?.total_revenue || 0),
      },
      recent_referrals:   recentReferrals,
      recent_commissions: recentCommissions,
    };

    CACHE.set(cacheKey, { ts: Date.now(), data });
    return successResponse(200, data);
  } catch (err) {
    console.error('reseller-stats error:', err);
    return errorResponse(500, 'Failed to load reseller stats');
  }
};
