import type { APIErrorCode } from '@real/types';

/** Every failure the API returns on purpose flows through this class. */
export class AppError extends Error {
  readonly code: APIErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: APIErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static unauthorized(message = 'You need to be signed in.') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Not your universe.') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Nothing here.') {
    return new AppError('NOT_FOUND', message, 404);
  }

  static notPaired(message = 'Pair with your partner first.') {
    return new AppError('NOT_PAIRED', message, 409);
  }

  static internal(message = 'Something broke on our side.', details?: unknown) {
    return new AppError('INTERNAL_ERROR', message, 500, details);
  }
}

/** Map Postgres/PostgREST errors onto our own vocabulary. */
export function fromPostgrest(error: { message: string; code?: string } | null): AppError {
  const message = error?.message ?? 'Database error';

  if (message.includes('COUPLE_FULL')) {
    return new AppError('COUPLE_FULL', 'This couple space already has two partners. R.E.A.L. is built for exactly two.', 409);
  }
  if (message.includes('INSUFFICIENT_SPARKS')) {
    return new AppError('INSUFFICIENT_SPARKS', 'Not enough Sparks for that yet.', 409);
  }
  if (message.includes('reality_logs_one_per_day')) {
    return new AppError('ALREADY_LOGGED_TODAY', 'You already checked in today.', 409);
  }
  if (error?.code === 'PGRST116') {
    return AppError.notFound();
  }

  return AppError.internal('Database error', message);
}
