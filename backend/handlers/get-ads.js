import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Get Active Advertisements
 * GET /api/get-ads
 *
 * Public endpoint - returns all active ads for display on dashboards
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
    // Get all active ads
    const ads = await executeQuery(
      `SELECT id, title, image_url, target_link, created_at
       FROM ads
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT 10`
    );

    return successResponse(200, {
      ads: ads.map(ad => ({
        id: ad.id,
        title: ad.title,
        image_url: ad.image_url,
        target_link: ad.target_link,
        created_at: ad.created_at
      })),
      count: ads.length
    });

  } catch (error) {
    console.error('Get ads error:', error);
    return errorResponse(500, 'Failed to retrieve advertisements');
  }
};
