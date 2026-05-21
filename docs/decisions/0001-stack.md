# ADR 0001: Stack Selection

**Date:** 2026-05-21  
**Status:** Accepted  
**Decider:** FoundingEngineer

---

## Context

We are building a platform for structural engineers that stores every project's files plus the "why" — the rationale, decisions, calcs, and assumptions behind those files. We have zero users, no design partner yet, and one engineer. We must ship a working v0 as fast as possible while keeping every choice reversible when we grow.

---

## Decisions

### Language: TypeScript + Node.js 20 LTS

TypeScript catches category errors before runtime with zero extra tooling cost. Node.js 20 is broadly supported, well-understood, and hiring is easy. Alternatives (Go, Python, Bun) would each add friction without benefit at this scale.

### Framework: Next.js 15 (App Router)

Next.js gives us server-side rendering, API routes, and file-system routing in one package. The App Router model aligns with how we will eventually structure project-scoped pages. Vercel (our planned hosting) has first-class Next.js support. Remix or SvelteKit would work equally well technically, but Next.js has the largest ecosystem and fewest surprises for a team that will grow.

### Database: PostgreSQL via Supabase (free tier)

PostgreSQL is the right default for structured relational data with JSON escape hatches — exactly what project metadata, rationale documents, and user accounts look like. Supabase removes all operational burden (backups, connection pooling, auth integration) at zero cost on the free tier. We can eject to managed PG (Neon, RDS) at any time without changing the query layer. Deferred until TRI-3 / auth sprint.

### Object Storage: Supabase Storage

Structural engineering projects contain large files (PDFs, CAD drawings, calculation sheets). Supabase Storage is S3-compatible, bundled with our Supabase project at no extra cost, and can be swapped for S3/R2 later by changing one env var. Deferred until TRI-3 / auth sprint.

### Package Manager: pnpm

pnpm is faster than npm/yarn on repeated installs, uses a content-addressable store that saves disk space, and enforces strict dependency resolution that prevents phantom-dep bugs. All major CI providers support it out of the box.

### Hosting: GitHub Pages (v0) → Vercel (v1)

For the hello-world milestone we deploy a static export to GitHub Pages via GitHub Actions — no external auth required, fully automated from first commit. When the first design partner arrives and we need server-side features (auth, file uploads, API routes), we will migrate to Vercel. Vercel's free tier supports the full Next.js runtime and adds zero-ops preview deployments per PR, which will matter once we are iterating with a real user.

### CI: GitHub Actions

GitHub Actions is already in the repo, free for public repos, and integrates directly with the deploy pipeline. No extra service to configure.

---

## Consequences

- We ship a public URL in the same sprint as this ADR.
- Static export constraint means no server-side code until Vercel migration — acceptable for hello-world.
- Supabase free tier has a 500 MB database limit and 1 GB storage limit; both are irrelevant until we have real users.
- If the platform moves off GitHub (e.g., GitLab), we will need to migrate CI and Pages — low probability, low cost if it happens.
