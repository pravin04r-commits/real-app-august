import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { APIResponse } from '@real/types';

export function ok<T>(res: Response, data: T, status = 200): Response<APIResponse<T>> {
  return res.status(status).json({ ok: true, data });
}

export function created<T>(res: Response, data: T): Response<APIResponse<T>> {
  return ok(res, data, 201);
}

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wrap an async route so a rejected promise reaches the error middleware
 * instead of hanging the request. Express 4 does not do this for us.
 */
export function handler(fn: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
