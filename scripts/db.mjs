// Shared mysql2 pool for the seed + simulator scripts.
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

// Prefer .dbcreds.json for local runs; fall back to env vars for CI / cloud seeding.
function loadCreds() {
  try {
    return JSON.parse(readFileSync(new URL('../.dbcreds.json', import.meta.url), 'utf8'));
  } catch {
    const e = process.env;
    if (!e.SINGLESTORE_HOST) {
      throw new Error('No .dbcreds.json and no SINGLESTORE_HOST env var — set one to seed the database.');
    }
    return {
      host: e.SINGLESTORE_HOST,
      port: Number(e.SINGLESTORE_PORT ?? 3306),
      user: e.SINGLESTORE_USER ?? 'admin',
      password: e.SINGLESTORE_PASSWORD ?? '',
      database: e.SINGLESTORE_DATABASE ?? 'wealthpulse',
    };
  }
}

const creds = loadCreds();

export const pool = mysql.createPool({
  ...creds,
  connectionLimit: 8,
  waitForConnections: true,
  decimalNumbers: false,
});

// Insert `rows` (array of arrays) into table(cols) in chunks.
export async function bulkInsert(table, cols, rows, chunk = 5000) {
  const colList = cols.map((c) => `\`${c}\``).join(',');
  let done = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await pool.query(`INSERT INTO \`${table}\` (${colList}) VALUES ?`, [slice]);
    done += slice.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}   `);
  }
  if (rows.length) process.stdout.write('\n');
}
