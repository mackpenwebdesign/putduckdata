import { authenticateUser, hasRole } from '../utils/auth.js';
import { validate, publishAdSchema } from '../utils/validation.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Publish Advertisement
 * POST /api/publish-ad
 *
 * Security:
 * - Admin only endpoint
 * - Validates image URLs
 * - Prevents XSS attacks
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'POST') {
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

    // Parse and validate request body
    const body = JSON.parse(event.body);
    const validation = validate(publishAdSchema, body);

    if (!validation.success) {
      return errorResponse(400, 'Validation failed', validation.errors);
    }

    const { title, image_url, target_link, is_active } = validation.data;

    // Create ad
    const result = await executeQuery(
      `INSERT INTO ads (title, image_url, target_link, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, image_url, target_link, is_active, created_at`,
      [title, image_url, target_link || null, is_active]
    );

    const ad = result[0];

    return successResponse(201, {
      ad: {
        id: ad.id,
        title: ad.title,
        image_url: ad.image_url,
        target_link: ad.target_link,
        is_active: ad.is_active,
        created_at: ad.created_at
      }
    }, 'Advertisement published successfully');

  } catch (error) {
    console.error('Publish ad error:', error);
    return errorResponse(500, 'Failed to publish advertisement');
  }
};
