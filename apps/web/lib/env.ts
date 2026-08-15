/**
 * Public runtime config.
 *
 * These values are read during `next build` as well as in the browser, because
 * Next prerenders client components on the server. Throwing when one is missing
 * therefore takes down the entire production build with a stack trace pointing
 * at a webpack chunk — which tells you nothing about the actual problem.
 *
 * So: never throw during the build. Fall back to an obviously-fake value, let
 * the build finish, and surface a clear, actionable message in the browser
 * where somebody can actually do something about it.
 */

const PLACEHOLDER_URL = 'https://not-configured.supabase.invalid';
const PLACEHOLDER_KEY = 'not-configured';

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith('your-') || value.trim() === '';
}

function readPublic(value: string | undefined, fallback: string): string {
  return isPlaceholder(value) ? fallback : (value as string);
}

export const publicEnv = {
  get supabaseUrl() {
    return readPublic(process.env.NEXT_PUBLIC_SUPABASE_URL, PLACEHOLDER_URL);
  },
  get supabaseAnonKey() {
    return readPublic(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, PLACEHOLDER_KEY);
  },
  get apiUrl() {
    // Trailing slashes produce '//couple/universe' — strip them defensively.
    return readPublic(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:4000').replace(/\/+$/, '');
  },
  get siteUrl() {
    return readPublic(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000').replace(/\/+$/, '');
  },
};

/**
 * True when Supabase is actually wired up.
 * The UI uses this to show a setup notice instead of failing mysteriously.
 */
export const isConfigured =
  !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Human-readable list of what is missing, for the setup notice. */
export function missingEnvVars(): string[] {
  const missing: string[] = [];
  if (isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (isPlaceholder(process.env.NEXT_PUBLIC_API_URL)) missing.push('NEXT_PUBLIC_API_URL');
  return missing;
}
