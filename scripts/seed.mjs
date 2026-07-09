// WealthPulse synthetic data generator — internally consistent, seeded, realistic.
// Run: node scripts/seed.mjs   (or: npm run seed)
import { pool, bulkInsert } from './db.mjs';

// ---------- seeded RNG (mulberry32) ----------
let _s = 0x9e3779b9;
function rnd() {
  _s |= 0; _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));        // int [a,b]
const rf = (a, b) => a + rnd() * (b - a);                         // float [a,b]
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function randn() { // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function weighted(pairs) { // [[value, weight], ...]
  const tot = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * tot;
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[pairs.length - 1][0];
}

// ---------- date helpers ----------
const fmtDate = (d) => d.toISOString().slice(0, 10);
const fmtDT = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const DAY = 86400000;

// Build trailing 2yr of weekday "trading days" ending yesterday.
const END = new Date('2026-06-26T00:00:00Z');
const tradingDays = [];
{
  let d = new Date(END);
  while (tradingDays.length < 520) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) tradingDays.unshift(new Date(d));
    d = new Date(d.getTime() - DAY);
  }
}
const NDAYS = tradingDays.length; // ~520

// ---------- securities (75 real symbols) ----------
// [symbol, name, asset_class, sector, exchange, price, vol, drift]
const SEC = [
  ['AAPL','Apple Inc.','Equity','Technology','NASDAQ',195,0.26,0.12],
  ['MSFT','Microsoft Corp.','Equity','Technology','NASDAQ',440,0.24,0.13],
  ['NVDA','NVIDIA Corp.','Equity','Technology','NASDAQ',1180,0.45,0.30],
  ['AMZN','Amazon.com Inc.','Equity','Consumer Discretionary','NASDAQ',185,0.30,0.14],
  ['GOOGL','Alphabet Inc.','Equity','Communication Services','NASDAQ',178,0.27,0.12],
  ['META','Meta Platforms Inc.','Equity','Communication Services','NASDAQ',505,0.33,0.18],
  ['TSLA','Tesla Inc.','Equity','Consumer Discretionary','NASDAQ',250,0.50,0.15],
  ['BRK.B','Berkshire Hathaway','Equity','Financials','NYSE',415,0.18,0.10],
  ['JPM','JPMorgan Chase','Equity','Financials','NYSE',200,0.24,0.10],
  ['V','Visa Inc.','Equity','Financials','NYSE',275,0.22,0.11],
  ['MA','Mastercard Inc.','Equity','Financials','NYSE',460,0.23,0.12],
  ['UNH','UnitedHealth Group','Equity','Health Care','NYSE',490,0.25,0.09],
  ['HD','Home Depot','Equity','Consumer Discretionary','NYSE',350,0.24,0.09],
  ['PG','Procter & Gamble','Equity','Consumer Staples','NYSE',168,0.16,0.07],
  ['JNJ','Johnson & Johnson','Equity','Health Care','NYSE',150,0.16,0.06],
  ['XOM','Exxon Mobil','Equity','Energy','NYSE',112,0.25,0.08],
  ['CVX','Chevron Corp.','Equity','Energy','NYSE',158,0.24,0.07],
  ['BAC','Bank of America','Equity','Financials','NYSE',40,0.28,0.09],
  ['WMT','Walmart Inc.','Equity','Consumer Staples','NYSE',68,0.18,0.10],
  ['KO','Coca-Cola Co.','Equity','Consumer Staples','NYSE',62,0.15,0.06],
  ['PEP','PepsiCo Inc.','Equity','Consumer Staples','NASDAQ',170,0.16,0.06],
  ['COST','Costco Wholesale','Equity','Consumer Staples','NASDAQ',850,0.22,0.13],
  ['MCD',"McDonald's Corp.",'Equity','Consumer Discretionary','NYSE',265,0.18,0.08],
  ['DIS','Walt Disney Co.','Equity','Communication Services','NYSE',100,0.30,0.07],
  ['NFLX','Netflix Inc.','Equity','Communication Services','NASDAQ',650,0.38,0.16],
  ['ADBE','Adobe Inc.','Equity','Technology','NASDAQ',480,0.30,0.12],
  ['CRM','Salesforce Inc.','Equity','Technology','NYSE',250,0.32,0.12],
  ['AMD','Advanced Micro Devices','Equity','Technology','NASDAQ',165,0.45,0.20],
  ['INTC','Intel Corp.','Equity','Technology','NASDAQ',31,0.35,0.04],
  ['CSCO','Cisco Systems','Equity','Technology','NASDAQ',48,0.22,0.07],
  ['ORCL','Oracle Corp.','Equity','Technology','NYSE',140,0.26,0.13],
  ['PFE','Pfizer Inc.','Equity','Health Care','NYSE',28,0.24,0.04],
  ['ABBV','AbbVie Inc.','Equity','Health Care','NYSE',175,0.20,0.09],
  ['TMO','Thermo Fisher','Equity','Health Care','NYSE',580,0.24,0.09],
  ['ACN','Accenture plc','Equity','Technology','NYSE',310,0.24,0.10],
  ['GS','Goldman Sachs','Equity','Financials','NYSE',480,0.26,0.11],
  ['MS','Morgan Stanley','Equity','Financials','NYSE',100,0.27,0.10],
  ['AXP','American Express','Equity','Financials','NYSE',240,0.26,0.12],
  ['IBM','IBM Corp.','Equity','Technology','NYSE',175,0.22,0.08],
  ['QCOM','Qualcomm Inc.','Equity','Technology','NASDAQ',165,0.34,0.11],
  ['TXN','Texas Instruments','Equity','Technology','NASDAQ',195,0.26,0.10],
  ['NKE','Nike Inc.','Equity','Consumer Discretionary','NYSE',78,0.28,0.05],
  ['SBUX','Starbucks Corp.','Equity','Consumer Discretionary','NASDAQ',92,0.26,0.06],
  ['LOW',"Lowe's Companies",'Equity','Consumer Discretionary','NYSE',230,0.25,0.09],
  ['CAT','Caterpillar Inc.','Equity','Industrials','NYSE',350,0.27,0.11],
  // ETFs
  ['SPY','SPDR S&P 500 ETF','ETF','Index','NYSE Arca',555,0.16,0.09],
  ['QQQ','Invesco QQQ Trust','ETF','Index','NASDAQ',485,0.20,0.13],
  ['VTI','Vanguard Total Market','ETF','Index','NYSE Arca',275,0.16,0.09],
  ['VOO','Vanguard S&P 500','ETF','Index','NYSE Arca',510,0.16,0.09],
  ['IWM','iShares Russell 2000','ETF','Index','NYSE Arca',205,0.22,0.07],
  ['DIA','SPDR Dow Jones ETF','ETF','Index','NYSE Arca',395,0.15,0.08],
  ['ARKK','ARK Innovation ETF','ETF','Thematic','NYSE Arca',52,0.45,0.10],
  ['XLF','Financial Select Sector','ETF','Sector','NYSE Arca',43,0.20,0.10],
  ['XLE','Energy Select Sector','ETF','Sector','NYSE Arca',92,0.26,0.07],
  ['XLK','Technology Select Sector','ETF','Sector','NYSE Arca',230,0.24,0.14],
  ['VNQ','Vanguard Real Estate','ETF','Real Estate','NYSE Arca',88,0.20,0.05],
  ['GLD','SPDR Gold Shares','ETF','Commodity','NYSE Arca',215,0.14,0.07],
  // Fixed income
  ['AGG','iShares Core US Agg Bond','Fixed Income','Aggregate','NYSE Arca',98,0.06,0.03],
  ['BND','Vanguard Total Bond','Fixed Income','Aggregate','NASDAQ',73,0.06,0.03],
  ['TLT','iShares 20+ Yr Treasury','Fixed Income','Treasury','NASDAQ',95,0.14,0.02],
  ['IEF','iShares 7-10 Yr Treasury','Fixed Income','Treasury','NASDAQ',95,0.08,0.025],
  ['LQD','iShares Inv Grade Corp','Fixed Income','Corporate','NYSE Arca',110,0.08,0.035],
  ['HYG','iShares High Yield Corp','Fixed Income','High Yield','NYSE Arca',79,0.10,0.045],
  ['MUB','iShares National Muni','Fixed Income','Municipal','NYSE Arca',107,0.05,0.03],
  ['TIP','iShares TIPS Bond','Fixed Income','Inflation','NYSE Arca',108,0.07,0.03],
  ['SHY','iShares 1-3 Yr Treasury','Fixed Income','Treasury','NASDAQ',82,0.02,0.025],
  ['BNDX','Vanguard Total Intl Bond','Fixed Income','International','NASDAQ',49,0.05,0.03],
  // Crypto
  ['BTC','Bitcoin','Crypto','Crypto','Crypto',64000,0.65,0.30],
  ['ETH','Ethereum','Crypto','Crypto','Crypto',3400,0.75,0.25],
  ['SOL','Solana','Crypto','Crypto','Crypto',150,0.95,0.35],
  ['ADA','Cardano','Crypto','Crypto','Crypto',0.45,0.95,0.10],
  ['DOGE','Dogecoin','Crypto','Crypto','Crypto',0.15,1.10,0.05],
  ['AVAX','Avalanche','Crypto','Crypto','Crypto',35,0.95,0.20],
  // Cash
  ['CASH','US Dollar Cash','Cash','Cash','—',1.0,0.0,0.01],
  ['VMFXX','Vanguard Money Market','Cash','Cash','—',1.0,0.001,0.045],
];

