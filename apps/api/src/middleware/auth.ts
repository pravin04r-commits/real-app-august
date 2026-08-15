import type { NextFunction, Request, Response } from 'express';
import type { User } from '@real/types';
import { db, getUserFromToken } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; email: string | null };
      profile?: User;
    }
  }
}

/** Requires a valid Supabase access token in `Authorization: Bearer <token>`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing access token.');
    }

    const token = header.slice(7).trim();
    const user = await getUserFromToken(token);
    if (!user) throw AppError.unauthorized('That session expired. Sign in again.');

    req.auth = { userId: user.id, email: user.email ?? null };

    const { data: profile, error } = await db
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<User>();

    if (error) throw AppError.internal('Could not load your profile.', error.message);

    if (!profile) {
      // The auth trigger should have created this row; heal it rather than 500.
      const { data: healed, error: healError } = await db
        .from('users')
        .insert({ id: user.id, display_name: user.email?.split('@')[0] ?? null })
        .select('*')
        .single<User>();
      if (healError) throw AppError.internal('Could not create your profile.', healError.message);
      req.profile = healed;
    } else {
      req.profile = profile;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/** Convenience accessors — throw rather than return undefined. */
export function currentUser(req: Request): User {
  if (!req.profile) throw AppError.unauthorized();
  return req.profile;
}

export function currentUserId(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
}
