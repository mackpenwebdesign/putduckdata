import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Get User Notifications
 * GET /api/notifications-get?limit=20&offset=0&unread_only=false
 *
 * Returns paginated notifications for the authenticated user
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Get pagination parameters
    const limit = parseInt(event.queryStringParameters?.limit) || 20;
    const offset = parseInt(event.queryStringParameters?.offset) || 0;
    const unreadOnly = event.queryStringParameters?.unread_only === 'true';

    // Validate pagination
    if (limit < 1 || limit > 100) {
      return errorResponse(400, 'Limit must be between 1 and 100');
    }

    // Build query
    let query = `
      SELECT id, type, title, message, metadata, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (unreadOnly) {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';

    const notifications = await executeQuery(query, [auth.user.id, limit, offset]);

    // Get unread count
    const unreadCount = await executeQuery(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [auth.user.id]
    );

    // Filter out internal metadata fields that shouldn't be exposed to users
    const INTERNAL_FIELDS = ['funded_by', 'admin_id', 'admin_email', 'user_email', 'cost_price', 'admin_profit'];

    return successResponse(200, {
      notifications: notifications.map(n => {
        let safeMetadata = n.metadata || null;
        if (safeMetadata && !auth.user.is_admin) {
          safeMetadata = { ...safeMetadata };
          for (const key of INTERNAL_FIELDS) {
            delete safeMetadata[key];
          }
          if (Object.keys(safeMetadata).length === 0) safeMetadata = null;
        }
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          metadata: safeMetadata,
          is_read: n.is_read,
          created_at: n.created_at
        };
      }),
      unread_count: parseInt(unreadCount[0].count),
      pagination: {
        limit,
        offset,
        has_more: notifications.length === limit
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse(500, 'Failed to retrieve notifications');
  }
};
