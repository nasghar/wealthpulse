import { NextRequest, NextResponse } from 'next/server';
import { signToken, authSecret, constantTimeEqual, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify the shared password and issue a signed, httpOnly session cookie.
export async function POST(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.json({ ok: true, note: 'auth disabled' });

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? '');
  if (!password || !constantTimeEqual(password, pass)) {
    return NextResponse.json(
      { error: { code: 'BAD_PASSWORD', message: 'Incorrect password.' } },
      { status: 401 }
    );
  }

  const token = await signToken(authSecret()!, SESSION_TTL_MS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
