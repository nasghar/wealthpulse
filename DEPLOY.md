# Deploying WealthPulse to Vercel (secure, always-on demo)

This guide gets WealthPulse running on **Vercel**, talking to **SingleStore
Helios**, with the **UI locked behind a password** and the database **not left
open to the world**. It also explains how the market simulation runs when there's
no always-on server process, and how to keep data size flat.

## The three parts

| Part | How it runs on Vercel |
|------|----------------------|
| **Next.js app** (dashboards, co-pilot, APIs) | Vercel serverless — native fit |
| **Market simulation** | **Driven from the UI** — a "Live" button ticks the market via API calls while a tab is open (serverless has no background process). Optional 24/7 paths below. |
| **SingleStore Helios** | Your existing workspace; the app connects over TLS |

---

## Step 1 — Create a scoped DB user (don't ship `admin`)

The app should authenticate as a **least-privilege** user that can only touch the
`wealthpulse` database — never the admin account. Run this once (SQL Editor or
`mysql` as admin):

```sql
CREATE USER 'wpapp'@'%' IDENTIFIED BY 'a-long-random-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON wealthpulse.* TO 'wpapp'@'%';
-- No DDL, no other databases, no admin. The reset button uses DELETE (not
-- TRUNCATE) so these DML grants are sufficient.
```

Even if someone reached the endpoint, this user can't drop tables, read other
databases, or manage the cluster — and the data is synthetic anyway.

## Step 2 — Lock down the Helios network

SingleStore Helios has a **firewall** (workspace-group → Firewall) that allow-lists
inbound IPs. Here's the honest tradeoff:

- **Vercel serverless has *dynamic* egress IPs.** To let Vercel connect you'd have
  to allow `0.0.0.0/0`. The endpoint is then reachable from the internet, but it's
  protected by (a) the scoped `wpapp` user + strong password, (b) **TLS** (the app
  sets `ssl` automatically in the cloud — keep `SINGLESTORE_SSL=true`), and (c)
  synthetic-only data.
- **Want a real IP allow-list instead?** Deploy on a host with a **static egress
  IP** — Railway, Render, or Fly (see "Option C" at the bottom). Then set the
  Helios firewall to *just that one IP* and the DB is genuinely not exposed. This
  is the most locked-down option; Vercel only matches it on Enterprise (Secure
  Compute static IPs).

> Rule of thumb: **Vercel + `0.0.0.0/0` + scoped user + TLS + UI password** is fine
> for a synthetic sales demo. If policy requires the DB to accept only known IPs,
> use a static-egress host and allow-list it.

## Step 3 — Seed the database (once, from your laptop)

Point your local `.dbcreds.json` at the workspace (using the `wpapp` user) and:

```bash
npm run setup       # schema (all columnstore) + seed ~23k positions
```

This writes the data into Helios; Vercel will read/write the same database.

## Step 4 — Deploy to Vercel

```bash
npm i -g vercel
vercel            # link the project
vercel --prod     # deploy
```

In **Project → Settings → Environment Variables**, set the values from
[`.env.example`](.env.example):

```
SINGLESTORE_HOST, SINGLESTORE_USER=wpapp, SINGLESTORE_PASSWORD, SINGLESTORE_DATABASE=wealthpulse
SINGLESTORE_SSL=true
APP_PASSWORD=<your demo password>          # ← locks the UI (Step 5)
AUTH_SECRET=<long random string>
# Optional co-pilot:
ANALYST_BASE_URL, ANALYST_ORG_ID, ANALYST_PROJECT_ID, ANALYST_API_KEY
```

**Set the function region to match Helios** (Project → Settings → Functions →
Region = the workspace's AWS region, e.g. `Washington, D.C. (iad1)` for
`us-east-1`) so every DB round-trip is in-region.

## Step 5 — Password-protect the UI

Setting **`APP_PASSWORD`** turns on the built-in gate (`src/proxy.ts`): every page
and API route redirects to `/login` until the visitor enters the password. A signed,
httpOnly cookie (7-day expiry) keeps them in. No password set = the app is open
(handy for local dev).

