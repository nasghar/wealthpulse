# WealthPulse × Aura — Sales Mic-Drop Demo

**The one idea:** *Here's your application running on SingleStore with **real-time
data** — that's the foundation. Now put best-in-class **intelligence** on it, three
ways, all on **one copy of data**, **one Domain**, **one context engine.***

> **Tagline (say it up front, repeat it at the close):**
> *"We'll make your business **AI-ready in no time — with real-time context** — and
> you can do it whichever way fits your users: **Aura Copilot**, **Embedded Aura**, or
> **Aura Code.**"*

### The foundation vs. the intelligence
- **Foundation** = WealthPulse: a real app on SingleStore, live data, no ETL. It is the *stage*, not the star.
- **Intelligence, 3 ways** (keynote slide 10 — *three offerings, one context engine*):
  1. **Aura Copilot** — *headed*, at **analyst.singlestore.com** — for analysts/BI. Zero build.
  2. **Embedded Aura** — *headless* — natural-language Q&A dropped **inside your own app** (WealthPulse sidecar).
  3. **Aura Code** — *agents & MCPs* — a **custom app your developers build** (our `/intelligence` workbench).

### What is a "Domain"? (define this once — it's the whole pitch)
A **Domain** is a *logical grouping of a business subject area* — and it has **three layers**:
1. **SingleStore domain expertise** — knows how to write *best-in-class SingleStore* SQL & apps.
2. **Business ontology** — captures *your business rules & vocabulary*.
3. **Technical semantic layer** — *auto-derived* from your schema and *kept up to date* as your data evolves.

All three offerings above share **this one Domain.** That's the moat.

---

## ⏱️ Pre-flight (do NOT skip)
1. **Foundation live** — app open, logged in (`APP_PASSWORD`), bottom-left **Simulate → Start Live**; prices flashing.
2. **Aura Copilot ready** — `analyst.singlestore.com` (SingleStore Portal → Analyst) open, signed in, **WealthAdvisor** domain selected.
3. **Phase 2 setup** — have TWO domains ready: one **WITH** the WealthAdvisor business context, one **WITHOUT** (bare/technical-only) — so you can show the difference live. (Use **Creator Mode** / **Create Domain** in the portal.)
4. **Dry-run** every prompt once (text-to-SQL phrasing varies) and keep the ones that land.
5. Have all three surfaces one click away: portal Analyst tab · WealthPulse sidecar (gold button) · **Wealth Intelligence** (violet sidebar link → `/intelligence`).

---

## 🎬 PHASE 1 — Mic drop: real-time foundation + intelligence 3 ways (~5 min)

**Beat 0 · The foundation (keep it to 45 seconds).**
- Show the Executive dashboard + one flashing screen (Market Monitor).
- **Say:** "This is a real wealth app on SingleStore — $7B, 1,000 clients, 23,000 positions, repriced **live on read**, no ETL. That's the foundation. Now the interesting part: intelligence on top of it."

**Beat 1 · Flavor ① Aura Copilot — `analyst.singlestore.com` (zero build).**
- Go to the **Portal → Analyst**, **WealthAdvisor** domain. Ask: `What's our firm-wide AUM and how is it split by asset class?`
- Show it think → write SQL → answer.
- **Show the two portal capabilities:**
  - **Dashboards** — pin/save answers into a **real-time dashboard** built by *asking*, refreshed on live data.
  - **Sharing** — share a conversation/dashboard with colleagues.
- **Say:** "This is **Aura Copilot** — *headed*, for your analysts and BI users, right inside SingleStore. **Nothing to build.**"

**Beat 2 · Flavor ② Embedded Aura — inside your app (WealthPulse sidecar).**
- Back in WealthPulse, open the gold co-pilot. Ask the *same kind* of question.
- **Say:** "Same Domain, same context, same answers — but **embedded in your own product** for your application users. *Headless* — you drop it into any screen. This is **Embedded Aura**."

**Beat 3 · Flavor ③ Aura Code — a custom app your devs build (`/intelligence`).**
- Left sidebar → **"Wealth Intelligence · Powered by Aura Code."** A full standalone analyst workbench opens (chat history rail, WealthAdvisorContext selector, greeting).
- Ask `Who are our top 5 advisors by AUM?` — thinks, streams, charts; point at the **history rail**.
- **Say:** "Your developers built this custom experience with **Aura Code** — their branding, their UX — on the **exact same Domain and data.**"

🎤 **PHASE 1 MIC DROP:** "Three surfaces — Copilot, Embedded, Aura Code — **one copy of data, one Domain, one context engine.** That's how you make your business **AI-ready in no time, with real-time context** — whichever way fits your users."

