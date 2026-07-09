// Stateless cookie-session auth for the demo gate. A signed token proves the
// visitor entered APP_PASSWORD; there is no server-side session store (works on
// serverless/Vercel). Uses Web Crypto (available in both the Node.js and Edge
// runtimes) so the same helpers run in proxy.ts and in the login route handler.

const enc = new TextEncoder();
const dec = new TextDecoder();

// The signing key: AUTH_SECRET if set, else derived from APP_PASSWORD. Returns
// null when APP_PASSWORD is unset — which means auth is disabled entirely.
export function authSecret(): string | null {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return null;
  return process.env.AUTH_SECRET || pass;
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// TS 5.7 makes Uint8Array generic over ArrayBufferLike, which doesn't satisfy the
// stricter BufferSource on Web Crypto method signatures — cast at the boundary.
const bs = (s: string): BufferSource => enc.encode(s) as unknown as BufferSource;

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    bs(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Produce `payload.signature`; payload carries an expiry so tokens auto-lapse.
export async function signToken(secret: string, ttlMs: number): Promise<string> {
  const payload = bytesToB64url(enc.encode(JSON.stringify({ exp: Date.now() + ttlMs })));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, bs(payload)));
  return `${payload}.${bytesToB64url(sig)}`;
}

export async function verifyToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig) as unknown as BufferSource, bs(payload));
    if (!ok) return false;
    const { exp } = JSON.parse(dec.decode(b64urlToBytes(payload)));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

// Length-safe comparison to avoid leaking the password via timing.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const SESSION_COOKIE = 'wp_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
