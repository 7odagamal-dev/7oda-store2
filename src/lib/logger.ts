import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  correlationId: string;
  timestamp: string;
  level: LogLevel;
  route: string;
  method: string;
  durationMs: number;
  statusCode: number;
  message: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function newCorrelationId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function log(
  level: LogLevel,
  entry: Omit<LogEntry, 'timestamp'>,
): void {
  const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  const line = JSON.stringify(full);

  switch (level) {
    case 'error': {
      console.error(line);
      if (entry.error && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureException(new Error(entry.error), {
          tags: { route: entry.route, correlationId: entry.correlationId },
          extra: entry.metadata,
        });
      }
      break;
    }
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function apiLogger(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  correlationId?: string,
): Promise<NextResponse> {
  const cId = correlationId || newCorrelationId();
  const start = Date.now();
  const route = req.nextUrl.pathname;
  const method = req.method;

  return handler()
    .then((res) => {
      const durationMs = Date.now() - start;
      const level: LogLevel = res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info';
      log(level, {
        correlationId: cId,
        level,
        route,
        method,
        durationMs,
        statusCode: res.status,
        message: `${method} ${route} → ${res.status} (${durationMs}ms)`,
      });
      if (res.status >= 500 && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureMessage(`[${cId}] ${method} ${route} → ${res.status}`, {
          level: 'error',
          tags: { correlationId: cId, route, method, statusCode: String(res.status) },
        });
      }
      return res;
    })
    .catch((err: unknown) => {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log('error', {
        correlationId: cId,
        level: 'error',
        route,
        method,
        durationMs,
        statusCode: 500,
        message: `${method} ${route} → UNHANDLED (${durationMs}ms)`,
        error: msg,
        metadata: { stack: err instanceof Error ? err.stack : undefined },
      });
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureException(err instanceof Error ? err : new Error(msg), {
          tags: { correlationId: cId, route, method },
        });
      }
      return NextResponse.json(
        { error: 'Internal server error', correlationId: cId },
        { status: 500 },
      );
    });
}

export function apiLoggerSimple(
  route: string,
  method: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const correlationId = newCorrelationId();
  const start = Date.now();
  return handler()
    .then((res) => {
      const durationMs = Date.now() - start;
      log(res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info', {
        correlationId,
        level: res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info',
        route,
        method,
        durationMs,
        statusCode: res.status,
        message: `${method} ${route} → ${res.status} (${durationMs}ms)`,
      });
      return res;
    })
    .catch((err: unknown) => {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log('error', {
        correlationId,
        level: 'error',
        route,
        method,
        durationMs,
        statusCode: 500,
        message: `${method} ${route} → UNHANDLED (${durationMs}ms)`,
        error: msg,
      });
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureException(err instanceof Error ? err : new Error(msg), {
          tags: { correlationId, route, method },
        });
      }
      return NextResponse.json(
        { error: 'Internal server error', correlationId },
        { status: 500 },
      );
    });
}
