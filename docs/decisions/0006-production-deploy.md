# ADR 0006: Production Deploy — Vercel + Supabase Backups + UptimeRobot

**Date:** 2026-05-21  
**Status:** Accepted  
**Decider:** FoundingEngineer

---

## Context

TRI-11 requires a stable production URL before the CEO dogfood walk. We have a Next.js App Router app (server-side, no static export) backed by Supabase Postgres and Supabase Storage. We need hosting, database backups, and uptime monitoring at minimal (ideally zero) cost for a v0 with zero real users.

---

## Decisions

### Hosting: Vercel

Vercel is the natural platform for Next.js — zero-config, auto-detects framework, handles preview deploys for every PR, and has a generous free tier. Alternative (Fly.io, Railway, Render) would all require Dockerfile or custom build scripts; Vercel requires none.

**Connection:** Go to vercel.com → New Project → import `LuisSeringas/truss-platform`. No config file needed beyond `vercel.json` which locks region to `lhr1` (London) — closest to the structural engineering market (UK/EU).

**Required env vars in Vercel project settings:**
- `DATABASE_URL` — Supabase connection string (use Session mode port 5432 for Vercel; Vercel runs Node, not edge)
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `SUPABASE_URL` — project URL from Supabase API settings
- `SUPABASE_SERVICE_ROLE_KEY` — service role key from Supabase API settings

`NEXTAUTH_URL` is NOT needed — Vercel injects `VERCEL_URL` automatically and NextAuth v5 picks it up.

### Database Backups: Supabase built-in (free tier)

Supabase free tier provides daily automated backups with 7-day retention. Accessible from the Supabase dashboard under Database → Backups. This is sufficient for v0 with no real user data.

**Upgrade trigger:** when the first real design partner uploads production data, upgrade to Supabase Pro ($25/month) for point-in-time recovery (PITR). Escalate to CEO for budget approval at that point.

We do NOT set up a custom `pg_dump` cron for now — it would store credentials in GitHub secrets and add ops complexity for zero benefit at this scale.

### Database Migrations: Manual via GitHub Actions

`migrate.yml` workflow runs `pnpm db:migrate` against production. Triggered manually from GitHub Actions UI. Requires `DATABASE_URL` added as a GitHub Actions secret (separate from Vercel — for the migration runner).

This is intentionally manual: schema changes in a v0 with no real users can be applied on demand without a fully automated migration gate.

### Uptime Monitoring: UptimeRobot (free tier)

UptimeRobot free tier supports 50 monitors with 5-minute check intervals and email alerts. Setup after production URL is live:

1. Go to uptimerobot.com → Create Free Account
2. Add Monitor → HTTP(s) → target the production Vercel URL
3. Set alert contact to CEO email

Free tier is sufficient until SLA commitments exist (none yet).

### Smoke Test: GitHub Actions `deployment_status` trigger

`deploy.yml` hooks into Vercel's GitHub deployment events and curls the deployed URL. If the homepage returns anything other than 2xx/3xx, the check fails and flags the bad deploy. This is a minimal post-deploy sanity check, not a full E2E suite.

---

## Consequences

- Production URL lives at the Vercel-assigned domain (e.g., `truss-platform.vercel.app`) until a custom domain is purchased. Custom domain is a CEO scope decision.
- Vercel free tier limits: 100 GB bandwidth/month, 6000 build minutes/month. Neither is a concern at v0.
- Supabase backup restoration requires manual steps through the dashboard — acceptable at this stage.
- First real migration to production requires running the `migrate.yml` workflow manually — deliberate; keeps a human in the loop during v0.
