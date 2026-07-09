# WealthAdvisor — Business Context & Ontology

> Reference knowledge for the Analyst (text-to-SQL) co-pilot. This layer encodes
> what the **business** means on top of the raw schema: the firm's vocabulary,
> KPI definitions with exact formulas, the account hierarchy, and the non-obvious
> rules an analyst must apply to answer correctly.

---

## 1. Domain overview

WealthAdvisor is the data platform for a **wealth management firm**. Financial
**advisors** manage money on behalf of **client households**. Each household holds
one or more **accounts** (Taxable, IRA, etc.); each account holds **positions** in
**securities** (stocks, ETFs, bonds, crypto, cash). The market moves continuously,
so portfolios are **revalued in real time** against live prices.

The business runs on a few core ideas:
- **AUM (Assets Under Management)** — the total market value the firm manages. The
  firm's scale, and the basis for revenue.
- **Net New Assets (organic flows)** — money clients add or withdraw, *excluding*
  market movement. The truest measure of growth.
- **Advisory fee revenue** — what the firm earns (a % of AUM, billed periodically).
- **Performance & risk** — returns, P&L, concentration, and suitability vs. the
  client's risk profile.

---

## 2. Entity ontology (business meaning + grain)

| Table | Business concept | Grain (one row =) | Key links |
|---|---|---|---|
| `advisors` | Financial advisor / relationship manager | one advisor | — |
| `clients` | Client **household** (the investor relationship) | one household | `advisor_id` → advisors |
| `accounts` | An account a household holds | one account | `client_id` → clients |
| `securities` | A tradable instrument (the security master) | one symbol | — |
| `positions` | A current holding (what an account owns now) | account × symbol | `account_id` → accounts, `symbol` → securities |
| `transactions` | A trade or cash event (the activity ledger) | one transaction | `account_id` → accounts, `symbol` → securities |
| `latest_price` | The **live mark** — current price per symbol | one symbol | `symbol` → securities |
| `price_ticks` | Price **time series** (intraday + daily history) | symbol × timestamp | `symbol` → securities |
| `daily_nav` | Portfolio **value snapshots** over time | account × date | `account_id` → accounts |

**The roll-up hierarchy (memorize this):**

```
Firm  ─┬─ Advisor (book of business)
        └─ Client / Household
             └─ Account (Taxable / IRA / Roth IRA / 401k / Trust)
                  └─ Position (quantity of a Security)
                       └─ valued at Security's latest_price
```

**Canonical join path** from a holding up to the advisor:
`positions → accounts (account_id) → clients (client_id) → advisors (advisor_id)`,
and `positions.symbol → latest_price.symbol` to value it.

---

## 3. Core metrics & canonical formulas

> Use these formulas verbatim. They resolve the ambiguity in everyday questions.

**AUM / Portfolio Market Value (live)** — value of holdings at the current price.
A position row has **no price column** — you must join `latest_price`.
```sql
SELECT SUM(p.quantity * lp.price) AS aum
FROM positions p
JOIN latest_price lp ON p.symbol = lp.symbol;
```
Scope it by joining up the hierarchy (per advisor, client, account, segment, etc.).

**Cost Basis** — what was paid for the current holdings.
```sql
SUM(p.quantity * p.avg_cost)
```

**Unrealized Gain/Loss** — paper profit on current holdings.
```sql
SUM(p.quantity * lp.price) - SUM(p.quantity * p.avg_cost)
```

**Intraday / Day P&L ($)** — today's dollar move. Measured vs. previous close.
```sql
SUM(p.quantity * (lp.price - lp.prev_close))
```

**Day P&L (%)**
```sql
100 * SUM(p.quantity * (lp.price - lp.prev_close)) / SUM(p.quantity * lp.prev_close)
```

**Net New Assets / Net Flows (organic growth)** — deposits minus withdrawals over a
period. Excludes market movement and fees. This is *the* growth KPI.
```sql
SUM(amount) FROM transactions
WHERE txn_type IN ('DEPOSIT','WITHDRAWAL')
  AND txn_ts >= <period start>
```

**Advisory Fee Revenue** — the firm's revenue. Fees are stored as negative cash
impacts, so revenue is their magnitude.
```sql
-SUM(amount) FROM transactions WHERE txn_type = 'FEE' AND txn_ts >= <period>
```

**Dividend Income**
```sql
SUM(amount) FROM transactions WHERE txn_type = 'DIVIDEND' AND txn_ts >= <period>
```

