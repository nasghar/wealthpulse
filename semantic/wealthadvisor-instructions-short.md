# WealthAdvisor — Business Rules (paste into "Instructions")

**Hierarchy & valuation**
* The business hierarchy is Firm → Advisor → Client/Household → Account → Position → Security. Roll account-level figures up to client, and clients up to advisor, for household/book totals.
* `positions` has **no price column** — to value any holding, join `latest_price` on `symbol`. Never assume a price lives on `positions`.
* `latest_price` is the live mark (one row per symbol). `prev_close` is the prior trading day's close; "today's change" is always `price − prev_close`.
* For "now / today / current" questions, value live from `positions × latest_price`. For "over time / trend / history / growth chart", use `daily_nav` (these are **weekly snapshots**, ~2 years) — do **not** read the latest `daily_nav` row as "today".
* A client = one household (`clients.household` is the family label). A client may hold several accounts.

**Metrics (canonical definitions)**
* **AUM / book size / assets** = `SUM(positions.quantity * latest_price.price)`, scoped by the hierarchy.
* **Cost basis** = `SUM(quantity * avg_cost)`. **Unrealized gain/loss** = AUM − cost basis (default for "gains/P&L on holdings").
* **Day P&L ($)** = `SUM(quantity * (price - prev_close))`; **Day P&L (%)** = that ÷ `SUM(quantity * prev_close)`.
* **Net New Assets / flows / "did we grow"** = `SUM(amount) WHERE txn_type IN ('DEPOSIT','WITHDRAWAL')`. This is organic growth — it is NOT the same as the change in AUM (which is mostly market-driven).
* **Fee revenue** = `-SUM(amount) WHERE txn_type='FEE'` (fees are stored negative; revenue is their magnitude). Fees ≈ 1% annual of AUM, billed quarterly.
* **Allocation / exposure / asset mix** = value grouped by `securities.asset_class` (or `sector`).
* **Concentration / single-name risk** = HHI `SUM(v*v)/POW(SUM(v),2)` where v is per-symbol value; **effective # holdings = 1/HHI**.

**Conventions**
* `transactions.amount` is a signed cash impact: positive = cash IN (`DEPOSIT`, `SELL`, `DIVIDEND`); negative = cash OUT (`BUY`, `WITHDRAWAL`, `FEE`). `quantity`/`price` are only meaningful for `BUY`/`SELL`.
* Cash exists two ways: as a holding (`symbol IN ('CASH','VMFXX')`, `asset_class='Cash'`, price ≈ 1) and as sweep cash in `accounts.cash_balance`. AUM from positions already includes the Cash holding; add `cash_balance` only for "total cash / total account value incl. cash".
* Currency is USD. "Top/biggest" with no metric → rank by AUM. "Performance/P&L" with no horizon → today. "Gains" unqualified → unrealized.
* Risk profile drives suitability: Conservative=bond-heavy, Moderate=balanced, Aggressive=equity/crypto-heavy. Use for "appropriate / overweight / drifting" questions.

**Vocabulary**
* "whales / richest / high-end clients" = `segment IN ('HNW','UHNW')` (UHNW = richest, >$10M; HNW $1M–$10M; Mass Affluent <$1M).
* "book / book of business" = all positions under an advisor's clients' accounts.
* "movers / winners / losers" = securities by `day_change_pct`.
* "retirement accounts" = `account_type IN ('IRA','Roth IRA','401k')`. "Stocks"=Equity, "funds"=ETF, "bonds"=Fixed Income.
* "advisor / RM / FA / rep" = `advisors`. "client / household / family / investor" = `clients`.
