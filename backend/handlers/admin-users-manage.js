import { authenticateUser, hasRole, hashPassword, verifyAdminFromDB } from '../utils/auth.js';
import { executeQuery } from '../utils/db.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { validate, registerSchema } from '../utils/validation.js';
import { generateReferralCode } from '../utils/referral.js';

/**
 * Admin User Management
 * GET /api/admin-users-manage - List all users
 * POST /api/admin-users-manage - Create new user
 * PUT /api/admin-users-manage - Update user
 * DELETE /api/admin-users-manage - Delete user
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    if (!hasRole(auth.user, 'admin')) {
      return errorResponse(403, 'Admin access required');
    }

    // Defense-in-depth: verify admin status from DB on every request
    const isRealAdmin = await verifyAdminFromDB(auth.user.id);
    if (!isRealAdmin) {
      return errorResponse(403, 'Admin access revoked');
    }

    // GET - List users
    if (event.httpMethod === 'GET') {
      const role = event.queryStringParameters?.role;
      const search = event.queryStringParameters?.search;
      const limit = parseInt(event.queryStringParameters?.limit) || 50;
      const offset = parseInt(event.queryStringParameters?.offset) || 0;

      let query = `
        SELECT id, full_name, email, phone_number, is_admin, is_blocked, is_reseller, country, wallet_balance,
               created_at, last_login_ip
        FROM users
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (role === 'admin') {
        query += ` AND is_admin = true`;
      } else if (role === 'customer') {
        query += ` AND is_admin = false`;
      }

      if (search) {
        query += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const users = await executeQuery(query, params);

      const countParams = [];
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      if (role === 'admin') countQuery += ' AND is_admin = true';
      else if (role === 'customer') countQuery += ' AND is_admin = false';
      if (search) {
        countQuery += ` AND (full_name ILIKE $1 OR email ILIKE $1)`;
        countParams.push(`%${search}%`);
      }

      const countResult = await executeQuery(countQuery, countParams);

      return successResponse(200, {
        users: users.map(u => ({
          ...u,
          wallet_balance: parseFloat(u.wallet_balance)
        })),
        pagination: {
          total: parseInt(countResult[0].total),
          limit,
          offset
        }
      });
    }

    // POST - Create user
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const validation = validate(registerSchema, body);

      if (!validation.success) {
        return errorResponse(400, 'Validation failed', validation.errors);
      }

      const { full_name, email, password, country } = validation.data;
      const { role } = body;

      // Validate role
      if (role && !['customer', 'admin'].includes(role)) {
        return errorResponse(400, 'Invalid role');
      }

      const existingUser = await executeQuery(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.length > 0) {
        return errorResponse(409, 'Email already registered');
      }

      const password_hash = await hashPassword(password);
      const is_admin = role === 'admin';

      const result = await executeQuery(
        `INSERT INTO users (full_name, email, password_hash, is_admin, country)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, email, is_admin, created_at`,
        [full_name, email, password_hash, is_admin, country || 'Ghana']
      );

      return successResponse(201, { user: result[0] }, 'User created successfully');
    }

    // PUT - Update user
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);
      const { user_id, role, is_blocked, is_reseller, full_name, email, phone_number } = body;

      if (!user_id) {
        return errorResponse(400, 'user_id is required');
      }

      // Prevent blocking self
      if (typeof is_blocked === 'boolean' && is_blocked && parseInt(user_id) === auth.user.id) {
        return errorResponse(400, 'Cannot block your own account');
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (role) {
        if (!['customer', 'admin'].includes(role)) {
          return errorResponse(400, 'Invalid role');
        }
        updates.push(`is_admin = $${paramIndex}`);
        params.push(role === 'admin');
        paramIndex++;
      }

      if (typeof is_reseller === 'boolean') {
        updates.push(`is_reseller = $${paramIndex}`);
        params.push(is_reseller);
        paramIndex++;
        // When approving: mark fee paid + auto-generate referral code
        if (is_reseller) {
          await executeQuery(
            `UPDATE transactions SET status = 'success' WHERE user_id = $1 AND type = 'reseller_fee' AND status = 'pending'`,
            [user_id]
          );
          // Generate referral code if not already set
          const userRow = await executeQuery('SELECT id, email, referral_code FROM users WHERE id = $1', [user_id]);
          if (userRow.length && !userRow[0].referral_code) {
            const refCode = generateReferralCode(userRow[0].id, userRow[0].email);
            await executeQuery('UPDATE users SET referral_code = $1 WHERE id = $2', [refCode, user_id]);
            await executeQuery(
              `INSERT INTO referral_codes (user_id, referral_code) VALUES ($1, $2) ON CONFLICT (referral_code) DO NOTHING`,
              [user_id, refCode]
            );
          }
        }
      }

      if (typeof is_blocked === 'boolean') {
        updates.push(`is_blocked = $${paramIndex}`);
        params.push(is_blocked);
        paramIndex++;
      }

      if (full_name && full_name.trim().length >= 2) {
        updates.push(`full_name = $${paramIndex}`);
        params.push(full_name.trim());
        paramIndex++;
      }

      if (email && /\S+@\S+\.\S+/.test(email.trim())) {
        // Ensure email not taken by another user
        const emailCheck = await executeQuery(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.trim().toLowerCase(), user_id]
        );
        if (emailCheck.length > 0) {
          return errorResponse(409, 'Email already in use');
        }
        updates.push(`email = $${paramIndex}`);
        params.push(email.trim().toLowerCase());
        paramIndex++;
      }

      if (typeof phone_number === 'string') {
        updates.push(`phone_number = $${paramIndex}`);
        params.push(phone_number.trim() || null);
        paramIndex++;
      }

      if (updates.length === 0) {
        return errorResponse(400, 'No updates provided');
      }

      params.push(user_id);

      const result = await executeQuery(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}
         RETURNING id, full_name, email, is_admin, is_blocked`,
        params
      );

      if (result.length === 0) {
        return errorResponse(404, 'User not found');
      }

      return successResponse(200, { user: result[0] }, 'User updated successfully');
    }

    // DELETE - Delete user
    if (event.httpMethod === 'DELETE') {
      const user_id = event.queryStringParameters?.user_id;

      if (!user_id) {
        return errorResponse(400, 'user_id is required');
      }

      // Prevent deleting self
      if (parseInt(user_id) === auth.user.id) {
        return errorResponse(400, 'Cannot delete your own account');
      }

      const result = await executeQuery(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [user_id]
      );

      if (result.length === 0) {
        return errorResponse(404, 'User not found');
      }

      return successResponse(200, null, 'User deleted successfully');
    }

    return errorResponse(405, 'Method not allowed');

  } catch (error) {
    console.error('Admin user management error:', error);
    return errorResponse(500, 'Failed to manage users');
  }
};
