import { authenticateUser, hasRole } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Manage Advertisement (Update/Delete)
 * PUT /api/manage-ad/:id - Update ad status
 * DELETE /api/manage-ad/:id - Delete ad
 *
 * Security:
 * - Admin only endpoint
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (!['PUT', 'DELETE'].includes(event.httpMethod)) {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Check admin role
    if (!hasRole(auth.user, 'admin')) {
      return errorResponse(403, 'Admin access required');
    }

    // Get ad ID from path or query
    const adId = event.queryStringParameters?.id;

    if (!adId) {
      return errorResponse(400, 'Ad ID is required');
    }

    // Handle UPDATE (toggle active status)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);
      const { is_active } = body;

      if (typeof is_active !== 'boolean') {
        return errorResponse(400, 'is_active must be a boolean');
      }

      const result = await executeQuery(
        `UPDATE ads
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, title, is_active`,
        [is_active, adId]
      );

      if (result.length === 0) {
        return errorResponse(404, 'Advertisement not found');
      }

      return successResponse(200, {
        ad: result[0]
      }, `Advertisement ${is_active ? 'activated' : 'deactivated'} successfully`);
    }

    // Handle DELETE
    if (event.httpMethod === 'DELETE') {
      const result = await executeQuery(
        'DELETE FROM ads WHERE id = $1 RETURNING id',
        [adId]
      );

      if (result.length === 0) {
        return errorResponse(404, 'Advertisement not found');
      }

      return successResponse(200, null, 'Advertisement deleted successfully');
    }

  } catch (error) {
    console.error('Manage ad error:', error);
    return errorResponse(500, 'Failed to manage advertisement');
  }
};
