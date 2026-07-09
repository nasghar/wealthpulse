# Deploying WealthPulse (always-on demo)

This app has three moving parts, and the hosting choice comes down to how you run
each one:

| Part | What it is | Hosting need |
|------|-----------|--------------|
| **Next.js app** | Dashboards + API routes + co-pilot proxy | Any Node/serverless host |
| **Live simulator** | `scripts/simulate.mjs` — a **long-running process** that writes price ticks every ~1.5s | Needs an always-on process, OR move it into the DB (see below) |
| **SingleStore workspace** | The database everything reads from | Stays resumed for a true always-on demo (auto-suspend adds a cold-start) |

The simulator is the crux: **serverless platforms (Vercel) can't run a persistent
background process.** Pick one of the three shapes below.

---

## Secrets on a cloud host

No secret files are committed. Every host injects secrets as **env vars** — the
app now reads those automatically when `.dbcreds.json` / `.analyst.json` are
absent. Set the variables from [`.env.example`](.env.example) in your host's
dashboard.

---

## Option A — Vercel app + DB-driven feed  ★ recommended for always-on

Move the tick loop **into SingleStore as a scheduled EVENT**, so the "live market"
keeps moving 24/7 with no worker box. The app becomes pure serverless.

1. Deploy the Next app to **Vercel** (free Hobby tier, always-on):
   ```bash
   npm i -g vercel && vercel        # link, then `vercel --prod`
   ```
   Add the `SINGLESTORE_*` (and optional `ANALYST_*`) env vars in the Vercel
   project settings.
2. Seed once, then create a DB event that ticks prices (replaces `npm run simulate`).
   Ask me to generate `scripts/schema-event.sql` — it ports the GBM walk into a
   `CREATE EVENT ... EVERY 2 SECOND` stored routine.
3. **Disable workspace auto-suspend** so the event keeps running and the first
   visitor doesn't hit a cold resume.

**Cost:** Vercel free; SingleStore runs 24/7 (credits burn continuously).
**Best when:** you want a public URL that's always live with zero babysitting.

## Option B — Vercel app + tiny worker for the simulator

Keep the JS simulator exactly as-is; run it on a small always-on worker.

1. App on **Vercel** (as above).
2. Simulator on **Railway** or **Render** (Background Worker): start command
   `npm run simulate`, same `SINGLESTORE_*` env vars. ~$5/mo or free tier.
3. Disable workspace auto-suspend (the worker keeps it warm anyway).

**Best when:** you'd rather not port the simulator to SQL.

## Option C — One always-on container (single platform)

Run the web app **and** simulator on one host — simplest single bill, and you can
pause the whole thing between demos.

- **Railway / Render / Fly.io:** one service runs `npm run build && npm start`,
  a second process (or a `Procfile` worker) runs `npm run simulate`.
- Set env vars once. Pause the service when idle to stop all spend.

**Best when:** cost control matters more than a permanently-live URL.

---

## Which should you pick?

- **Always-on public demo, hands-off** → **Option A**.
- **Don't want to touch the simulator** → **Option B**.
- **Spin up per-demo, pause after, one bill** → **Option C**.

All three use the same env vars and the same `npm run setup` to build schema + data.
