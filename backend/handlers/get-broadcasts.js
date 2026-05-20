import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

/**
 * Get Active Broadcasts
 * GET /api/broadcasts-active?guest=true|false&limit=1
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET")
    return errorResponse(405, "Method not allowed");

  try {
    const isGuest = event.queryStringParameters?.guest === "true";
    const limit = Math.min(
      parseInt(event.queryStringParameters?.limit) || 1,
      3
    );

    let auth = null;
    if (!isGuest) {
      auth = await authenticateUser(event.headers);
      if (!auth.authenticated)
        return successResponse(200, { broadcasts: [], is_guest: false });
    }

    let query =
      "SELECT id, title, message, url, targets, created_at FROM active_broadcasts";

    const params = [];
    let whereClause = "";

    if (isGuest) {
      whereClause = " WHERE targets = ANY($1::text[])";
      params.push("{all,guests}");
    } else if (auth.user.is_admin) {
      // Admins see all
    } else {
      whereClause = " WHERE targets = ANY($1::text[])";
      params.push("{all,users}");
    }

    if (whereClause) query += whereClause;
    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const broadcasts = await executeQuery(query, params);

    return successResponse(200, {
      broadcasts,
      is_guest: !!isGuest,
      count: broadcasts.length,
    });
  } catch (error) {
    console.error("Get broadcasts error:", error);
    return successResponse(200, { broadcasts: [] }); // Graceful empty on error
  }
};