**Asset Allocation (% of portfolio by asset class)**
```sql
SELECT s.asset_class, SUM(p.quantity * lp.price) AS value
FROM positions p
JOIN latest_price lp ON p.symbol = lp.symbol
JOIN securities  s  ON p.symbol = s.symbol
GROUP BY s.asset_class;   -- divide each by the total for %
```

**Concentration (Herfindahl–Hirschman Index, HHI)** — single-name risk. With `v` =
each symbol's market value. (SingleStore: no subselect inside an aggregate — use
`SUM(v*v)/POW(SUM(v),2)`.) **Effective # of holdings = 1 / HHI.**
```sql
WITH h AS (
  SELECT p.symbol, SUM(p.quantity * lp.price) AS v
  FROM positions p JOIN latest_price lp ON p.symbol = lp.symbol
  GROUP BY p.symbol
)
SELECT SUM(v*v)/POW(SUM(v),2) AS hhi FROM h;
```

**Portfolio Volatility (risk proxy)** — value-weighted annualized vol.
```sql
SUM(s.annual_vol * v) / SUM(v)   -- v = per-symbol market value, joined to securities
```

**Historical AUM / performance trend** — use `daily_nav` (snapshots), **not** live
prices, for "over time" questions.
```sql
SELECT as_of_date, SUM(total_value) AS aum
FROM daily_nav GROUP BY as_of_date ORDER BY as_of_date;
```

**Top Movers** — biggest gainers/losers today.
```sql
SELECT symbol, day_change_pct FROM latest_price ORDER BY day_change_pct DESC;  -- gainers
```

---

## 4. Categorical value dictionary (enumerations)

- **`clients.segment`** — wealth tier by investable assets:
  - `Mass Affluent` (< $1M) · `HNW` (High-Net-Worth, $1M–$10M) · `UHNW` (Ultra-HNW, > $10M)
- **`clients.risk_profile`** — risk tolerance: `Conservative` · `Moderate` · `Aggressive`
- **`accounts.account_type`** — `Taxable` · `IRA` · `Roth IRA` · `401k` · `Trust`
  - IRA / Roth IRA / 401k are **tax-advantaged retirement** accounts.
- **`securities.asset_class`** — `Equity` · `ETF` · `Fixed Income` · `Crypto` · `Cash`
  - "Stocks" = Equity. "Funds" = ETF. "Bonds" = Fixed Income.
- **`transactions.txn_type`** — `BUY` · `SELL` · `DIVIDEND` · `DEPOSIT` · `WITHDRAWAL` · `FEE`
- **`advisors.team`** — `Private Wealth` · `Family Office` · `Retirement Solutions` · `Wealth Advisory` · `Institutional`
- **`advisors.region`** — `Northeast` · `West` · `Midwest` · `Southeast` · `Southwest`

---

## 5. Business rules & assumptions (the non-obvious logic)

* **Positions have no price.** To value *any* holding, join `latest_price` on
  `symbol` (live value) — or `price_ticks` for a historical date. Never read a
  price off `positions`.
* **`latest_price` is the live mark** — exactly one row per symbol, updated in real
  time. `prev_close` is the prior trading day's close; all "today's change" math is
  `price − prev_close`.
* **Live value vs. history.** For "right now / today / current" questions, compute
  from `positions × latest_price`. For "over time / trend / last N months / growth
  chart" questions, use `daily_nav` (these are **weekly snapshots** spanning ~2
  years). Do **not** treat the most recent `daily_nav` row as "today's" value.
* **Cash handling.** Cash is held two ways: as a holding (`securities.symbol` in
  `('CASH','VMFXX')`, `asset_class = 'Cash'`, price ≈ 1.0) and as uninvested sweep
  cash in `accounts.cash_balance`. AUM from positions already includes the Cash
  *holding*; add `accounts.cash_balance` only when asked for "total cash" or
  "total account value including cash."
* **`transactions.amount` is a signed cash impact:** positive = cash **in** to the
  account (`DEPOSIT`, `SELL`, `DIVIDEND`); negative = cash **out**
  (`BUY`, `WITHDRAWAL`, `FEE`). `quantity` and `price` are only meaningful for
  `BUY`/`SELL` (0 for cash flows, fees, and dividends).
* **Fee revenue** is the firm's income = the **magnitude** of `FEE` rows
  (`-SUM(amount)`). Advisory fees are billed quarterly as ~1% annual of AUM.
* **Net New Assets ≠ AUM change.** AUM moves from both markets *and* flows. When a
  client asks "did we grow?", organic growth = `DEPOSIT + WITHDRAWAL` flows, not the
  change in AUM (which is mostly market-driven).
