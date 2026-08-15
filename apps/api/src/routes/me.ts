import { Router } from 'express';
import { z } from 'zod';
import { LOVE_LANGUAGES, type User } from '@real/types';
import { db } from '../db/supabase.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { fromPostgrest } from '../lib/errors.js';
import { handler, ok } from '../lib/http.js';

export const meRouter = Router();

meRouter.use(requireAuth);

/** GET /me — the signed-in partner's profile. */
meRouter.get(
  '/',
  handler(async (req, res) => {
    ok(res, currentUser(req));
  })
);

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(40).optional(),
  avatar_url: z.string().url().nullable().optional(),
  // People rarely have exactly one — accept every language they pick.
  love_languages: z.array(z.enum(LOVE_LANGUAGES)).max(5).optional(),
  personality_tag: z.string().trim().max(40).optional(),
  onboarding_done: z.boolean().optional(),
});

/** PATCH /me — update your own profile. Never anyone else's. */
meRouter.patch(
  '/',
  validate(updateProfileSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    const { data, error } = await db
      .from('users')
      .update(req.body as Record<string, unknown>)
      .eq('id', me.id)
      .select('*')
      .single<User>();

    if (error) throw fromPostgrest(error);
    ok(res, data);
  })
);
