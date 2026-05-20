import { authenticateUser, hasRole, verifyAdminFromDB } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated)
      return errorResponse(401, "Authentication required");
    if (!hasRole(auth.user, "admin"))
      return errorResponse(403, "Admin access required");
    if (!(await verifyAdminFromDB(auth.user.id)))
      return errorResponse(403, "Admin access required");

    const body = JSON.parse(event.body);
    const { title, message, url, targets = "all" } = body;

    if (!title?.trim() || !message?.trim())
      return errorResponse(400, "Title and message are required");

    if (!["all", "users", "guests"].includes(targets))
      return errorResponse(400, "Targets must be: all, users, or guests");

    if (url && !/^https?:\/\//i.test(url))
      return errorResponse(400, "URL must be a valid http(s) address");

    // Deactivate all previous broadcasts before inserting the new one
    // so only one broadcast is active at a time
    await executeQuery(
      `UPDATE broadcasts SET is_active = false WHERE is_active = true`
    );

    const result = await executeQuery(
      `INSERT INTO broadcasts (title, message, url, targets, created_by, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP + INTERVAL '24 hours')
       RETURNING id`,
      [title.trim(), message.trim(), url?.trim() || null, targets, auth.user.id]
    );

    const id = result[0].id;

    // ── Also create in-app notifications for target users ──────────────────
    try {
      let userIds = [];
      if (targets === "all" || targets === "users") {
        const userRows = await executeQuery(
          "SELECT id FROM users WHERE is_blocked = false"
        );
        userIds = userRows.map((r) => r.id);
      }
      // 'guests' target skipped — guests have no user accounts

      if (userIds.length > 0) {
        // Batch insert notifications (PostgreSQL supports multi-row VALUES)
        const values = userIds
          .map(
            (_, i) =>
              `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${
                i * 6 + 5
              }, $${i * 6 + 6})`
          )
          .join(", ");
        const params = userIds.flatMap((uid) => [
          uid,
          "broadcast",
          title.trim(),
          message.trim(),
          JSON.stringify({ broadcast_id: id, url: url?.trim() || null }),
          false,
        ]);
        await executeQuery(
          `INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
           VALUES ${values}`,
          params
        );
      }
    } catch (notifErr) {
      console.error("Broadcast notification creation error:", notifErr);
      // Don't fail the broadcast if notifications fail
    }

    return successResponse(
      200,
      {
        id,
        title: title.trim(),
        message: message.trim(),
        url: url?.trim() || null,
        targets,
        is_active: true,
      },
      `Broadcast #${id} created and activated for "${targets}"`
    );
  } catch (error) {
    console.error("admin-broadcast POST error:", error);
    return errorResponse(500, "Failed to send broadcast");
  }
};
