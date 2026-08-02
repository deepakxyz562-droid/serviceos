/**
 * Structured logger built on pino.
 *
 * - In production: JSON logs to stdout (parseable by Datadog/Logtail/Loki)
 * - In development: pretty-printed colored logs
 * - Every log line includes: timestamp, level, requestId (if in request scope)
 *
 * Usage in API routes:
 *   import { logger, withRequestId } from '@/lib/logger';
 *   const log = withRequestId(request); // attaches requestId from header or generates one
 *   log.info({ userId, action }, 'User logged in');
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: {
    service: 'fieseros',
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,service,env',
          },
        },
      }
    : {
        // JSON in production — no transport (faster, stdout directly)
      }),
});

export type Logger = typeof baseLogger;

/**
 * Generate a new request ID (short, URL-safe).
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get or generate a request ID from a Request's headers.
 * Checks X-Request-Id header first (set by middleware), then generates one.
 */
export function getRequestId(request?: Request): string {
  if (request) {
    const existing = request.headers.get('x-request-id');
    if (existing) return existing;
  }
  return generateRequestId();
}

/**
 * Create a child logger scoped to a request.
 * Usage: const log = withRequestId(request); log.info({...}, 'msg');
 */
export function withRequestId(request?: Request): Logger {
  const requestId = getRequestId(request);
  return baseLogger.child({ requestId });
}

export { baseLogger as logger };
export default baseLogger;
