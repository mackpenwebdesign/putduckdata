import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery, executeTransaction } from '../utils/db.js';
import { generateReference } from '../utils/security.js';

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const SETUP_FEE = 50.00;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  // ── GET: fetch own branding ───────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const auth = await authenticateUser(event.headers);
      if (!auth.authenticated) return errorResponse(401, 'Authentication required');

      const rows = await executeQuery(
        `SELECT branding_enabled, brand_pro_active, brand_pro_setup_paid,
                branding_config, brand_custom_domain, favicon_url
         FROM users WHERE id = $1`,
        [auth.user.id]
      );
      if (!rows.length) return errorResponse(404, 'User not found');
      return successResponse(200, rows[0]);
    } catch (err) {
      return errorResponse(500, 'Failed to load branding');
    }
  }

  // ── POST: pay setup fee or update config ──────────────────────────────────
  if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
    try {
      const auth = await authenticateUser(event.headers);
      if (!auth.authenticated) return errorResponse(401, 'Authentication required');

      const body = JSON.parse(event.body || '{}');
      const { action } = body;

      // Activate Brand Pro
      if (action === 'activate_brand_pro') {
        const userRows = await executeQuery(
          'SELECT wallet_balance, brand_pro_setup_paid, is_reseller FROM users WHERE id = $1',
          [auth.user.id]
        );
        if (!userRows.length) return errorResponse(404, 'User not found');
        const user = userRows[0];

        if (user.brand_pro_setup_paid) {
          return errorResponse(409, 'Brand Pro already activated');
        }

        if (parseFloat(user.wallet_balance) < SETUP_FEE) {
          return errorResponse(400, `Insufficient balance. Brand Pro setup costs GH₵${SETUP_FEE}`);
        }

        const reference = generateReference('BRND');
        await executeTransaction(async (sql) => {
          await sql(
            'UPDATE users SET wallet_balance = wallet_balance - $1, brand_pro_setup_paid = true, brand_pro_active = true, branding_enabled = true, is_reseller = true WHERE id = $2',
            [SETUP_FEE, auth.user.id]
          );
          await sql(
            `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
             VALUES ($1, 'brand_pro_fee', $2, 'success', $3, $4)`,
            [auth.user.id, SETUP_FEE, reference, JSON.stringify({ action: 'brand_pro_activation' })]
          );
        });

        return successResponse(200, { activated: true, reference, fee: SETUP_FEE }, 'Brand Pro activated');
      }

      // Update branding config
      if (action === 'update_config') {
        const userRows = await executeQuery(
          'SELECT brand_pro_setup_paid, branding_config FROM users WHERE id = $1',
          [auth.user.id]
        );
        if (!userRows.length) return errorResponse(404, 'User not found');
        if (!userRows[0].brand_pro_setup_paid) {
          return errorResponse(403, 'Brand Pro must be activated first');
        }

        const { business_name, logo_url, primary_color, secondary_color, tagline, custom_domain } = body;

        const errors = [];
        if (primary_color && !HEX_RE.test(primary_color)) errors.push('primary_color must be a valid hex color');
        if (secondary_color && !HEX_RE.test(secondary_color)) errors.push('secondary_color must be a valid hex color');
        if (errors.length) return errorResponse(400, 'Validation failed', errors);

        const existing = userRows[0].branding_config || {};
        const merged = {
          ...existing,
          ...(business_name  !== undefined && { business_name }),
          ...(logo_url       !== undefined && { logo_url }),
          ...(primary_color  !== undefined && { primary_color }),
          ...(secondary_color !== undefined && { secondary_color }),
          ...(tagline        !== undefined && { tagline }),
          ...(custom_domain  !== undefined && { custom_domain }),
        };

        await executeQuery(
          'UPDATE users SET branding_config = $1, brand_custom_domain = $2 WHERE id = $3',
          [JSON.stringify(merged), custom_domain || null, auth.user.id]
        );

        return successResponse(200, { config: merged }, 'Branding updated');
      }

      return errorResponse(400, 'Invalid action. Use: activate_brand_pro or update_config');
    } catch (err) {
      console.error('reseller-branding error:', err);
      return errorResponse(500, 'Failed to update branding');
    }
  }

  return errorResponse(405, 'Method not allowed');
};
