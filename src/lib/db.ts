import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Creds = { host: string; port: number; user: string; password: string; database: string };

let credsFromEnv = false;

// Resolve DB creds. Prefer .dbcreds.json for local dev (avoids dotenv-expand
// mangling the '$' in the password); fall back to env vars for cloud hosting
// (Vercel/Railway/Render), where secrets are injected, not committed as files.
function loadCreds(): Creds {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), '.dbcreds.json'), 'utf8')) as Creds;
  } catch {
    const e = process.env;
    const host = e.SINGLESTORE_HOST;
    if (!host) {
      throw new Error(
        'No DB credentials found: add .dbcreds.json (local) or set SINGLESTORE_HOST/USER/PASSWORD/DATABASE env vars (cloud).'
      );
    }
    credsFromEnv = true;
    return {
      host,
      port: Number(e.SINGLESTORE_PORT ?? 3306),
      user: e.SINGLESTORE_USER ?? 'admin',
      password: e.SINGLESTORE_PASSWORD ?? '',
      database: e.SINGLESTORE_DATABASE ?? 'wealthpulse',
    };
  }
}

const creds = loadCreds();

// Encrypt the connection to Helios over the public internet. Default ON when
// creds come from env (i.e. a cloud deploy); force with SINGLESTORE_SSL=true or
// disable with SINGLESTORE_SSL=false. SINGLESTORE_SSL_INSECURE=true skips cert
// verification (last resort if the CA chain isn't trusted).
const wantSsl = process.env.SINGLESTORE_SSL === 'true' || (credsFromEnv && process.env.SINGLESTORE_SSL !== 'false');
const ssl = wantSsl
  ? { minVersion: 'TLSv1.2' as const, rejectUnauthorized: process.env.SINGLESTORE_SSL_INSECURE !== 'true' }
  : undefined;

// Singleton pool (survives Next.js dev hot-reload).
const g = globalThis as unknown as { _wpPool?: mysql.Pool };

export const pool: mysql.Pool =
  g._wpPool ??
  mysql.createPool({
    ...creds,
    // Keep this low on serverless: each warm function instance holds its own
    // pool, and many concurrent instances can otherwise exhaust Helios.
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? (credsFromEnv ? 3 : 8)),
    waitForConnections: true,
    decimalNumbers: true,
    ...(ssl ? { ssl } : {}),
  });

if (process.env.NODE_ENV !== 'production') g._wpPool = pool;

export async function q<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
