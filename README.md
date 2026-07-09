# WealthPulse — Real-Time Wealth Management Demo

A sales-ready demo showing how **SingleStore HTAP** powers a real-time wealth
management platform: a live market feed streams into the same database that
serves every advisor dashboard, with **no separate warehouse, cache, or ETL**.

Every position is revalued **on read** against streaming prices — ~23,000
positions priced in well under a second.

---

## The story it tells

> One database ingests a firehose of market ticks *while* serving sub-second
> portfolio analytics over them. AUM, P&L, allocation, risk and rebalancing
> drift all update live as the market moves.

- **$7B** in assets under management
- **1,000** clients · **1,748** accounts · **30** advisors
- **75** real symbols across 5 asset classes (Equity, ETF, Fixed Income, Crypto, Cash)
- **~23,000** positions · **~62,000** transactions · 2 years of NAV history

---

## Architecture

| Layer | Tech |
|-------|------|
| Database | SingleStore (dedicated S-00), **all columnstore** tables |
| Live feed | `scripts/simulate.mjs` — mean-reverting GBM walk, updates `latest_price` every 1.5s |
| App | Next.js 16 · React 19 · Tailwind v4 · Recharts |
| Data access | `mysql2` pool, query layer in `src/lib/queries.ts` |

The HTAP money shot — firm-wide revaluation, recomputed on every poll:

```sql
SELECT SUM(p.quantity * lp.price)  AS aum,
       SUM(p.quantity * (lp.price - lp.prev_close)) AS day_pnl
FROM positions p
JOIN latest_price lp ON p.symbol = lp.symbol;
```

### Schema (all columnstore)
`advisors` · `clients` · `accounts` · `securities` · `positions` ·
`transactions` · `price_ticks` · `latest_price` · `daily_nav`

### Screens
1. **Executive Dashboard** — firm AUM, intraday P&L, allocation, movers, segments
2. **Market Monitor** — live indices, sector heatmap, flashing quote board
3. **Advisor Book** — leaderboard by AUM, clients, day P&L
4. **Client 360** — live valuation, holdings, performance vs cost, activity
5. **Risk & Rebalance** — volatility, concentration (HHI), drift vs model target
6. **Trade Blotter** — streaming firm-wide transaction feed

---

## Quick start (fresh clone)

You need a **SingleStore workspace** (dedicated or free starter tier) and Node 20+.

```bash
# 1. Install
npm install

# 2. Point at your database — copy the template and fill in your workspace creds
cp .dbcreds.example.json .dbcreds.json
#   edit .dbcreds.json: host, password (user=admin, database=wealthpulse)

# 3. (Optional) enable the AI co-pilot
cp .analyst.example.json .analyst.json      # fill in Aura Analyst org/project/key

# 4. Build schema (all columnstore) + seed ~23k positions of synthetic data
npm run setup

# 5. Run the app + live market feed (two terminals)
npm run dev        # http://localhost:3000
npm run simulate   # streams price ticks — keep running during the demo
```

Both `.dbcreds.json` and `.analyst.json` are **gitignored** — no secrets are ever
committed. To deploy this to an always-on host, see **[DEPLOY.md](DEPLOY.md)**
(cloud hosts read the same values from env vars — see [`.env.example`](.env.example)).

## Running the demo

**1. Connection** — credentials live in `.dbcreds.json` (gitignored). To point at
a different SingleStore workspace, edit that file.

**2. Start the live market feed** (keep this running during the demo):
```bash
npm run simulate
```

**3. Start the app:**
```bash
npm run dev      # http://localhost:3000
```

Open the dashboard and watch prices flash and AUM tick. Without the simulator the
app still works — it just shows the last close instead of a moving market.

### Regenerating data
```bash
npm run seed     # truncates + regenerates all synthetic data (deterministic seed)
```

---

## Demo talking points

- **"No ETL, no cache."** The dashboard query joins live `latest_price` to every
  position on read. There's no precomputed AUM table — it's recomputed each poll.
- **Heatmap = real exposure.** Tile size is the firm's *actual dollar exposure* to
  each sector (an aggregation over 23k positions); color is today's move. Both
  come from one query.
- **Flashing prices.** Each tick the simulator updates `latest_price` in a single
  statement; the UI polls and flashes green/red on change.
- **Columnstore for everything.** Transactional lookups (a client's holdings) and
  analytical scans (firm-wide concentration) both run on columnstore — the HTAP
  pitch in one store.

## Analyst Co-pilot (sidecar)

A collapsible AI co-pilot floats over every screen (gold FAB, bottom-right). Expanded,
it's a hovering chat panel that answers free-form questions **beyond the dashboards** —
powered by the **SingleStore Aura Analyst API** (text-to-SQL over the configured domain).

**Architecture:** the browser never sees the API key. The UI calls our server proxy
(`/api/analyst/query`, `/api/analyst/starters`), which forwards to Aura Analyst with the
Bearer token and folds the resolved `session_id` / `trace_id` into the response.

**Configure** — fill `.analyst.json` (gitignored) with the four values from the Cloud Portal:
```json
{
  "baseUrl": "https://<analyst-gateway-host>",
  "orgId": "<org-uuid>",
  "projectId": "<project-uuid>",
  "apiKey": "<bearer-token>"
}
```
- `baseUrl`: the Analyst endpoint with the trailing `/v1/.../analyst/<verb>` removed
  (the proxy also trims it defensively if you paste the full URL).
- `orgId` / `projectId` must match the API key's claims, or Aura returns `403 INVALID_API_KEY`.

Until it's configured, the co-pilot still opens and shows wealth-domain starter prompts;
sending a question returns a friendly "not configured" message. It uses the **Structured
Query** endpoint, rendering the text answer, a **data table**, the **generated SQL** (with
confidence + tables used), and a **Plotly chart** when the agent returns one. The
**Reasoning** toggle requests the agent's thoughts. Conversation continuity is automatic
via the session id.

Files: `src/components/copilot/`, `src/app/api/analyst/`, `src/lib/analyst.ts`.

## Moving to another org / workspace / database

The app is decoupled from the database — **only `.dbcreds.json` is environment-specific.**
To move it to a different SingleStore org, workspace, or database:

1. **Provision** a dedicated (or starter) workspace in the target org and note its
   endpoint + admin credentials.
2. **Point the app at it** — edit `.dbcreds.json`:
   ```json
   {
     "host": "<new-workspace-endpoint>",
     "port": 3306,
     "user": "admin",
     "password": "<new-admin-password>",
     "database": "wealthpulse"
   }
   ```
   (Note: keep the password out of `.env` — `@next/env` would mangle a `$`. The
   JSON file avoids that.)
3. **Create schema + data + run:**
   ```bash
   npm run setup      # creates the database + all columnstore tables, then seeds
   npm run simulate   # live feed
   npm run dev        # app
   ```
   `npm run setup` = `npm run schema` (idempotent DDL) + `npm run seed` (data).

That's it — the schema, queries, simulator, and UI are all portable; nothing else
references the old workspace.

## Upgrading to real market data (Plan B)
The simulator writes the same `latest_price` / `price_ticks` shape a real feed
would. Swap `scripts/simulate.mjs` for a poller against Finnhub (free tier) and
the entire UI works unchanged.
