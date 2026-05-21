# ADR 0004: File Storage

**Date:** 2026-05-21
**Status:** Accepted
**Decider:** FoundingEngineer

---

## Context

TRI-8 requires authenticated users to upload files to a project, see them listed, and download them. Structural engineering projects contain large files: PDFs, CAD drawings (DWG, IFC), calculation sheets, and images. Files must persist across deploys and be access-controlled per user.

Three storage options were on the table:

| Option | Pro | Con |
|---|---|---|
| **Supabase Storage** | Already in the stack; same dashboard; no extra account; S3-compatible | 1 GB free tier; smaller ecosystem than AWS |
| **Cloudflare R2** | Zero egress fees; S3-compatible | Separate account; extra auth setup for v0 |
| **AWS S3** | Mature; largest ecosystem | Egress costs; separate AWS account; most config |

---

## Decision

**Supabase Storage** with server-generated signed upload URLs, 100 MB cap, opaque file types.

### Why Supabase Storage

We already use Supabase for PostgreSQL (ADR 0001). Same dashboard, same set of credentials, no extra account. For v0 with a handful of design partners, 1 GB storage / 2 GB bandwidth per month is sufficient. Migrating to R2 or S3 later means changing the `lib/storage.ts` implementation and updating two env vars — no schema or API changes.

### Upload flow (direct-to-storage)

1. Browser POSTs `{ name, mimeType, sizeBytes }` to `POST /api/projects/[id]/files`
2. Server validates auth + project ownership + `sizeBytes ≤ 100 MB`
3. Server pre-generates a UUID for `fileId` and constructs path `{projectId}/{fileId}/{filename}`
4. Server creates the DB record in `files` table (pre-committed so the record exists before upload)
5. Server calls `supabase.storage.from('project-files').createSignedUploadUrl(path)` and returns the signed URL
6. Browser PUTs the file body directly to Supabase Storage (no bytes proxied through our API)
7. Browser calls `router.refresh()` — file already in DB, updated list appears immediately

### Download flow

`GET /api/projects/[id]/files/[fileId]/download` validates auth, generates a 1-hour Supabase Storage signed URL, and 302-redirects the browser to it. Files are private; the redirect keeps them that way while avoiding any proxy bandwidth cost.

### File size cap: 100 MB

Structural engineering CAD files are typically well under 100 MB. Validated server-side (rejects 413) and client-side (fails fast before any network call). The constant lives in `lib/storage.ts` and the client-side duplicate in `file-uploader.tsx` — raise both to increase the cap.

### Accepted file types

All types treated as opaque blobs. `mimeType` stored for informational use; no server-side MIME validation for v0. PDFs, DWG, IFC, images all work.

---

## Hosting migration: GitHub Pages → Vercel

ADR 0001 deferred server-side features until the first design partner arrived. TRI-7 (auth) and TRI-8 (file upload) both require a Node.js runtime. This commit removes `output: "export"` from `next.config.ts`, ending the static-export phase. **Vercel free tier** is the new hosting target: first-class Next.js support, zero-ops deploys, preview URLs per PR.

---

## Setup required in Supabase dashboard

1. Storage → New Bucket → name: `project-files`, public: off
2. No RLS policies needed — access is controlled entirely by our server (service role key bypasses RLS)

---

## Consequences

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` required in env (see `.env.example`). Service role key is server-only — never set as `NEXT_PUBLIC_`.
- DB record is written before the upload completes. If the browser navigates away mid-upload, a stale DB record with no corresponding storage object exists. Acceptable for v0; a cleanup job can reconcile if needed.
- Storage path includes UUID (`{projectId}/{fileId}/{filename}`) so renames in DB don't break storage references.
- Supabase free tier: 1 GB storage, 2 GB egress/month. Upgrade or migrate to R2/S3 when usage exceeds this.
