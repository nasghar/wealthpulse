import { q } from './db';

// ---------------- Executive overview ----------------
export async function getFirmKpis() {
  const [row] = await q<{
    aum: number; prev_aum: number; positions: number;
  }>(`
    SELECT SUM(p.quantity * lp.price) AS aum,
           SUM(p.quantity * lp.prev_close) AS prev_aum,
           COUNT(*) AS positions
    FROM positions p JOIN latest_price lp ON p.symbol = lp.symbol
  `);
  const [counts] = await q<{ clients: number; accounts: number; advisors: number }>(`
    SELECT (SELECT COUNT(*) FROM clients) AS clients,
           (SELECT COUNT(*) FROM accounts) AS accounts,
           (SELECT COUNT(*) FROM advisors) AS advisors
  `);
  const [flows] = await q<{ net_flows: number }>(`
    SELECT COALESCE(SUM(amount),0) AS net_flows FROM transactions
    WHERE txn_type IN ('DEPOSIT','WITHDRAWAL')
      AND txn_ts >= DATE_SUB((SELECT MAX(txn_ts) FROM transactions), INTERVAL 90 DAY)
  `);
  const dayPnl = row.aum - row.prev_aum;
  return {
    aum: row.aum,
    dayPnl,
    dayPnlPct: (dayPnl / row.prev_aum) * 100,
    positions: row.positions,
    clients: counts.clients,
    accounts: counts.accounts,
    advisors: counts.advisors,
    netFlows: flows.net_flows,
    avgAccount: row.aum / counts.accounts,
  };
}

// Just the live number, for the top-bar pulse (cheap).
export async function getPulse() {
  const [row] = await q<{ aum: number; prev_aum: number }>(`
    SELECT SUM(p.quantity * lp.price) AS aum,
           SUM(p.quantity * lp.prev_close) AS prev_aum
    FROM positions p JOIN latest_price lp ON p.symbol = lp.symbol
  `);
  return { aum: row.aum, dayPnl: row.aum - row.prev_aum, dayPnlPct: ((row.aum - row.prev_aum) / row.prev_aum) * 100 };
}

export async function getAumTrend() {
  return q<{ d: string; v: number }>(`
    SELECT as_of_date AS d, ROUND(SUM(total_value),0) AS v
    FROM daily_nav GROUP BY as_of_date ORDER BY as_of_date
  `);
}

export async function getAllocation() {
  return q<{ asset_class: string; value: number }>(`
    SELECT s.asset_class, SUM(p.quantity * lp.price) AS value
    FROM positions p
    JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN securities s ON p.symbol = s.symbol
    GROUP BY s.asset_class ORDER BY value DESC
  `);
}

export async function getSegmentBreakdown() {
  return q<{ segment: string; value: number; clients: number }>(`
    SELECT c.segment,
           SUM(p.quantity * lp.price) AS value,
           COUNT(DISTINCT c.client_id) AS clients
    FROM positions p
    JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN accounts a ON p.account_id = a.account_id
    JOIN clients c ON a.client_id = c.client_id
    GROUP BY c.segment
  `);
}

export async function getMovers(dir: 'gainers' | 'losers', limit = 6) {
  return q<{ symbol: string; name: string; asset_class: string; price: number; day_change_pct: number }>(`
    SELECT lp.symbol, s.name, s.asset_class, lp.price, lp.day_change_pct
    FROM latest_price lp JOIN securities s ON lp.symbol = s.symbol
    WHERE s.asset_class <> 'Cash'
    ORDER BY lp.day_change_pct ${dir === 'gainers' ? 'DESC' : 'ASC'}
    LIMIT ${limit}
  `);
}

// ---------------- Market monitor ----------------
export async function getIndices() {
  return q<{ symbol: string; name: string; price: number; prev_close: number; day_change_pct: number }>(`
    SELECT lp.symbol, s.name, lp.price, lp.prev_close, lp.day_change_pct
    FROM latest_price lp JOIN securities s ON lp.symbol = s.symbol
    WHERE lp.symbol IN ('SPY','QQQ','DIA','IWM','BTC','GLD')
    ORDER BY FIELD(lp.symbol,'SPY','QQQ','DIA','IWM','GLD','BTC')
  `);
}

export async function getAllQuotes() {
  return q<{
    symbol: string; name: string; asset_class: string; sector: string;
    price: number; prev_close: number; day_change_pct: number;
  }>(`
    SELECT lp.symbol, s.name, s.asset_class, s.sector, lp.price, lp.prev_close, lp.day_change_pct
    FROM latest_price lp JOIN securities s ON lp.symbol = s.symbol
    WHERE s.asset_class <> 'Cash'
    ORDER BY s.asset_class, lp.symbol
  `);
}

