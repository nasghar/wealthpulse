# WealthAdvisor — Learned Context (validated facts to remember)

> Canonical, confirmed business facts the agent should treat as ground truth —
> the validated metric catalog and synonym map. (Seed for the "Learned Context" tab.)

## Confirmed metric definitions (treat as authoritative)
* **AUM** is always live: `SUM(positions.quantity * latest_price.price)`. Confirmed the firm reports AUM at the current market mark, not at cost and not from `daily_nav`.
* **"Today's change / intraday P&L"** is measured against `latest_price.prev_close`, never against `avg_cost`.
* **Fee revenue is positive** and equals `-SUM(transactions.amount)` filtered to `txn_type='FEE'`; the firm bills ~1% of AUM annually, in quarterly installments.
* **Growth ("did the book grow?")** means Net New Assets = `DEPOSIT + WITHDRAWAL` flows, confirmed distinct from AUM change (which blends flows + market return).
* **"Gains / in the money"** defaults to **unrealized** (current holdings vs. `avg_cost`) unless the user says "realized" or "sold".

## Confirmed entity facts
* One `clients` row = one household. `clients.household` is the family label; `clients.name` is the primary contact.
* `positions` never carries a price — valuation always joins `latest_price` (live) or `price_ticks` (historical date).
* `daily_nav` rows are **weekly** snapshots spanning ~24 months; they are the source for any "trend / over time / performance history" answer.
* `latest_price` holds exactly one current row per symbol and is updated continuously by the live market feed.

## Confirmed segment thresholds (investable assets)
* `Mass Affluent` < $1M · `HNW` $1M–$10M · `UHNW` > $10M. "Whales / top-tier / richest" → UHNW first, then HNW.

## Confirmed synonyms (resolve to these)
* assets / book size / money managed / AUM → `SUM(quantity × latest_price.price)`
* book / book of business → an advisor's clients' accounts' positions
* household / family / investor / client → `clients`
* RM / FA / rep / relationship manager / advisor → `advisors`
* flows / net new money / organic growth → `DEPOSIT − WITHDRAWAL`
* revenue / fees earned → `FEE` magnitude
* movers / winners / losers / top performers → `latest_price.day_change_pct`
* exposure / asset mix / weightings / allocation → grouped by `securities.asset_class`
* concentration / single-stock risk / over-exposed → HHI or largest position as % of portfolio
* stocks=Equity, funds=ETF, bonds=Fixed Income, retirement accounts=IRA/Roth IRA/401k

## Confirmed sign & cash conventions
* `transactions.amount` > 0 = cash into the account (`DEPOSIT`,`SELL`,`DIVIDEND`); < 0 = cash out (`BUY`,`WITHDRAWAL`,`FEE`).
* Cash holding = `symbol IN ('CASH','VMFXX')` (asset_class `Cash`, price ≈ 1.0); `accounts.cash_balance` is separate sweep cash.
