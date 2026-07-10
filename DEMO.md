# WealthPulse — The Aura Intelligence Demo (15-min mic-drop)

**This demo is the Aura keynote, made real.** WealthPulse is a customer app with
**Embedded Aura** inside it — natural-language Q&A on **live context**, powered by
the **SingleStore Context Engine**. You're not demoing a dashboard app; you're
demoing *the moat from the keynote, running.*

> **Keynote thesis (open with this):** *"Intelligence is the new moat. The agentic
> era won't be won by the biggest model — everyone rents the same models. It's won
> by whoever turns **live context into action** first. Let me show you that moat
> running."*

**What this demo proves, in Aura terms:**
- The co-pilot sidecar = **Embedded Aura** (headless Q&A dropped into your own app).
- It's grounded by the **Context Engine / S2 Knowledge Fabric** — business ontology, schema crawling, data sampling, feedback loop.
- All on **one governed SingleStore database** — the *intelligence-first* center of gravity, not AI bolted onto a warehouse.

### Keynote → Demo map (so your language matches the deck)

| Keynote message | Where you land it |
|---|---|
| "Better **context** = better AI" (agents are brilliant *and blind*) | Act 1, Beat 3 + Act 3, Beat 8 |
| Context that wins: **Connected · Fresh · Updatable · Fast · Open** | Act 1–2 (live board, live risk, streaming blotter) |
| **Real-time path** beats Event→ETL→Warehouse→Dashboard | Act 1, Beats 1–2 |
| **Embedded Aura** — Q&A inside your own app | Every co-pilot moment |
| **Context Engine / Knowledge Fabric** — ontology, model gateway, BYOK | Act 3, Beat 8 |
| **Enterprise-grade** — multi-tenant, RBAC, accuracy, observability | Act 3, Beat 9 |
| **Three offerings, one context engine** + **open lakehouse** | Act 3, Beat 10 |
| **Build vs. Buy** (the 80% is easy, Aura is the 20%) | Objection handling / closer |

---

## ⏱️ Pre-flight (2 min before the call — do NOT skip)

1. **Warm the workspace** — open the app once (first hit can cold-start ~10–30s).
2. **Log in** with `APP_PASSWORD`.
3. **Start the market** — bottom-left **"Simulate" → Start Live (fresh)**. Confirm prices flashing.
4. **Dry-run your co-pilot prompts** — Embedded Aura phrasing varies run to run; ask each prompt below **once** and keep the ones that land crisp.
5. Browser **full-screen**; optional second tab on **"Architecture briefing"** (left sidebar) for the "how it's built" moment.

---

## 🎬 ACT 1 — The moat: live context in action (0:00–5:00) · *always do this*

**Beat 1 · Executive dashboard** (landing page)
- **Do:** Point at AUM ticking, intraday P&L, allocation, movers — all live.
- **Say:** "$7B, 1,000 clients, 30 advisors, 23,000 positions — moving *right now*. In most shops this number is last night's batch. Here it's the live truth."
- 🎤 **Mic drop:** "The keynote's slow path is Event → ETL → Warehouse → Dashboard → Decision — and by the time you decide, the moment's gone. This is the **real-time path**: event → live decision. That AUM just repriced across 23,000 positions **on read**. No ETL, no cache. *That second you don't give away is the business model.*"

**Beat 2 · Market Monitor** (`Market Monitor`)
- **Do:** Flashing quote board + sector heatmap.
- **Say:** "Winning context is five things *at once* — Connected, Fresh, Updatable, Fast, Open. Watch three of them here: **Connected** across every position, **Fresh** in milliseconds, **Fast** to retrieve."
- 🎤 **Mic drop:** "Each tile's size is the firm's **real dollar exposure**, aggregated over 23,000 positions live; color is today's move — **one query** on operational data. Bolt AI onto yesterday's stack and you leak one of those five walls. Miss one, the moat leaks."

**Beat 3 · First Embedded Aura moment** (gold button, bottom-right)
- **Say:** "This is **Embedded Aura** — natural-language Q&A dropped *inside our own app*, grounded in that same live context. A question that's on no dashboard:"
- **Type:** `How many clients do we have and what's our total AUM?`
- **Do:** Watch it **think → write SQL → answer**.
- 🎤 **Mic drop:** "The keynote line is *'your agents are brilliant and blind.'* This one can **see** — it wrote SQL against the live database and answered in English. **Better context, not a bigger model.**"

*Out of time? Stop here — the moat is already on the table.*

---

## 🎬 ACT 2 — The 20% others miss: accuracy & trust (5:00–10:00) · *+5 min*

**Beat 4 · Client 360** (`Clients` → click any client)
- **Do:** Live valuation, holdings vs. cost, activity.
- **Say:** "Same engine, firm → single household. And this is **Updatable** context — trades, transfers, updates and deletes all stay true. Not an append-only log you reconcile later."

**Beat 5 · Risk & Rebalance** (`Risk & Rebalance`)
- **Do:** Concentration (HHI), model-target drift, volatility.
- 🎤 **Mic drop:** "Risk is **recomputed as the market moves** — an advisor sees a portfolio breach the model *the moment it happens*, not in tomorrow's report. Timing *is* the value."

**Beat 6 · Trade Blotter** (`Trade Blotter`)
- **Do:** Firm-wide feed streaming in — ingest + analytics on the same tables.