---

## 🎬 PHASE 2 — The power of the Domain: with vs. without business context (~5 min)

*The point: the model is the same, the data is the same — the **Domain** is what makes the answer right. This is where you sell the context engine.*

- **Do (side-by-side in `analyst.singlestore.com`):** ask the **same business question** against the domain **WITHOUT** business context, then **WITH** it. Pick a term that only your ontology defines:
  `How much advisory fee revenue did we collect this year?` · or · `Which clients have the highest concentration risk?` · or · `Who are our whales and which advisor owns them?`
- **Without business context** → it guesses columns/joins, mislabels metrics, or defines the term wrong.
- **With business context** → correct metric definition, correct joins, right vocabulary, right answer — and cleaner SQL.
- **Tie it to the 3 layers as you go:**
  - *Technical semantic layer* → it already knows the schema (auto-derived).
  - *Business ontology* → it now knows **"fee revenue" / "whale" / "concentration"** the way **your firm** means them.
  - *SingleStore expertise* → it writes optimal SingleStore SQL either way.

🎤 **PHASE 2 MIC DROP:** "Same model. Same data. The **only** difference is the Domain. **Context is the moat** — and it's a product you configure, not a science project."

---

## 🎬 PHASE 3 — Make it better forever + enterprise-grade (~5 min)

*How this keeps improving on YOUR data, and why it's an enterprise platform — not a demo (keynote slide 11).*

**Better every day — the feedback loop.**
- The Domain **learns**: capture your **golden queries**, correct an answer once and it sticks, and the **technical semantic layer refreshes automatically as your schema/data evolve** — no re-platforming.
- **Say:** "You retain intelligence on **your** data and **your** queries — accuracy compounds. It's *your* context, getting sharper."

**Enterprise-grade (slide 11 — the differentiated architecture):**
- **Fully isolated context DB** (ACE) + **unified model gateway** — **Claude, OpenAI, Gemini, BYOK**.
- **Multi-tenant + robust RBAC**, including **row/column-level security** — two advisors ask the same question, each sees **only their own book**.
- **Version-controlled · observability / HA / DR · billing & chargeback · best-in-class accuracy.**
- **Say:** "Every one of the three surfaces inherits **all** of this — because they share one governed context engine."

🎤 **PHASE 3 MIC DROP:** "Governed, multi-tenant, observable, **RBAC-enforced from day one** — and it gets **smarter every day on your data.** That's an enterprise platform, not a demo."

---

## 🧠 Cheat-sheet — the numbers & the mapping
- **Foundation:** $7B AUM · 1,000 clients · 30 advisors · 23,000 positions · repriced on read (S-00, the smallest workspace).
- **3 offerings → 3 things to click:** Portal Analyst (Aura Copilot) · gold sidecar (Embedded Aura) · violet sidebar link `/intelligence` (Aura Code).
- **Domain = 3 layers:** SingleStore expertise · Business ontology · Auto technical semantic.
- **Build vs. Buy:** raw Claude/OpenAI gets you 80% then fails the 20% — token burn, single-tenant, **no RBAC**, unknown accuracy, no HA. Aura *is* the productized 20%.

## 🛡️ Objection handling
- **"Isn't the dashboard data cached?"** → No precomputed table; joins live prices **on read**. Refresh — it moves.
- **"Text-to-SQL hallucinates."** → That's **Phase 2** — the Domain grounds it; every answer shows its **SQL + confidence.**
- **"Can the AI see everything?"** → Multi-tenant + **row/column RBAC**; scoped keys; it shows its SQL. Governed, not hoped.
- **"How is this different from Databricks Genie / Snowflake Cortex?"** → *Never say they can't do AI.* They're built around a **different center** (lakehouse/warehouse, read-oriented, catalog-centric). Aura is built around **live operational data** — transactions + analytics, app-grade concurrency, a purpose-built multi-tenant Domain, **open** to your lakehouse.

## 🔄 Reset between demos
Bottom-left **Simulate → Reset data**, then **Start Live (fresh)**. In the portal, **New Chat** clears the Aura Copilot thread. Deterministic data — nothing else to reset.

## 🎤 Three lines to memorize
1. **(Phase 1)** "One copy of data, one Domain — surfaced three ways: Copilot, Embedded, Aura Code."
2. **(Phase 2)** "Same model, same data — the **Domain** is the difference. Context is the moat."
3. **(Phase 3)** "Enterprise-grade from day one, and it gets smarter every day on **your** data."
