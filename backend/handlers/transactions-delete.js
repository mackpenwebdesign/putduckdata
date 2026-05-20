import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Delete Transactions
 * DELETE /api/transactions-delete
 *
 * Accepts JSON body:
 *   { transaction_ids: [1, 2, 3] }  - delete specific transactions
 *   { clear_all: true }             - delete all user's transactions
 *
 * Only deletes the authenticated user's own transactions.
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'DELETE') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    const body = JSON.parse(event.body || '{}');
    const { transaction_ids, clear_all } = body;

    if (clear_all === true) {
      const result = await executeQuery(
        'DELETE FROM transactions WHERE user_id = $1',
        [auth.user.id]
      );

      return successResponse(200, {
        deleted_count: result.length || 0
      }, 'All transaction history cleared');
    }

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return errorResponse(400, 'Provide transaction_ids array or set clear_all to true');
    }

    if (transaction_ids.length > 100) {
      return errorResponse(400, 'Cannot delete more than 100 transactions at once');
    }

    // Validate all IDs are integers
    const validIds = transaction_ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== transaction_ids.length) {
      return errorResponse(400, 'All transaction_ids must be positive integers');
    }

    // Build parameterized query for IN clause
    const placeholders = validIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await executeQuery(
      `DELETE FROM transactions WHERE user_id = $1 AND id IN (${placeholders})`,
      [auth.user.id, ...validIds]
    );

    return successResponse(200, {
      deleted_count: result.length || 0
    }, `${result.length || 0} transaction(s) deleted`);

  } catch (error) {
    console.error('Transaction delete error:', error);
    return errorResponse(500, 'Failed to delete transactions');
  }
};