**Beat 7 · Embedded Aura that shows its work** (open sidecar)
- **Type:** `Show me our top 3 advisors by net new assets this year`
- **Do:** It renders a **chart + table**; reveal the **Generated SQL** (tables used + confidence score).
- 🎤 **Mic drop:** "Anyone can build the 80% on a raw model over a weekend. Aura is the **20%** that makes it enterprise: it **shows its work** — the exact SQL, the tables, a confidence score. **Auditable AI**, not a confident wrong answer on stale data."

---

## 🎬 ACT 3 — Context Engine, enterprise & versatility (10:00–15:00) · *the closer*

**Beat 8 · The Context Engine — *why the answer is right*** (co-pilot)
- **Say:** "Accuracy doesn't come from the model — it comes from the **SingleStore Context Engine**, the **Knowledge Fabric**: a business **ontology**, schema crawling, data sampling, and a feedback loop, in an isolated context DB. Plus a **unified model gateway** — Claude, OpenAI, Gemini, **bring your own key.**"
- **Type** a *business-language* question (pick one you dry-ran):
  `Which clients have the highest concentration risk?` · or · `What's our AUM by asset class?`
- 🎤 **Mic drop:** "It understood *'concentration risk'* as **our** business definition — mapped to the right tables and formula — because the ontology encodes our language and metrics. Ask that against a raw schema and it hallucinates. **The context engine is the moat.**"

**Beat 9 · Enterprise-grade & governance** (talk track + artifacts)
- **Say — this is where Build-vs-Buy lands:** "Could you build this on raw Claude or OpenAI? 80% in a weekend — then you hit the 20%: **token burn**, **single-tenant**, **no RBAC**, every user needs their own key, **unknown accuracy**, no hosting, no observability, no HA. Aura ships that 20% as a product."
- **Point to the proof underneath:**
  - **Multi-tenant + robust RBAC** — row/column-level security; two advisors ask the same question, each sees only their own book.
  - **Scoped by design** — the co-pilot's key is limited to one org, one project, one domain; the app's DB user is least-privilege (**denied schema changes**), never admin.
  - **Version-controlled, observable, BYOK, billing/chargeback** — built in, not bolted on.
- 🎤 **Mic drop:** "The analyst can only ever touch what it's granted — enforced in the **database** and the **context engine**, not by hoping a prompt behaves."

**Beat 10 · Versatility — *one context engine, three offerings*** 
- **Say:** "What you're seeing is **Embedded Aura** (headless). Same governed database and context engine also power **Aura Copilot** — the headed experience for your analysts and BI users — and **Aura Code** for your developers and agents/MCPs. One brain, three personas."
- **Do:** Open the sidecar over **Risk**, then **Blotter** — "it travels with the user, in-context, everywhere."
- **Say (open / no lock-in):** "And it **meets you where you are** — works over your Iceberg lakehouse, Snowflake, Databricks. No rip-and-replace; your governed lakehouse stays the source of truth."
- 🎤 **Mic drop:** "One **governed** context engine — embed it **anywhere your users already work.** Build once, deploy the intelligence everywhere."

**Closing line (straight from the keynote):**
> "The winners of the agentic era won't have the most models. They'll have the
> **fastest live context — a moat that compounds every day.** That's Aura. What you
> just watched isn't a demo of a feature. It's the moat, running. Let's build yours."

---

## 🧠 Value cheat-sheet — *Revenue up · Cost down · Risk down* (for Q&A)

| Outcome | The proof point you just showed |
|---|---|
| **Revenue up** | Launch AI experiences faster (Embedded Aura in-app); real-time decisions capture the moment |
| **Cost down** | One store — no data copies, no ETL, no point-solutions to stitch; leverage existing Iceberg |
| **Risk down** | No lock-in (open lakehouse); enterprise RBAC/observability/HA; governed lakehouse stays source of truth |

**The 5 context properties** (name them): Connected · Fresh · Updatable · Fast · Open — "they multiply, not add."

## 🛡️ Objection handling

- **"Isn't the AUM just cached?"** → No precomputed AUM table; the query **joins live prices on read** every poll. Refresh — it moves. That's the real-time path.
- **"Can the AI see everything / go rogue?"** → Scoped key (one domain), DB RBAC + row/column security, and it **shows its SQL**. Governed, not hoped.
- **"Text-to-SQL hallucinates."** → Grounded by the **Context Engine ontology**; every answer carries a **confidence score** + its **SQL**. You verify, you don't trust.
- **"We'll just build it on OpenAI/Claude."** → You'll get 80% fast — then token burn, single-tenant, no RBAC, unknown accuracy, no HA. Aura *is* the productized 20%.
- **"How is this different from Databricks Genie / Snowflake Cortex?"** → *Never say they can't do AI.* Say: "Strong platforms — built around a **different center**. Genie is lakehouse/ML, Cortex is warehouse, both read-oriented and catalog-centric. Aura is built around **live operational data** — transactions + analytics, app-grade concurrency, a purpose-built multi-tenant context engine, **open** to both lakehouses. AI needs *our* center."

## 🔄 Reset between demos
Bottom-left **Simulate → Reset data**, then **Start Live (fresh)**. Deterministic data — nothing else to reset.

## 🎤 Three lines to memorize
1. **(Act 1)** "The real-time path — $7B repriced on read, no ETL. The second you don't give away *is* the business model."
2. **(Act 2)** "The 80% is easy; Aura is the 20% — an analyst that **shows its work.**"
3. **(Act 3)** "One **governed context engine** — the moat that compounds. Embed it everywhere."
