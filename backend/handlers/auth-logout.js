import { authenticateUser, logoutUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';

/**
 * User Logout
 * POST /api/auth-logout
 *
 * Blacklists the current JWT token to prevent further use
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || 'Authentication required');
    }

    // Blacklist the token
    const success = await logoutUser(auth.token, auth.user.id);

    if (!success) {
      return errorResponse(500, 'Logout failed');
    }

    return successResponse(200, null, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(500, 'Logout failed');
  }
};
