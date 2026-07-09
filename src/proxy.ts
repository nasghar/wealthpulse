// Next.js 16 Proxy (formerly "middleware"). Gates the entire app behind a shared
// password when APP_PASSWORD is set. If APP_PASSWORD is unset (e.g. local dev),
// the gate is disabled and every request passes through unchanged.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, authSecret, SESSION_COOKIE } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const secret = authSecret();
  if (!secret) return NextResponse.next(); // auth disabled — no APP_PASSWORD set

  const { pathname } = request.nextUrl;

  // Always allow the login page and the auth endpoints themselves.
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const ok = await verifyToken(secret, request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  // Unauthenticated: APIs get a 401, everything else redirects to /login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Login required.' } },
      { status: 401 }
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static image assets. API routes
  // ARE matched (so they're protected too); auth endpoints are allow-listed above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)'],
};