// ---------- generate price paths (end exactly at base_price) ----------
// Deterministic upward trend (start below, end at base_price) + mean-reverting
// AR(1) noise. Endpoint pinned by construction, so the aggregate firm AUM trends
// up-and-to-the-right with realistic wiggles. returns { symbol -> Float64Array }
const paths = {};
const NP = NDAYS;
for (const s of SEC) {
  const [sym, , cls, , , price, vol, drift] = s;
  const arr = new Float64Array(NP);
  if (cls === 'Cash') { arr.fill(1.0); paths[sym] = arr; continue; }
  // Deterministic upward trend + mean-reverting AR(1) noise.
  const logG0 = -drift * (NP / 252);
  const rho = 0.94;
  const statStd = Math.max(0.02, vol * 0.28);
  const sigStep = statStd * Math.sqrt(1 - rho * rho);
  const e = new Float64Array(NP);
  for (let i = 1; i < NP; i++) e[i] = rho * e[i - 1] + sigStep * randn();
  const eN = e[NP - 1];
  for (let i = 0; i < NP; i++) {
    const trend = Math.exp(logG0 * (1 - i / (NP - 1)));
    arr[i] = price * trend * Math.exp(e[i] - eN);
  }
  paths[sym] = arr;
}
const priceOn = (sym, dayIdx) => paths[sym][dayIdx];
const curPrice = (sym) => paths[sym][NDAYS - 1];

