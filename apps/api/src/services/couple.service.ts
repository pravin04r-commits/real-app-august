import type { Couple, Milestone, User } from '@real/types';
import { generateInviteCode } from '@real/utils';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';

const INVITE_TTL_HOURS = 48;

/** Generate an invite code that is not already in use. */
export async function mintInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const { data, error } = await db
      .from('couples')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (error) throw fromPostgrest(error);
    if (!data) return code;
  }
  throw AppError.internal('Could not generate an invite code. Try again.');
}

export function inviteExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export async function membersOf(coupleId: string): Promise<User[]> {
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: true })
    .returns<User[]>();

  if (error) throw fromPostgrest(error);
  return data ?? [];
}

/**
 * Join an existing couple via invite code.
 * Rejects: unknown codes, expired codes, self-pairing, already-paired users,
 * and any space that already holds two partners.
 */
export async function joinByInviteCode(user: User, rawCode: string): Promise<Couple> {
  if (user.couple_id) {
    throw new AppError('ALREADY_PAIRED', 'You are already in a couple space.', 409);
  }

  const { data: couple, error } = await db
    .from('couples')
    .select('*')
    .eq('invite_code', rawCode)
    .maybeSingle<Couple>();

  if (error) throw fromPostgrest(error);
  if (!couple) throw new AppError('INVITE_INVALID', 'That code does not match any couple space.', 404);

  if (couple.invite_expires_at && new Date(couple.invite_expires_at) < new Date()) {
    throw new AppError('INVITE_EXPIRED', 'That code expired. Ask your partner for a fresh one.', 410);
  }

  const members = await membersOf(couple.id);

  if (members.some((m) => m.id === user.id)) {
    throw new AppError('SELF_PAIR', 'You cannot pair with yourself. That is a different app.', 409);
  }

  if (members.length >= 2) {
    throw new AppError('COUPLE_FULL', 'That space already has two partners. R.E.A.L. is built for exactly two.', 409);
  }

  const { error: joinError } = await db
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', user.id);

  if (joinError) throw fromPostgrest(joinError);

  // Second partner is in — burn the code so it can never be reused.
  const { data: updated, error: burnError } = await db
    .from('couples')
    .update({ invite_code: null, invite_expires_at: null })
    .eq('id', couple.id)
    .select('*')
    .single<Couple>();

  if (burnError) throw fromPostgrest(burnError);

  await seedAutoMilestones(updated);
  return updated;
}

/** Milestones the app fills in for them so the timeline is never empty. */
export async function seedAutoMilestones(couple: Couple): Promise<void> {
  if (!couple.start_date) return;

  const { data: existing } = await db
    .from('milestones')
    .select('id')
    .eq('couple_id', couple.id)
    .eq('is_auto', true)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows: Array<Partial<Milestone>> = [
    {
      couple_id: couple.id,
      title: 'Day one',
      description: 'Where all of this started.',
      milestone_date: couple.start_date,
      emoji: '💥',
      is_auto: true,
    },
    {
      couple_id: couple.id,
      title: 'Joined R.E.A.L.',
      description: 'The relationship got its own universe.',
      milestone_date: new Date().toISOString().slice(0, 10),
      emoji: '🔴',
      is_auto: true,
    },
  ];

  await db.from('milestones').insert(rows);
}
