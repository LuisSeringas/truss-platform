# ADR 0005 — Rationale capture: data model, format, and versioning

**Date:** 2026-05-21  
**Status:** Accepted  
**Issue:** TRI-9

---

## Context

The defining feature of Truss is attaching the "why" — decisions, calcs, assumptions, references — to every file and project. We need a data model that:

- Lets users write free-form explanatory text on a project or on a specific file.
- Preserves every edit as an immutable revision so the history can never be lost.
- Records who wrote each revision and when.
- Ships fast enough to demo to design partners without introducing heavy dependencies.

---

## Decisions

### 1. Format: Markdown (plain text, not rich text)

**Choice:** store body as plain markdown text; render as pre-formatted text in the UI for now.

**Why not a rich-text editor (Tiptap, Slate, Quill):**
- Adds 50–150 kB of bundle weight.
- Introduces JSON/HTML blob storage, making full-text search and diffs harder.
- Structural engineers are already comfortable with markdown-adjacent syntax (LaTeX, Word, plain text).
- We can layer a proper renderer and editor UI after we know what design partners actually need.

**Upgrade path:** swap the `<pre>` for a `<ReactMarkdown>` component and add an MDEditor; no schema changes needed.

---

### 2. Data model: revision rows with `entry_id`

Every write to a rationale creates a new immutable row. Rows that belong to the same logical entry share an `entry_id` UUID. The current state of an entry is the row with the highest `version` for that `entry_id`.

```
rationales
  id          uuid PK          — unique per revision
  entry_id    uuid NOT NULL     — groups all revisions of the same logical entry
  project_id  uuid FK → projects  (nullable)
  file_id     uuid FK → files     (nullable)
  body        text NOT NULL
  version     integer NOT NULL
  created_by  uuid FK → users
  created_at  timestamptz NOT NULL
  
  CHECK: (project_id IS NOT NULL AND file_id IS NULL) OR
         (project_id IS NULL AND file_id IS NOT NULL)
```

**Why a single table with `entry_id` instead of a separate `rationale_entries` table:**
- One table means simpler joins and no orphan-entry cleanup.
- `entry_id` is lightweight: it's just a UUID on each row.
- Deleting an entry = `DELETE WHERE entry_id = $x`, which atomically removes all revisions.

**Why immutable revision rows instead of UPDATE + history table:**
- No trigger or shadow table needed.
- Any read of a past revision is a simple `WHERE entry_id = $x ORDER BY version DESC`.
- Consistent with how engineers reason about document history (each save is a snapshot).

**Why parent XOR constraint (not both FK nullable):**
- Enforces data integrity at the DB level; application bugs cannot create orphan rationales.
- A rationale attached to a project-level concern and a file-level concern simultaneously would be ambiguous.

---

### 3. Authorization

Access to rationale entries is always through the owning project:

- Project-level entries: `project_id` matches and requesting user owns the project.
- File-level entries: `file_id` matches a file whose `project_id` the user owns.

No sharing or multi-user collaboration in v0 — the project owner is the only actor.

---

### 4. API design

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/projects/:id/rationales` | List latest revisions (project-level) |
| POST   | `/api/projects/:id/rationales` | Create new project-level entry |
| PATCH  | `/api/projects/:id/rationales/:entryId` | Add revision (edit) |
| DELETE | `/api/projects/:id/rationales/:entryId` | Delete entry + all revisions |
| GET    | `/api/projects/:id/rationales/:entryId/history` | List all revisions |
| GET    | `/api/projects/:id/files/:fileId/rationales` | List latest (file-level) |
| POST   | `/api/projects/:id/files/:fileId/rationales` | Create new file-level entry |
| PATCH  | `/api/projects/:id/files/:fileId/rationales/:entryId` | Add revision |
| DELETE | `/api/projects/:id/files/:fileId/rationales/:entryId` | Delete entry |
| GET    | `/api/projects/:id/files/:fileId/rationales/:entryId/history` | All revisions |

PATCH was chosen over PUT because each call appends a revision rather than replacing the resource; the resource (the entry) gains a new revision on each PATCH.

---

## Migration

Migration `0002_common_morbius.sql` adds `entry_id uuid DEFAULT gen_random_uuid() NOT NULL` to `rationales`. The `DEFAULT` covers any pre-existing rows; production data is not expected at time of migration (v0).