// ---------- advisors ----------
const TEAMS = ['Private Wealth','Family Office','Retirement Solutions','Wealth Advisory','Institutional'];
const REGIONS = ['Northeast','West','Midwest','Southeast','Southwest'];
const FIRST = ['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Daniel','Nancy','Matthew','Lisa','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Emily','Andrew','Donna','Joshua','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa','Edward','Deborah','Ronald','Stephanie','Timothy','Rebecca','Jason','Laura','Priya','Wei','Chen','Mohammed','Sofia','Diego','Aisha','Yuki','Raj','Ananya'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Patel','Kim','Chen','Singh','Khan','Wang','Cohen','Murphy','Bailey','Reed'];
const NADV = 30;
const advisors = [];
for (let i = 1; i <= NADV; i++) {
  advisors.push([i, `${pick(FIRST)} ${pick(LAST)}`, pick(TEAMS), pick(REGIONS),
    fmtDate(new Date(END.getTime() - ri(400, 5000) * DAY))]);
}

// ---------- clients ----------
const SEGMENTS = [['Mass Affluent', 60], ['HNW', 32], ['UHNW', 8]];
const RISK = [['Conservative', 30], ['Moderate', 45], ['Aggressive', 25]];
const NCLIENTS = 1000;
const clients = [];
for (let i = 1; i <= NCLIENTS; i++) {
  // advisors hold uneven books — bias toward lower-id advisors slightly
  const advisor_id = ri(1, NADV);
  const last = pick(LAST);
  const first = pick(FIRST);
  const segment = weighted(SEGMENTS);
  const risk = weighted(RISK);
  const join = new Date(END.getTime() - ri(60, 2200) * DAY);
  clients.push({
    client_id: i, advisor_id,
    household: `${last} ${pick(['Family','Household','Trust','Family Office','Investments'])}`,
    name: `${first} ${last}`,
    email: `${first}.${last}${i}@example.com`.toLowerCase(),
    segment, risk_profile: risk, join_date: join,
  });
}

// ---------- accounts ----------
const ACCT_TYPES = [['Taxable', 40], ['IRA', 20], ['Roth IRA', 15], ['401k', 15], ['Trust', 10]];
// target total household investable wealth by segment (USD), lognormal-ish
function segmentWealth(seg) {
  if (seg === 'UHNW') return rf(12e6, 120e6);
  if (seg === 'HNW') return rf(1.2e6, 12e6);
  return rf(150e3, 1.2e6);
}
const accounts = [];
let acctId = 1;
for (const c of clients) {
  const nAcct = c.segment === 'UHNW' ? ri(2, 4) : c.segment === 'HNW' ? ri(1, 3) : ri(1, 2);
  const wealth = segmentWealth(c.segment);
  // split wealth across accounts
  const splits = Array.from({ length: nAcct }, () => rf(0.5, 1));
  const splitSum = splits.reduce((a, b) => a + b, 0);
  for (let k = 0; k < nAcct; k++) {
    const targetVal = (wealth * splits[k]) / splitSum;
    const opened = new Date(c.join_date.getTime() + ri(0, 200) * DAY);
    accounts.push({
      account_id: acctId++, client_id: c.client_id, account_type: weighted(ACCT_TYPES),
      opened_date: opened, cash_balance: Math.round(targetVal * rf(0.005, 0.04) * 100) / 100,
      _targetVal: targetVal, _risk: c.risk_profile, _seg: c.segment,
    });
  }
}

// ---------- positions sized to target value + allocation model ----------
const byClass = { Equity: [], ETF: [], 'Fixed Income': [], Crypto: [], Cash: [] };
for (const s of SEC) byClass[s[2]].push(s[0]);

const ALLOC = {
  Conservative: { 'Fixed Income': 0.50, Equity: 0.18, ETF: 0.22, Cash: 0.08, Crypto: 0.02 },
  Moderate:     { Equity: 0.35, ETF: 0.30, 'Fixed Income': 0.25, Cash: 0.05, Crypto: 0.05 },
  Aggressive:   { Equity: 0.45, ETF: 0.28, 'Fixed Income': 0.10, Crypto: 0.14, Cash: 0.03 },
};
function holdingsCount(seg) {
  if (seg === 'UHNW') return ri(16, 30);
  if (seg === 'HNW') return ri(10, 20);
  return ri(6, 12);
}
function sampleN(arr, n) {
  const a = [...arr]; const out = [];
  n = Math.min(n, a.length);
  for (let i = 0; i < n; i++) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]);
  return out;
}

