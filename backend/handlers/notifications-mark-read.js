import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Mark Notifications as Read
 * POST /api/notifications-mark-read
 *
 * Body: { notification_ids: [1, 2, 3] } or { mark_all: true }
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    const body = JSON.parse(event.body);
    const { notification_ids, mark_all } = body;

    if (mark_all) {
      // Mark all notifications as read
      await executeQuery(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [auth.user.id]
      );

      return successResponse(200, null, 'All notifications marked as read');
    }

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return errorResponse(400, 'notification_ids array required or use mark_all');
    }

    // Mark specific notifications as read
    await executeQuery(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND id = ANY($2::int[]) AND is_read = false`,
      [auth.user.id, notification_ids]
    );

    return successResponse(200, null, 'Notifications marked as read');

  } catch (error) {
    console.error('Mark read error:', error);
    return errorResponse(500, 'Failed to mark notifications as read');
  }
};
