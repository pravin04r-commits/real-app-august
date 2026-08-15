import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const PUBLIC_PREFIXES = ['/login', '/signup', '/auth', '/u/', '/leaderboard', '/setup-required'];
const APP_PREFIXES = ['/universe', '/reality', '/dares', '/sparks', '/fun'];
const ONBOARDING_PREFIXES = ['/profile', '/pair', '/setup'];

/**
 * Route protection.
 * Signed out + protected route  -> /login
 * Signed in  + auth route       -> /universe
 * Everything else passes through; the app layout handles onboarding redirects
 * because it can see whether the user is actually paired.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Without Supabase configured there is no session to check — let the
  // setup notice render instead of redirect-looping.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/';
  const isProtected =
    APP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ONBOARDING_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/universe';
    url.search = '';
    return NextResponse.redirect(url);
  }

  void isPublic;
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