const positions = []; // {account_id, symbol, quantity, avg_cost, opened_date}
for (const a of accounts) {
  const alloc = ALLOC[a._risk];
  const nHold = holdingsCount(a._seg);
  // distribute holding slots across classes by allocation weight
  const classSlots = {};
  let assigned = 0;
  for (const cls of Object.keys(alloc)) {
    const slots = Math.max(cls === 'Cash' ? 1 : 0, Math.round(nHold * alloc[cls]));
    classSlots[cls] = slots; assigned += slots;
  }
  for (const cls of Object.keys(classSlots)) {
    const slots = classSlots[cls];
    if (slots <= 0) continue;
    const syms = sampleN(byClass[cls], slots);
    if (!syms.length) continue;
    const classValue = a._targetVal * alloc[cls];
    // split class value across chosen syms
    const w = syms.map(() => rf(0.6, 1));
    const wsum = w.reduce((x, y) => x + y, 0);
    syms.forEach((sym, idx) => {
      const dollars = (classValue * w[idx]) / wsum;
      const cp = curPrice(sym);
      let qty = dollars / cp;
      qty = cls === 'Crypto' || cp > 1000 ? Math.round(qty * 1e6) / 1e6 : Math.round(qty);
      if (qty <= 0) qty = cls === 'Crypto' ? Math.round((dollars / cp) * 1e6) / 1e6 : 1;
      const costFactor = cls === 'Cash' ? 1 : clamp(0.85 + 0.22 * randn(), 0.45, 1.35);
      const avg_cost = Math.round(cp * costFactor * 1e4) / 1e4;
      const opened = new Date(a.opened_date.getTime() + ri(0, 400) * DAY);
      positions.push({ account_id: a.account_id, symbol: sym, quantity: qty, avg_cost, opened_date: opened > END ? END : opened });
    });
  }
}

