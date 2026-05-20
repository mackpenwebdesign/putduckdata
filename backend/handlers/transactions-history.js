import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Get Transaction History
 * GET /api/transactions-history?limit=20&offset=0
 *
 * Returns paginated transaction history for the authenticated user
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Get pagination parameters
    const limit = parseInt(event.queryStringParameters?.limit) || 100;
    const offset = parseInt(event.queryStringParameters?.offset) || 0;

    // Validate pagination
    if (limit < 1 || limit > 100) {
      return errorResponse(400, 'Limit must be between 1 and 100');
    }

    if (offset < 0) {
      return errorResponse(400, 'Offset must be non-negative');
    }

    // Get transactions with pagination (include metadata for details display)
    const transactions = await executeQuery(
      `SELECT id, type, amount, status, reference, description, recipient_phone, metadata, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [auth.user.id, limit, offset]
    );

    // Get total count
    const countResult = await executeQuery(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
      [auth.user.id]
    );

    const total = parseInt(countResult[0].total);

    // For non-admin users, only show safe metadata fields (allowlist approach)
    const isAdmin = auth.user.is_admin === true;
    const CUSTOMER_SAFE_FIELDS = ['network', 'plan_name', 'data_volume', 'phone_number', 'payment_method', 'reason'];

    return successResponse(200, {
      transactions: transactions.map(tx => {
        let safeMetadata = tx.metadata || null;

        if (safeMetadata && !isAdmin) {
          // Only keep customer-safe fields, drop everything else
          const filtered = {};
          for (const key of CUSTOMER_SAFE_FIELDS) {
            if (safeMetadata[key] !== undefined) {
              filtered[key] = safeMetadata[key];
            }
          }
          safeMetadata = Object.keys(filtered).length > 0 ? filtered : null;
        }

        return {
          id: tx.id,
          type: tx.type,
          amount: parseFloat(tx.amount),
          status: tx.status,
          reference: tx.reference,
          description: tx.description || null,
          recipient_phone: tx.recipient_phone,
          metadata: safeMetadata,
          created_at: tx.created_at
        };
      }),
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    return errorResponse(500, 'Failed to retrieve transaction history');
  }
};
