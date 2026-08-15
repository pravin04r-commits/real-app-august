/**
 * Public runtime config, validated once at import time.
 * A missing Supabase URL should be an obvious error, not a mystery 500.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith('your-')) {
    throw new Error(
      `Missing environment variable ${name}. Copy apps/web/.env.example to apps/web/.env.local and fill it in.`
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get apiUrl() {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  },
};

/** True when Supabase is configured — lets pages render a setup notice instead of crashing. */
export const isConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('your-');
