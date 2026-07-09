// WealthPulse live market simulator.
// Walks each symbol's price with mean-reverting GBM, updates latest_price every
// tick (single CASE update) and appends intraday rows to price_ticks periodically.
// Run: node --env-file=.env.local scripts/simulate.mjs
import { pool } from './db.mjs';

const TICK_MS = 1500;          // update cadence
const HISTORY_EVERY = 4;       // append to price_ticks every Nth tick (~6s)

const fmtDT = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// load symbol state
const [secs] = await pool.query(
  `SELECT s.symbol, s.asset_class, s.annual_vol, lp.price, lp.prev_close
   FROM securities s JOIN latest_price lp ON s.symbol = lp.symbol`
);
const state = new Map();
for (const r of secs) {
  state.set(r.symbol, {
    cls: r.asset_class,
    vol: Number(r.annual_vol),
    price: Number(r.price),
    prevClose: Number(r.prev_close),
  });
}
console.log(`Simulating ${state.size} symbols every ${TICK_MS}ms. Ctrl-C to stop.`);

let tick = 0;
async function step() {
  tick++;
  const now = new Date();
  const ts = fmtDT(now);

  const priceCase = [];
  const chgCase = [];
  const symbols = [];
  const tickRows = [];

  for (const [sym, st] of state) {
    if (st.cls === 'Cash') {
      priceCase.push(`WHEN '${sym}' THEN 1.0`);
      chgCase.push(`WHEN '${sym}' THEN 0`);
      symbols.push(sym);
      continue;
    }
    const dailyVol = st.vol / Math.sqrt(252);
    const perTick = dailyVol / Math.sqrt(26);           // ~26 lively ticks/day
    const revert = ((st.prevClose - st.price) / st.prevClose) * 0.02; // gentle pull
    let next = st.price * Math.exp(perTick * randn() + revert);
    const band = st.cls === 'Crypto' ? 0.25 : 0.08;
    const lo = st.prevClose * (1 - band), hi = st.prevClose * (1 + band);
    next = Math.max(lo, Math.min(hi, next));
    next = Math.round(next * 1e4) / 1e4;
    st.price = next;
    const chg = Math.round((next - st.prevClose) / st.prevClose * 1e6) / 1e4;

    priceCase.push(`WHEN '${sym}' THEN ${next}`);
    chgCase.push(`WHEN '${sym}' THEN ${chg}`);
    symbols.push(sym);
    if (tick % HISTORY_EVERY === 0) {
      tickRows.push([sym, ts, next, st.prevClose, chg, Math.floor(Math.random() * 5e5)]);
    }
  }

  const inList = symbols.map((s) => `'${s}'`).join(',');
  const sql = `UPDATE latest_price SET
      price = CASE symbol ${priceCase.join(' ')} END,
      day_change_pct = CASE symbol ${chgCase.join(' ')} END,
      ts = '${ts}'
    WHERE symbol IN (${inList})`;

  try {
    await pool.query(sql);
    if (tickRows.length) {
      await pool.query(
        'INSERT INTO price_ticks (symbol, ts, price, prev_close, day_change_pct, volume) VALUES ?',
        [tickRows]
      );
    }
    process.stdout.write(`\rtick ${tick} @ ${ts}  (updated ${symbols.length} symbols)   `);
  } catch (e) {
    console.error('\ntick error:', e.message);
  }
}

await step();
const timer = setInterval(step, TICK_MS);

process.on('SIGINT', async () => {
  clearInterval(timer);
  console.log('\nstopping simulator...');
  await pool.end();
  process.exit(0);
});
