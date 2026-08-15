import type { NextFunction, Request, Response } from 'express';
import type { APIError } from '@real/types';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/logger.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response) {
  const body: APIError = {
    ok: false,
    error: { code: 'NOT_FOUND', message: 'No route here. Check the path.' },
  };
  res.status(404).json(body);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      log.error(err.message, { code: err.code, path: req.path, details: err.details });
    }
    const body: APIError = {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && !isProd ? { details: err.details } : {}),
      },
    };
    res.status(err.status).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  log.error('Unhandled error', { message, path: req.path });

  const body: APIError = {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Something broke on our side. Try again.' : message,
    },
  };
  res.status(500).json(body);
}
