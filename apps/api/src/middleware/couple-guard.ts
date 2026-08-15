import type { NextFunction, Request, Response } from 'express';
import type { Couple, User } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { currentUser } from './auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      couple?: Couple;
      partner?: User | null;
    }
  }
}

/**
 * Gate for every couple-scoped route.
 * Loads the couple, loads the partner, and re-asserts the 2-user rule
 * in application code even though the database also enforces it.
 */
export async function requireCouple(req: Request, _res: Response, next: NextFunction) {
  try {
    const me = currentUser(req);
    if (!me.couple_id) throw AppError.notPaired();

    const { data: couple, error } = await db
      .from('couples')
      .select('*')
      .eq('id', me.couple_id)
      .maybeSingle<Couple>();

    if (error) throw AppError.internal('Could not load your couple space.', error.message);
    if (!couple) throw AppError.notFound('That couple space no longer exists.');

    const { data: members, error: membersError } = await db
      .from('users')
      .select('*')
      .eq('couple_id', couple.id)
      .returns<User[]>();

    if (membersError) throw AppError.internal('Could not load partners.', membersError.message);

    if (members.length > 2) {
      // Should be impossible — the DB trigger blocks it. Refuse to serve anyway.
      throw new AppError('COUPLE_FULL', 'This couple space is in an invalid state. Contact support.', 409);
    }

    req.couple = couple;
    req.partner = members.find((m) => m.id !== me.id) ?? null;
    next();
  } catch (error) {
    next(error);
  }
}

export function currentCouple(req: Request): Couple {
  if (!req.couple) throw AppError.notPaired();
  return req.couple;
}
