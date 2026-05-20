/**
 * POST /track-visit
 *
 * Called from the frontend on every page load.
 * No auth required — public endpoint.
 *
 * Body: { page?: string }
 *
 * Creates the page_visits table automatically on first run if it doesn't exist.
 */
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

// Ensure table exists — runs once per cold start, safe to call repeatedly
const ensureTable = async () => {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id          SERIAL PRIMARY KEY,
      visitor_id  TEXT        NOT NULL,  -- anonymous fingerprint stored in localStorage
      page        TEXT        NOT NULL DEFAULT '/',
      ip          TEXT,
      user_agent  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Index for fast date-range queries
  await executeQuery(`
    CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits (created_at)
  `);
  await executeQuery(`
    CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_id ON page_visits (visitor_id)
  `);
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
    await ensureTable();

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }

    const page = (body.page || "/").substring(0, 500); // guard against huge strings
    const visitorId = (body.visitor_id || "unknown").substring(0, 100);
    const ip =
      event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      event.requestContext?.identity?.sourceIp ||
      null;
    const userAgent = (event.headers["user-agent"] || "").substring(0, 500);

    await executeQuery(
      `INSERT INTO page_visits (visitor_id, page, ip, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [visitorId, page, ip, userAgent]
    );

    return successResponse(200, { tracked: true }, "Visit recorded");
  } catch (error) {
    console.error("track-visit error:", error);
    // Silently succeed — never break the frontend over a tracking failure
    return successResponse(200, { tracked: false }, "Visit not recorded");
  }
};
