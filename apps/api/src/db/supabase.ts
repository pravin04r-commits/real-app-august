import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Admin client — service role key, bypasses RLS.
 * Every route that uses it MUST enforce couple ownership itself.
 * This client never reaches the browser.
 */
export const db: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** Verify a user's access token and return their auth identity. */
export async function getUserFromToken(token: string) {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