// Value-weighted sector heat (size = firm exposure, color = today's move).
export async function getSectorHeat() {
  return q<{ sector: string; asset_class: string; exposure: number; chg: number; n: number }>(`
    SELECT s.sector, MIN(s.asset_class) AS asset_class,
           SUM(p.quantity * lp.price) AS exposure,
           SUM(p.quantity * lp.price * lp.day_change_pct) / NULLIF(SUM(p.quantity * lp.price),0) AS chg,
           COUNT(DISTINCT s.symbol) AS n
    FROM positions p
    JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN securities s ON p.symbol = s.symbol
    WHERE s.asset_class <> 'Cash'
    GROUP BY s.sector
    ORDER BY exposure DESC
  `);
}

// Intraday path for a symbol (today's simulated ticks; falls back to recent).
export async function getIntraday(symbol: string) {
  return q<{ ts: string; price: number }>(
    `SELECT ts, price FROM price_ticks
     WHERE symbol = ? AND ts >= DATE_SUB((SELECT MAX(ts) FROM price_ticks WHERE symbol = ?), INTERVAL 1 DAY)
     ORDER BY ts`,
    [symbol, symbol]
  );
}

// ---------------- Advisor book ----------------
export async function getAdvisorBook() {
  return q<{
    advisor_id: number; name: string; team: string; region: string;
    clients: number; aum: number; day_pnl: number;
  }>(`
    SELECT adv.advisor_id, adv.name, adv.team, adv.region,
           COUNT(DISTINCT c.client_id) AS clients,
           SUM(p.quantity * lp.price) AS aum,
           SUM(p.quantity * (lp.price - lp.prev_close)) AS day_pnl
    FROM advisors adv
    JOIN clients c ON c.advisor_id = adv.advisor_id
    JOIN accounts a ON a.client_id = c.client_id
    JOIN positions p ON p.account_id = a.account_id
    JOIN latest_price lp ON p.symbol = lp.symbol
    GROUP BY adv.advisor_id, adv.name, adv.team, adv.region
    ORDER BY aum DESC
  `);
}

// ---------------- Clients ----------------
export async function getClientList() {
  return q<{
    client_id: number; name: string; household: string; segment: string;
    risk_profile: string; advisor: string; accounts: number; aum: number; day_pnl: number;
  }>(`
    SELECT c.client_id, c.name, c.household, c.segment, c.risk_profile,
           adv.name AS advisor,
           COUNT(DISTINCT a.account_id) AS accounts,
           SUM(p.quantity * lp.price) AS aum,
           SUM(p.quantity * (lp.price - lp.prev_close)) AS day_pnl
    FROM clients c
    JOIN advisors adv ON adv.advisor_id = c.advisor_id
    JOIN accounts a ON a.client_id = c.client_id
    JOIN positions p ON p.account_id = a.account_id
    JOIN latest_price lp ON p.symbol = lp.symbol
    GROUP BY c.client_id, c.name, c.household, c.segment, c.risk_profile, adv.name
    ORDER BY aum DESC
  `);
}

export async function getClientDetail(clientId: number) {
  const [client] = await q<{
    client_id: number; name: string; household: string; segment: string;
    risk_profile: string; email: string; join_date: string; advisor: string; team: string;
  }>(
    `SELECT c.client_id, c.name, c.household, c.segment, c.risk_profile, c.email, c.join_date,
            adv.name AS advisor, adv.team
     FROM clients c JOIN advisors adv ON adv.advisor_id = c.advisor_id
     WHERE c.client_id = ?`,
    [clientId]
  );
  if (!client) return null;

  const accounts = await q<{
    account_id: number; account_type: string; cash_balance: number; value: number; day_pnl: number;
  }>(
    `SELECT a.account_id, a.account_type, a.cash_balance,
            SUM(p.quantity * lp.price) AS value,
            SUM(p.quantity * (lp.price - lp.prev_close)) AS day_pnl
     FROM accounts a
     JOIN positions p ON p.account_id = a.account_id
     JOIN latest_price lp ON p.symbol = lp.symbol
     WHERE a.client_id = ?
     GROUP BY a.account_id, a.account_type, a.cash_balance`,
    [clientId]
  );

  const holdings = await q<{
    symbol: string; name: string; asset_class: string; sector: string;
    quantity: number; avg_cost: number; price: number; day_change_pct: number;
    market_value: number; unrealized: number;
  }>(
    `SELECT p.symbol, s.name, s.asset_class, s.sector,
            SUM(p.quantity) AS quantity,
            SUM(p.quantity * p.avg_cost)/SUM(p.quantity) AS avg_cost,
            lp.price, lp.day_change_pct,
            SUM(p.quantity) * lp.price AS market_value,
            SUM(p.quantity) * lp.price - SUM(p.quantity * p.avg_cost) AS unrealized
     FROM positions p
     JOIN accounts a ON p.account_id = a.account_id
     JOIN latest_price lp ON p.symbol = lp.symbol
     JOIN securities s ON p.symbol = s.symbol
     WHERE a.client_id = ?
     GROUP BY p.symbol, s.name, s.asset_class, s.sector, lp.price, lp.day_change_pct
     ORDER BY market_value DESC`,
    [clientId]
  );

  const allocation = await q<{ asset_class: string; value: number }>(
    `SELECT s.asset_class, SUM(p.quantity * lp.price) AS value
     FROM positions p
     JOIN accounts a ON p.account_id = a.account_id
     JOIN latest_price lp ON p.symbol = lp.symbol
     JOIN securities s ON p.symbol = s.symbol
     WHERE a.client_id = ?
     GROUP BY s.asset_class ORDER BY value DESC`,
    [clientId]
  );

  const perf = await q<{ d: string; v: number }>(
    `SELECT dn.as_of_date AS d, ROUND(SUM(dn.total_value),0) AS v
     FROM daily_nav dn JOIN accounts a ON dn.account_id = a.account_id
     WHERE a.client_id = ?
     GROUP BY dn.as_of_date ORDER BY dn.as_of_date`,
    [clientId]
  );

  const txns = await q<{
    symbol: string; txn_type: string; quantity: number; price: number; amount: number; txn_ts: string;
  }>(
    `SELECT t.symbol, t.txn_type, t.quantity, t.price, t.amount, t.txn_ts
     FROM transactions t JOIN accounts a ON t.account_id = a.account_id
     WHERE a.client_id = ?
     ORDER BY t.txn_ts DESC LIMIT 20`,
    [clientId]
  );

  return { client, accounts, holdings, allocation, perf, txns };
}

