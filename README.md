# Truss

Store every structural engineering project's files — plus the **why**.

Rationale, decisions, calculations, and assumptions, captured alongside the files that depend on them.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: PostgreSQL via Supabase
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **CI**: GitHub Actions

See [docs/decisions/0001-stack.md](docs/decisions/0001-stack.md) for the full rationale.

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture decisions

All meaningful technical decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/).

## License

MIT
