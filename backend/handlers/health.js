import { executeQuery } from '../utils/db.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns system health status
 * - Database connectivity
 * - Environment configuration
 * - System uptime
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const startTime = Date.now();

    // Check database connectivity
    let dbStatus = 'healthy';
    let dbResponseTime = 0;

    try {
      const dbStart = Date.now();
      await executeQuery('SELECT 1 as health_check');
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Check environment variables
    const envStatus = {
      database: !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim()),
      jwt_secret: !!(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16),
      onepapi_key: !!(process.env.ONEPAPI_API_KEY && process.env.ONEPAPI_API_KEY.trim()),
      node_env: process.env.NODE_ENV || 'not set'
    };

    const allEnvConfigured = envStatus.database && envStatus.jwt_secret;

    // Overall health status
    const isHealthy = dbStatus === 'healthy' && allEnvConfigured;

    const responseTime = Date.now() - startTime;

    return successResponse(200, {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      response_time_ms: responseTime,
      database: {
        status: dbStatus,
        response_time_ms: dbResponseTime
      },
      environment: {
        node_env: envStatus.node_env,
        database_set: envStatus.database,
        jwt_set: envStatus.jwt_secret,
        onepapi_set: envStatus.onepapi_key,
        configured: allEnvConfigured
      },
      version: '1.0.0'
    });

  } catch (error) {
    console.error('Health check error:', error);
    return errorResponse(500, 'Health check failed', { error: error.message });
  }
};
