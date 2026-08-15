'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';

/** Browser Supabase client. Anon key only — RLS does the protecting. */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
