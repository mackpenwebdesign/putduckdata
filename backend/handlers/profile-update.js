import { authenticateUser } from '../utils/auth.js';
import { executeQuery } from '../utils/db.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { sanitizeInput } from '../utils/validation.js';

/**
 * Update User Profile
 * PUT /api/profile-update
 *
 * Allows users to update their profile information
 * Email changes require verification (future enhancement)
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'PUT') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    const body = JSON.parse(event.body);
    const { full_name, phone_number, country, momo_phone } = body;

    // Validate inputs
    if (!full_name && !phone_number && !country && !momo_phone) {
      return errorResponse(400, 'At least one field must be provided for update');
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (full_name) {
      if (full_name.length < 2 || full_name.length > 100) {
        return errorResponse(400, 'Full name must be between 2 and 100 characters');
      }
      updates.push(`full_name = $${paramIndex}`);
      params.push(sanitizeInput(full_name.trim()));
      paramIndex++;
    }

    if (phone_number) {
      if (!/^0\d{9}$/.test(phone_number)) {
        return errorResponse(400, 'Phone number must be 10 digits starting with 0');
      }
      updates.push(`phone_number = $${paramIndex}`);
      params.push(phone_number.trim());
      paramIndex++;
    }

    if (country) {
      if (country.length < 2 || country.length > 50) {
        return errorResponse(400, 'Country name must be between 2 and 50 characters');
      }
      updates.push(`country = $${paramIndex}`);
      params.push(sanitizeInput(country.trim()));
      paramIndex++;
    }

    if (momo_phone !== undefined) {
      if (momo_phone && !/^0\d{9}$/.test(momo_phone)) {
        return errorResponse(400, 'MoMo payout number must be 10 digits starting with 0');
      }
      updates.push(`momo_phone = $${paramIndex}`);
      params.push(momo_phone ? momo_phone.trim() : null);
      paramIndex++;
    }

    params.push(auth.user.id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, full_name, email, phone_number, is_admin, country, wallet_balance, created_at
    `;

    const result = await executeQuery(query, params);

    if (result.length === 0) {
      return errorResponse(404, 'User not found');
    }

    const user = result[0];

    return successResponse(200, {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        is_admin: user.is_admin,
        country: user.country,
        wallet_balance: parseFloat(user.wallet_balance),
        created_at: user.created_at
      }
    }, 'Profile updated successfully');

  } catch (error) {
    console.error('Profile update error:', error);
    return errorResponse(500, 'Failed to update profile');
  }
};