// ---------------- Risk & rebalance ----------------
export async function getRiskOverview() {
  // top concentrations firm-wide
  const concentrations = await q<{ symbol: string; name: string; asset_class: string; value: number; pct: number }>(`
    SELECT p.symbol, s.name, s.asset_class,
           SUM(p.quantity * lp.price) AS value,
           100 * SUM(p.quantity * lp.price) / SUM(SUM(p.quantity * lp.price)) OVER () AS pct
    FROM positions p
    JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN securities s ON p.symbol = s.symbol
    GROUP BY p.symbol, s.name, s.asset_class
    ORDER BY value DESC LIMIT 12
  `);
  // value-weighted annualized volatility as a portfolio risk proxy
  const [vol] = await q<{ port_vol: number; hhi: number }>(`
    WITH cls AS (
      SELECT s.symbol, s.annual_vol, SUM(p.quantity * lp.price) AS v
      FROM positions p JOIN latest_price lp ON p.symbol = lp.symbol
      JOIN securities s ON p.symbol = s.symbol
      GROUP BY s.symbol, s.annual_vol
    )
    SELECT SUM(annual_vol * v)/SUM(v) AS port_vol,
           SUM(v*v)/POW(SUM(v),2) AS hhi
    FROM cls
  `);
  // allocation vs a moderate model target for drift
  const alloc = await q<{ asset_class: string; value: number }>(`
    SELECT s.asset_class, SUM(p.quantity * lp.price) AS value
    FROM positions p JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN securities s ON p.symbol = s.symbol GROUP BY s.asset_class
  `);
  // risk-profile distribution of clients by AUM
  const byRisk = await q<{ risk_profile: string; value: number; clients: number }>(`
    SELECT c.risk_profile, SUM(p.quantity * lp.price) AS value, COUNT(DISTINCT c.client_id) AS clients
    FROM positions p
    JOIN latest_price lp ON p.symbol = lp.symbol
    JOIN accounts a ON p.account_id = a.account_id
    JOIN clients c ON a.client_id = c.client_id
    GROUP BY c.risk_profile
  `);
  return { concentrations, portVol: vol.port_vol, hhi: vol.hhi, alloc, byRisk };
}

// ---------------- Blotter ----------------
export async function getBlotter(limit = 60, type?: string) {
  const where = type && type !== 'ALL' ? `WHERE t.txn_type = ${JSON.stringify(type)}` : '';
  const rows = await q<{
    txn_id: number; symbol: string; txn_type: string; quantity: number; price: number;
    amount: number; txn_ts: string; client: string; account_type: string;
  }>(`
    SELECT t.txn_id, t.symbol, t.txn_type, t.quantity, t.price, t.amount, t.txn_ts,
           c.name AS client, a.account_type
    FROM transactions t
    JOIN accounts a ON t.account_id = a.account_id
    JOIN clients c ON a.client_id = c.client_id
    ${where}
    ORDER BY t.txn_ts DESC LIMIT ${Number(limit)}
  `);
  const [stats] = await q<{ trades_today: number; buy_vol: number; sell_vol: number }>(`
    SELECT
      SUM(CASE WHEN t.txn_ts >= DATE_SUB(m.mx, INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS trades_today,
      SUM(CASE WHEN t.txn_type='BUY' THEN -t.amount ELSE 0 END) AS buy_vol,
      SUM(CASE WHEN t.txn_type='SELL' THEN t.amount ELSE 0 END) AS sell_vol
    FROM transactions t
    CROSS JOIN (SELECT MAX(txn_ts) AS mx FROM transactions) m
    WHERE t.txn_ts >= DATE_SUB(m.mx, INTERVAL 7 DAY)
  `);
  return { rows, stats };
}
