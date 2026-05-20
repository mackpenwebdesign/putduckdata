/**
 * Standardized API response utilities
 * Ensures consistent response format across all endpoints
 */

// Use FRONTEND_URL from env to restrict CORS in production (Vercel serverless).
// Falls back to the production domain so we never silently open to *.
const CORS_ORIGIN =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV !== "production"
    ? "http://localhost:5173"
    : "https://putduckdata.com");

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  Vary: "Origin",
};

/**
 * Success response
 */
export const successResponse = (
  statusCode = 200,
  data = null,
  message = "Success"
) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  }),
});

/**
 * Error response
 */
export const errorResponse = (
  statusCode = 500,
  message = "An error occurred",
  errors = null
) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  }),
});

/**
 * CORS preflight response
 */
export const corsResponse = () => ({
  statusCode: 204,
  headers: {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  },
  body: "",
});
