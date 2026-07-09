// Server-side, stateless market simulation for serverless hosting (Vercel).
// The persistent `scripts/simulate.mjs` loop can't run on serverless, so instead
// the UI drives ticks: each POST /api/sim/tick calls runTick(), which reads the
// current prices from the DB, walks them one step (same mean-reverting GBM as the
// script), and writes them back. State lives in the DB, not in process memory.
import { pool, q } from './db';

type Sec = { symbol: string; asset_class: string; annual_vol: number; price: number; prev_close: number };

// Box–Muller standard normal.
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const fmtDT = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

// Advance every symbol one tick. When `withHistory` is true, also append a row
// per symbol to price_ticks (the caller throttles this to keep the table small).
export async function runTick(withHistory: boolean): Promise<{ updated: number; history: number }> {
  const secs = await q<Sec>(
    `SELECT s.symbol, s.asset_class, s.annual_vol, lp.price, lp.prev_close
     FROM securities s JOIN latest_price lp ON s.symbol = lp.symbol`
  );

  const priceCase: string[] = [];
  const chgCase: string[] = [];
  const symbols: string[] = [];
  const tickRows: (string | number)[][] = [];
  const ts = fmtDT(new Date());

  for (const r of secs) {
    const price = Number(r.price), prevClose = Number(r.prev_close), vol = Number(r.annual_vol);
    if (r.asset_class === 'Cash') {
      priceCase.push(`WHEN '${r.symbol}' THEN 1.0`);
      chgCase.push(`WHEN '${r.symbol}' THEN 0`);
      symbols.push(r.symbol);
      continue;
    }
    const perTick = vol / Math.sqrt(252) / Math.sqrt(26);        // ~26 lively ticks/day
    const revert = ((prevClose - price) / prevClose) * 0.02;      // gentle mean-reversion
    let next = price * Math.exp(perTick * randn() + revert);
    const band = r.asset_class === 'Crypto' ? 0.25 : 0.08;
    next = Math.max(prevClose * (1 - band), Math.min(prevClose * (1 + band), next));
    next = Math.round(next * 1e4) / 1e4;
    const chg = Math.round((next - prevClose) / prevClose * 1e6) / 1e4;

    priceCase.push(`WHEN '${r.symbol}' THEN ${next}`);
    chgCase.push(`WHEN '${r.symbol}' THEN ${chg}`);
    symbols.push(r.symbol);
    if (withHistory) tickRows.push([r.symbol, ts, next, prevClose, chg, Math.floor(Math.random() * 5e5)]);
  }

  if (!symbols.length) return { updated: 0, history: 0 };

  const inList = symbols.map((s) => `'${s}'`).join(',');
  await q(
    `UPDATE latest_price SET
       price = CASE symbol ${priceCase.join(' ')} END,
       day_change_pct = CASE symbol ${chgCase.join(' ')} END,
       ts = '${ts}'
     WHERE symbol IN (${inList})`
  );
  if (tickRows.length) {
    await pool.query(
      'INSERT INTO price_ticks (symbol, ts, price, prev_close, day_change_pct, volume) VALUES ?',
      [tickRows]
    );
  }
  return { updated: symbols.length, history: tickRows.length };
}

// Clean up old intraday history and reset the board to a flat "market open"
// (price = prev_close). This is what the UI's "Start Live (fresh)" button calls.
export async function resetSimulation(): Promise<{ ok: true; cleared: string }> {
  await q('DELETE FROM price_ticks');
  await q('UPDATE latest_price SET price = prev_close, day_change_pct = 0, ts = NOW()');
  return { ok: true, cleared: 'price_ticks' };
}

// Retention: trim intraday history to a rolling window (used by the optional
// cleanup call so an always-open tab doesn't grow price_ticks without bound).
export async function trimHistory(keepHours = 48): Promise<{ ok: true }> {
  await q(`DELETE FROM price_ticks WHERE ts < NOW() - INTERVAL ${Number(keepHours)} HOUR`);
  return { ok: true };
}