// ---------- weekly NAV history from positions x price paths ----------
const posByAcct = new Map();
for (const p of positions) {
  if (!posByAcct.has(p.account_id)) posByAcct.set(p.account_id, []);
  posByAcct.get(p.account_id).push(p);
}
const cashByAcct = new Map(accounts.map((a) => [a.account_id, Number(a.cash_balance)]));
const weeklyIdx = [];
for (let i = 0; i < NDAYS; i += 5) weeklyIdx.push(i);
if (weeklyIdx[weeklyIdx.length - 1] !== NDAYS - 1) weeklyIdx.push(NDAYS - 1);

const navRows = [];
for (const a of accounts) {
  const ps = posByAcct.get(a.account_id) || [];
  const cash = cashByAcct.get(a.account_id) || 0;
  for (const di of weeklyIdx) {
    let mv = 0;
    for (const p of ps) mv += Number(p.quantity) * priceOn(p.symbol, di);
    mv = Math.round(mv * 100) / 100;
    const c = Math.round(cash * 100) / 100;
    navRows.push([a.account_id, fmtDate(tradingDays[di]), mv, c, Math.round((mv + c) * 100) / 100]);
  }
}

// ---------- transactions (~2yr) ----------
const txns = [];
let txnId = 1;
const dtAt = (dayIdx, h = 10) => {
  const d = new Date(tradingDays[dayIdx].getTime() + (h * 3600 + ri(0, 3500)) * 1000);
  return d;
};
function findDayIdx(date) { // nearest trading-day index for a JS date
  const t = date.getTime();
  if (t <= tradingDays[0].getTime()) return 0;
  if (t >= tradingDays[NDAYS - 1].getTime()) return NDAYS - 1;
  return Math.max(0, Math.min(NDAYS - 1, Math.round((t - tradingDays[0].getTime()) / DAY * (NDAYS / (tradingDays[NDAYS - 1].getTime() - tradingDays[0].getTime()) * DAY))));
}
for (const a of accounts) {
  const ps = posByAcct.get(a.account_id) || [];
  // opening BUY for each position
  for (const p of ps) {
    const di = findDayIdx(p.opened_date);
    if (p.symbol === 'CASH') continue;
    txns.push([txnId++, a.account_id, p.symbol, 'BUY', p.quantity, p.avg_cost,
      -Math.round(Number(p.quantity) * Number(p.avg_cost) * 100) / 100, fmtDT(dtAt(di, 10))]);
  }
  // initial deposit
  txns.push([txnId++, a.account_id, 'CASH', 'DEPOSIT', 0, 0,
    Math.round(a._targetVal * rf(0.8, 1.1) * 100) / 100, fmtDT(dtAt(findDayIdx(a.opened_date), 9))]);
  // dividends on a few equity/ETF holdings (recent year)
  const divHolds = ps.filter((p) => ['Equity', 'ETF'].includes(SEC.find((s) => s[0] === p.symbol)?.[2])).slice(0, ri(2, 6));
  for (const p of divHolds) {
    const nDiv = ri(2, 4);
    for (let q = 0; q < nDiv; q++) {
      const di = NDAYS - 1 - q * ri(55, 70);
      if (di < 0) break;
      const amt = Math.round(Number(p.quantity) * priceOn(p.symbol, di) * rf(0.003, 0.012) * 100) / 100;
      txns.push([txnId++, a.account_id, p.symbol, 'DIVIDEND', 0, 0, amt, fmtDT(dtAt(di, 11))]);
    }
  }
  // a few rebalance trades
  const nTrade = ri(2, 7);
  for (let q = 0; q < nTrade; q++) {
    if (!ps.length) break;
    const p = pick(ps);
    if (p.symbol === 'CASH') continue;
    const di = ri(20, NDAYS - 1);
    const side = rnd() < 0.55 ? 'BUY' : 'SELL';
    const qty = Math.max(1, Math.round(Number(p.quantity) * rf(0.05, 0.3) * (p.symbol.length <= 4 && Number(p.quantity) < 5 ? 100 : 1)) / (p.symbol.length <= 4 && Number(p.quantity) < 5 ? 100 : 1));
    const px = Math.round(priceOn(p.symbol, di) * 1e4) / 1e4;
    const amt = (side === 'BUY' ? -1 : 1) * Math.round(qty * px * 100) / 100;
    txns.push([txnId++, a.account_id, p.symbol, side, qty, px, amt, fmtDT(dtAt(di, ri(10, 15)))]);
  }
  // quarterly advisory fees (last ~6 quarters)
  for (let q = 1; q <= 6; q++) {
    const di = NDAYS - 1 - q * 63;
    if (di < 0) break;
    const fee = -Math.round(a._targetVal * (0.01 / 4) * rf(0.9, 1.1) * 100) / 100;
    txns.push([txnId++, a.account_id, 'CASH', 'FEE', 0, 0, fee, fmtDT(dtAt(di, 16))]);
  }
  // occasional withdrawal
  if (rnd() < 0.35) {
    const di = ri(NDAYS - 200, NDAYS - 1);
    txns.push([txnId++, a.account_id, 'CASH', 'WITHDRAWAL', 0, 0,
      -Math.round(a._targetVal * rf(0.01, 0.06) * 100) / 100, fmtDT(dtAt(di, 13))]);
  }
}