* **Household ≈ client.** A `clients` row *is* the household relationship
  (`clients.household` is the family label, `clients.name` the primary contact).
  Treat one client = one household.
* **A client may hold multiple accounts.** Always aggregate account-level figures up
  to the client (and clients up to the advisor) for household/book totals.
* **Risk profile drives suitability.** Conservative → bond-heavy; Moderate →
  balanced; Aggressive → equity/crypto-heavy. Use it for "is this client's
  allocation appropriate / overweight / drifting" questions.
* **Realized vs. unrealized.** *Unrealized* P&L = gains on **current** holdings
  (`positions` vs. `avg_cost`). *Realized* P&L = gains booked on `SELL`
  transactions. Default "gains/P&L on holdings" to **unrealized**.

---

## 6. Vocabulary — how people ask vs. what they mean

| Business term (natural language) | Means in the data |
|---|---|
| "AUM", "assets", "book size", "money managed" | `SUM(positions.quantity × latest_price.price)` |
| "advisor", "RM", "relationship manager", "FA", "rep" | `advisors` |
| "book", "book of business", "their clients" | all positions under an advisor's clients' accounts |
| "client", "household", "investor", "family" | `clients` |
| "top / biggest / largest clients" | clients ranked by AUM (desc) |
| "rich / wealthy / high-end clients", "whales" | `segment IN ('HNW','UHNW')` (UHNW = richest) |
| "holdings", "positions", "what they own" | `positions` |
| "trades", "activity" | `transactions` (`BUY`/`SELL`) |
| "flows", "net new money", "did we grow" | net `DEPOSIT − WITHDRAWAL` |
| "revenue", "fees we earned" | `FEE` revenue (magnitude) |
| "performance today", "P&L", "up/down today" | day P&L (`price − prev_close`) |
| "movers", "winners/losers", "top performers" | securities by `day_change_pct` |
| "allocation", "asset mix", "exposure", "weightings" | value grouped by `asset_class` (or `sector`) |
| "gains", "in the money", "unrealized" | `market_value − cost_basis` on current holdings |
| "concentration", "single-stock risk", "too exposed" | HHI / largest position as % of portfolio |
| "stocks / funds / bonds / crypto / cash" | `asset_class` = Equity / ETF / Fixed Income / Crypto / Cash |
| "retirement accounts" | `account_type IN ('IRA','Roth IRA','401k')` |

---

## 7. Golden questions the co-pilot should nail

These exercise the rules above — good demo prompts:

1. **"What's our firm-wide AUM and how much has it moved today?"**
   → `SUM(qty×price)` and `SUM(qty×(price−prev_close))` over all positions.
2. **"Show my top 10 clients by assets under management."**
   → positions→accounts→clients, `SUM(qty×price)` per client, order desc, limit 10.
3. **"Which advisor has the largest book, and how many households do they serve?"**
   → roll up to advisor; AUM + `COUNT(DISTINCT client_id)`.
4. **"How much advisory fee revenue did we collect last quarter?"**
   → `-SUM(amount) WHERE txn_type='FEE'` in the period.
5. **"Net new assets by advisor this year."**
   → `SUM(amount) WHERE txn_type IN ('DEPOSIT','WITHDRAWAL')` grouped by advisor.
6. **"Which UHNW clients are overweight crypto relative to an aggressive model?"**
   → segment filter + allocation by `asset_class='Crypto'` vs. target.
7. **"Who are my most concentrated clients (single position > 20% of portfolio)?"**
   → per client, max position value / total value.
8. **"Top 5 movers across all client portfolios today."**
   → join positions to `latest_price`, weight `day_change_pct` by exposure, or list
   held securities by `day_change_pct`.
9. **"Total firm AUM trend over the last 12 months."**
   → `daily_nav`, `SUM(total_value)` by `as_of_date` (snapshots — not live prices).
10. **"Clients with the largest unrealized losses."**
    → per client, `SUM(qty×price) − SUM(qty×avg_cost)`, order asc.

---

## 8. Defaults & conventions

* **"Now / today / current"** → live valuation via `latest_price`.
* **"Over time / trend / history"** → `daily_nav` (weekly snapshots, ~2 yrs).
* **Currency** is USD throughout. Display large sums compactly ($B / $M / $K).
* **"Top / biggest"** without a metric → rank by **AUM**.
* **"Performance / P&L"** without a horizon → **today** (vs. prev close).
* **"Gains"** without qualifier → **unrealized** on current holdings.
* When a question spans the hierarchy (firm/advisor/client/account), aggregate at
  the requested level and join through the canonical path in §2.