- The key never reaches the browser; the check runs server-side in the proxy.
- Change the password by updating `APP_PASSWORD` and redeploying. Set a stable
  `AUTH_SECRET` so existing sessions survive unrelated redeploys.
- This is app-level auth (works on any host, free). Vercel's own "Password
  Protection" is an alternative but requires a Pro/Enterprise plan.

---

## How the market moves (simulation on serverless)

Serverless can't run the persistent `npm run simulate` loop, so the simulation is
**driven from the UI**. Bottom-left **"Simulate"** control:

- **Start Live (fresh)** → wipes old intraday history, then ticks the market by
  calling `POST /api/sim/tick` on an interval (1.5–5s) **while the tab is open**.
- Each tick runs one mean-reverting price step server-side (`src/lib/sim.ts`) and
  writes `latest_price` (plus `price_ticks` every 3rd tick). State lives in the DB,
  so it's fully stateless/serverless-safe.
- **Reset data** flattens the board to "market open" and clears history.

Only logged-in visitors can drive it (the endpoints are behind the password gate).

### Keeping data size under control

`latest_price` never grows (75-row UPDATE). Only **`price_ticks`** accumulates —
and only while Live. Two controls keep it flat:

- **"Wipe history on start"** (on by default) clears `price_ticks` each session, so
  it never carries over.
- Programmatic retention: `POST /api/sim/reset {"mode":"trim","keepHours":48}`
  trims to a rolling window. If you enable a 24/7 path below, run this hourly.

So the footprint is bounded no matter how long the demo runs.

---

## Optional — true 24/7 movement (no open tab)

The UI-driven sim only ticks while someone has the app open. To keep the market
moving 24/7, add **one** of these. (Note: SingleStore has **no** MySQL `CREATE
EVENT`; its native scheduler is **Scheduled Jobs**.)

- **SingleStore Scheduled Job** (native, no extra infra): a shared notebook that
  loops for ~1 minute issuing the same price UPDATE every few seconds, scheduled
  **every minute** via cron, with **"Auto-resume the workspace on job execution"**
  enabled. Keeps Helios warm and the market live with zero external servers.
- **Vercel Cron**: a cron entry hitting `POST /api/sim/tick` — but Vercel Cron's
  finest granularity is **once per minute**, so prices step once a minute (fine for
  a passive backdrop, not for fast flashing).
- **Tiny always-on worker** (Railway/Render/Fly — "Option C"): run the existing
  `npm run simulate` for true sub-second ticks, and get a **static egress IP** to
  tightly allow-list in the Helios firewall.

Either way, remember the workspace **auto-suspends when idle** — for a permanently
live URL, disable auto-suspend (burns credits 24/7) or accept a cold-start on the
first visit. The Scheduled Job's auto-resume option sidesteps this.

---

## Does Vercel cost money?

- **Hobby (free)** can run this, but Vercel's Hobby terms are **personal/non-commercial**.
  A customer/sales demo is commercial → **Pro (~$20/user/mo)** is the compliant choice.
- The **streaming co-pilot** (Aura Analyst SSE) can run longer than Hobby's function
  duration cap and get cut off; Pro raises `maxDuration` to 300s. If live streaming
  matters, an always-on Node host (Option C) has **no function-timeout ceiling** and
  fits SSE better — worth considering over Vercel for this specific app.

## Security checklist

- [ ] App connects as scoped `wpapp` (not `admin`)
- [ ] `SINGLESTORE_SSL=true` (encrypted to Helios)
- [ ] `APP_PASSWORD` set (UI + APIs gated) and `AUTH_SECRET` is long/random
- [ ] Helios firewall as tight as your host allows (single static IP if possible)
- [ ] Secrets only in Vercel env vars — never committed (`.dbcreds.json`/`.analyst.json` are gitignored)
- [ ] Function region == workspace region
