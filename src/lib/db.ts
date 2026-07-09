import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Creds = { host: string; port: number; user: string; password: string; database: string };

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

// Singleton pool (survives Next.js dev hot-reload).
const g = globalThis as unknown as { _wpPool?: mysql.Pool };

export const pool: mysql.Pool =
  g._wpPool ??
  mysql.createPool({
    ...creds,
    connectionLimit: 8,
    waitForConnections: true,
    decimalNumbers: true,
  });

if (process.env.NODE_ENV !== 'production') g._wpPool = pool;

export async function q<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
