# ADR 0002: Domain Model v0

**Date:** 2026-05-21
**Status:** Accepted
**Decider:** FoundingEngineer

---

## Context

We are building a platform that stores structural engineering project files plus the *why* behind them — the rationale, decisions, calcs, and assumptions. We need a minimal schema that captures the four core entities — User, Project, File, Rationale — and can be migrated onto a fresh PostgreSQL database (Supabase, per ADR 0001).

---

## Decisions

### ORM / query layer: Drizzle ORM + drizzle-kit

Drizzle is schema-first and SQL-close. The TypeScript types come directly from the schema definition (no separate codegen step that drifts). drizzle-kit generates SQL migration files that are human-readable and can be reviewed, squashed, or applied manually. Prisma was considered but adds a heavier runtime and a code-gen step that would increase feedback-loop friction for a solo engineer. Raw `pg` was considered but provides no type safety on queries.

### Rationale is its own table (not a column on Project or File)

Three reasons:

1. **Versioning.** Each Rationale row is one version of an entry. The `version` integer increments with each edit; querying history is a simple `ORDER BY version DESC`. Storing versioned text in a column requires a parallel history table anyway — might as well start there.

2. **Polymorphic attachment.** A Rationale can belong to a Project or to a File. Storing a `rationale` column on both tables duplicates the problem; storing it on one table with two nullable FKs and a CHECK constraint is cleaner and avoids JOIN complexity.

3. **Future queryability.** Full-text search, semantic search, export, and audit trails all operate on Rationale rows independently. Having it as a dedicated table with its own PK is necessary for any of those features.

### XOR-parent constraint on Rationale

`rationale_has_one_parent` enforces at the database level that a Rationale belongs to *exactly one* parent (project XOR file). This catches bugs early without relying on application-layer validation.

### Schema shape

| Table       | Key fields                                                                       |
|-------------|----------------------------------------------------------------------------------|
| `users`     | `id`, `email` (unique), `name`, `created_at`                                     |
| `projects`  | `id`, `owner_id → users`, `name`, `description`, `created_at`, `updated_at`      |
| `files`     | `id`, `project_id → projects`, `name`, `mime_type`, `storage_path`, `size_bytes`, `created_at` |
| `rationales`| `id`, `project_id? → projects`, `file_id? → files`, `body`, `version`, `created_by → users`, `created_at` |

`storage_path` on `files` stores the Supabase Storage object key so the row is decoupled from the bucket name and can survive a bucket rename or provider swap.

All timestamps use `TIMESTAMPTZ` (timezone-aware) — structural engineering projects often involve international teams and regulatory submissions where timestamp provenance matters.

### No `updated_at` trigger in v0

`updated_at` on `projects` is set at the application layer for now. A database trigger (via `moddatetime` extension on Supabase) would be cleaner but adds setup steps before we have a confirmed design partner. We will add the trigger when the first real project is created.

---

## Consequences

- Adding a new entity (e.g., `Comment`, `Tag`) is additive — no existing table needs a structural change.
- Drizzle schema is the single source of truth for types; avoid duplicating type definitions elsewhere.
- `DATABASE_URL` must be set in `.env.local` before running migrations. See `.env.example`.
- To apply migrations: `pnpm drizzle-kit migrate` (requires `DATABASE_URL`).
- To generate migrations after schema changes: `pnpm drizzle-kit generate`.
