# WealthAdvisor Co-pilot — "Business Context Matters" Demo Script

A side-by-side that proves the **business ontology** (not just the technical
semantic layer) is what makes text-to-SQL trustworthy. Run each question **twice**:
once with only the auto-scanned schema, then again after loading the ontology.

> Setup: connect the co-pilot to the `wealthpulse` database. Round 1: no Context
> loaded. Round 2: paste `wealthadvisor-business-context.md` (or the short
> Instructions version) into the Context panel and re-ask.

---

### 🎯 The headline moment — fee revenue (sign convention)
**Ask:** *"How much advisory fee revenue did we collect last quarter?"*
- **Without context:** sums `transactions.amount` for `FEE` → returns a **negative**
  number (fees are stored as negative cash impacts). Looks like the firm *lost*
  money. Wrong.
- **With context:** knows fee revenue = `-SUM(amount)` → returns the correct
  **positive** revenue figure.
- **Say:** "The schema can't tell the model that a fee is stored as a negative cash
  movement. The business ontology can. One line of context flips a wrong answer to a
  right one."

---

### 💰 Valuing a portfolio (the join the schema can't infer)
**Ask:** *"What is our total AUM and how much did it move today?"*
- **Without context:** there's no `price` on `positions`, so the model may sum
  `quantity`, grab a stale price, or fail — and rarely knows to use `prev_close`
  for the daily move.
- **With context:** `SUM(quantity × latest_price.price)` for AUM and
  `SUM(quantity × (price − prev_close))` for the move. Correct, live.
- **Say:** "Valuation requires joining the live price table and knowing
  *yesterday's close* is the baseline for 'today'. That's business logic, not column
  names."

---

### 📈 Growth vs. market (a pure business distinction)
**Ask:** *"Did our book actually grow this year?"*
- **Without context:** compares AUM start vs. end → conflates **market movement**
  with real inflows. Misleading.
- **With context:** answers with **Net New Assets** (`DEPOSIT − WITHDRAWAL`) —
  organic growth, separate from market return.
- **Say:** "An advisor doesn't get credit for the S&P going up. 'Growth' means
  *flows*. The ontology encodes that distinction; the schema never could."

---

### 🐋 Vocabulary — talking like the business
**Ask:** *"Who are my whales, and which advisor has the biggest book?"*
- **Without context:** "whales" and "book" are meaningless to a schema scan.
- **With context:** whales = `UHNW` clients; book = AUM rolled up per advisor via
  positions → accounts → clients → advisors.
- **Say:** "Your team doesn't ask in column names. The ontology maps how people
  actually talk to the right tables and joins."

---

### 🛡️ Risk & suitability (multi-hop + domain judgment)
**Ask:** *"Which UHNW clients are overweight crypto for their risk profile?"*
- **With context:** filters `segment='UHNW'`, computes each client's `Crypto`
  allocation %, and compares against an Aggressive-model target — a 4-table join
  plus a suitability rule.
- **Say:** "This is the payoff: a compliance-grade question answered correctly,
  because the model knows segments, allocation math, and what 'overweight' means."

---

### 🔎 Concentration (the formula the model would never guess)
**Ask:** *"Which clients are dangerously concentrated in a single position?"*
- **With context:** largest position as a % of portfolio (or HHI). Flags
  single-name risk.
- **Say:** "Concentration risk has a precise definition. The ontology supplies it,
  so every analyst gets the same correct answer."

---

## Suggested run order (≈5 min)
1. Fee revenue (the sign-flip "aha") → strongest opener.
2. AUM + today's move (live valuation).
3. Growth vs. market (business distinction).
4. Whales + biggest book (vocabulary).
5. UHNW overweight crypto (the multi-hop finale).

## The one-liner to close
> "The technical scan tells the model *what columns exist*. The business ontology
> tells it *what the business means* — sign conventions, valuation rules, growth vs.
> market, and the words your team actually uses. That's the difference between a
> demo and a system advisors will trust."
