import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/** Zod-validate a request segment and replace it with the parsed value. */
export function validate<T>(schema: ZodSchema<T>, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') req.body = parsed;
      else Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(
            'VALIDATION_ERROR',
            'Some of that input did not look right.',
            422,
            error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
          )
        );
        return;
      }
      next(error);
    }
  };
}