// ---------- historical daily price_ticks (for charts) + latest_price seed ----------
const tickRows = [];
const latestRows = [];
for (const s of SEC) {
  const sym = s[0];
  for (let i = 1; i < NDAYS; i++) {
    const price = Math.round(paths[sym][i] * 1e4) / 1e4;
    const prev = Math.round(paths[sym][i - 1] * 1e4) / 1e4;
    const chg = prev ? Math.round((price - prev) / prev * 1e6) / 1e4 : 0;
    const vol = ri(2e5, 8e7);
    tickRows.push([sym, fmtDT(new Date(tradingDays[i].getTime() + 16 * 3600 * 1000)), price, prev, chg, vol]);
  }
  const last = Math.round(paths[sym][NDAYS - 1] * 1e4) / 1e4;
  const prev = Math.round(paths[sym][NDAYS - 2] * 1e4) / 1e4;
  const chg = prev ? Math.round((last - prev) / prev * 1e6) / 1e4 : 0;
  latestRows.push([sym, fmtDT(new Date(tradingDays[NDAYS - 1].getTime() + 16 * 3600 * 1000)), last, prev, chg]);
}

// ---------- insert everything ----------
console.log(`Generated: ${SEC.length} securities, ${advisors.length} advisors, ${clients.length} clients, ${accounts.length} accounts, ${positions.length} positions, ${navRows.length} nav rows, ${txns.length} txns, ${tickRows.length} ticks`);

// securities columns: symbol,name,asset_class,sector,exchange,currency,base_price,annual_drift,annual_vol
const securitiesInsert = SEC.map((s) => [s[0], s[1], s[2], s[3], s[4], 'USD', curPriceRound(s[0]), s[7], s[6]]);
function curPriceRound(sym){ return Math.round(curPrice(sym)*1e4)/1e4; }

console.log('Clearing existing data...');
for (const t of ['securities','advisors','clients','accounts','positions','daily_nav','transactions','price_ticks','latest_price']) {
  await pool.query(`TRUNCATE TABLE \`${t}\``);
}

console.log('Inserting...');
await bulkInsert('securities', ['symbol','name','asset_class','sector','exchange','currency','base_price','annual_drift','annual_vol'], securitiesInsert);
await bulkInsert('advisors', ['advisor_id','name','team','region','hire_date'], advisors);
await bulkInsert('clients', ['client_id','advisor_id','household','name','email','segment','risk_profile','join_date'],
  clients.map((c) => [c.client_id, c.advisor_id, c.household, c.name, c.email, c.segment, c.risk_profile, fmtDate(c.join_date)]));
await bulkInsert('accounts', ['account_id','client_id','account_type','opened_date','cash_balance'],
  accounts.map((a) => [a.account_id, a.client_id, a.account_type, fmtDate(a.opened_date), a.cash_balance]));
await bulkInsert('positions', ['account_id','symbol','quantity','avg_cost','opened_date'],
  positions.map((p) => [p.account_id, p.symbol, p.quantity, p.avg_cost, fmtDate(p.opened_date)]));
await bulkInsert('daily_nav', ['account_id','as_of_date','market_value','cash','total_value'], navRows);
await bulkInsert('transactions', ['txn_id','account_id','symbol','txn_type','quantity','price','amount','txn_ts'], txns);
await bulkInsert('price_ticks', ['symbol','ts','price','prev_close','day_change_pct','volume'], tickRows);
await bulkInsert('latest_price', ['symbol','ts','price','prev_close','day_change_pct'], latestRows);

console.log('Done.');
await pool.end();
