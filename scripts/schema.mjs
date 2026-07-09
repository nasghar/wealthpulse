// Create the WealthPulse database + all (columnstore) tables on a fresh workspace.
// Idempotent: CREATE ... IF NOT EXISTS. Reads connection from .dbcreds.json.
// Run: node scripts/schema.mjs   (or: npm run schema)
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const creds = JSON.parse(readFileSync(new URL('../.dbcreds.json', import.meta.url), 'utf8'));
const db = creds.database;

// Connect WITHOUT a database first so we can CREATE it if missing.
const { database, ...connBase } = creds;
const conn = await mysql.createConnection(connBase);

console.log(`Creating database \`${db}\` (if needed)...`);
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\``);
await conn.query(`USE \`${db}\``);

const DDL = [
  `CREATE TABLE IF NOT EXISTS advisors (
     advisor_id INT NOT NULL, name VARCHAR(120) NOT NULL, team VARCHAR(60),
     region VARCHAR(40), hire_date DATE,
     SHARD KEY (advisor_id), SORT KEY (advisor_id))`,
  `CREATE TABLE IF NOT EXISTS clients (
     client_id INT NOT NULL, advisor_id INT NOT NULL, household VARCHAR(120) NOT NULL,
     name VARCHAR(120) NOT NULL, email VARCHAR(160), segment VARCHAR(24),
     risk_profile VARCHAR(16), join_date DATE,
     SHARD KEY (client_id), SORT KEY (advisor_id, client_id))`,
  `CREATE TABLE IF NOT EXISTS accounts (
     account_id INT NOT NULL, client_id INT NOT NULL, account_type VARCHAR(20) NOT NULL,
     opened_date DATE, cash_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
     SHARD KEY (account_id), SORT KEY (client_id, account_id))`,
  `CREATE TABLE IF NOT EXISTS securities (
     symbol VARCHAR(12) NOT NULL, name VARCHAR(120) NOT NULL, asset_class VARCHAR(20) NOT NULL,
     sector VARCHAR(40), exchange VARCHAR(20), currency VARCHAR(8) NOT NULL DEFAULT 'USD',
     base_price DECIMAL(18,4) NOT NULL, annual_drift DECIMAL(8,5) NOT NULL DEFAULT 0.07,
     annual_vol DECIMAL(8,5) NOT NULL DEFAULT 0.20,
     SHARD KEY (symbol), SORT KEY (symbol))`,
  `CREATE TABLE IF NOT EXISTS positions (
     account_id INT NOT NULL, symbol VARCHAR(12) NOT NULL, quantity DECIMAL(20,6) NOT NULL,
     avg_cost DECIMAL(18,4) NOT NULL, opened_date DATE,
     SHARD KEY (account_id), SORT KEY (symbol, account_id))`,
  `CREATE TABLE IF NOT EXISTS transactions (
     txn_id BIGINT NOT NULL, account_id INT NOT NULL, symbol VARCHAR(12) NOT NULL,
     txn_type VARCHAR(12) NOT NULL, quantity DECIMAL(20,6) NOT NULL DEFAULT 0,
     price DECIMAL(18,4) NOT NULL DEFAULT 0, amount DECIMAL(18,2) NOT NULL, txn_ts DATETIME(6) NOT NULL,
     SHARD KEY (account_id), SORT KEY (txn_ts))`,
  `CREATE TABLE IF NOT EXISTS price_ticks (
     symbol VARCHAR(12) NOT NULL, ts DATETIME(6) NOT NULL, price DECIMAL(18,4) NOT NULL,
     prev_close DECIMAL(18,4) NOT NULL, day_change_pct DECIMAL(10,4) NOT NULL, volume BIGINT NOT NULL DEFAULT 0,
     SHARD KEY (symbol), SORT KEY (symbol, ts))`,
  `CREATE TABLE IF NOT EXISTS latest_price (
     symbol VARCHAR(12) NOT NULL, ts DATETIME(6) NOT NULL, price DECIMAL(18,4) NOT NULL,
     prev_close DECIMAL(18,4) NOT NULL, day_change_pct DECIMAL(10,4) NOT NULL,
     SHARD KEY (symbol), SORT KEY (symbol))`,
  `CREATE TABLE IF NOT EXISTS daily_nav (
     account_id INT NOT NULL, as_of_date DATE NOT NULL, market_value DECIMAL(20,2) NOT NULL,
     cash DECIMAL(20,2) NOT NULL, total_value DECIMAL(20,2) NOT NULL,
     SHARD KEY (account_id), SORT KEY (account_id, as_of_date))`,
];

for (const sql of DDL) {
  const name = sql.match(/EXISTS (\w+)/)[1];
  await conn.query(sql);
  console.log(`  ✓ ${name}`);
}

console.log(`\nSchema ready on \`${db}\`. Next: npm run seed`);
await conn.end();
