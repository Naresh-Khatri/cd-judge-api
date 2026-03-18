# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CD Judge?

A secure, multi-language code execution engine and online judge platform. Users submit code via API or a web playground, which is executed in isolated sandboxes (Linux isolate) and returns verdicts (OK, CE, RE, TO, SG, XX).

## Monorepo Structure

pnpm workspaces + Turborepo. Node ^23, pnpm 10.19+.

- `apps/web` — Next.js 15 (React 19) frontend, auth routes, tRPC handler
- `packages/api` — tRPC router definitions (dashboard data fetching)
- `packages/hono-api` — Hono REST API with OpenAPI spec + Scalar docs UI
- `packages/auth` — Better Auth config (GitHub/Google OAuth, Drizzle adapter)
- `packages/db` — Drizzle ORM schema and PostgreSQL client
- `packages/jobs` — BullMQ job queue + IsolateRunner code execution engine
- `packages/validators` — Shared Zod schemas
- `tooling/` — Shared ESLint, Prettier, Tailwind, TypeScript configs

## Common Commands

```bash
# Development
make services          # Start PostgreSQL + Redis via Docker
pnpm dev               # Start all dev servers (turbo watch)
pnpm dev:next          # Start only the web app

# Database
pnpm db:push           # Push Drizzle schema to database
pnpm db:studio         # Open Drizzle Studio

# Quality
pnpm lint              # ESLint all packages
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Check formatting (Prettier)
pnpm format:fix        # Fix formatting
pnpm typecheck         # TypeScript check all packages

# Build
pnpm build             # Build all packages

# Auth
pnpm auth:generate     # Generate Better Auth schema

# Docker
make dev               # Full docker compose dev environment
make down              # Stop containers
make dangerously-clean # Stop containers AND delete volumes
```

## Architecture

### REST API (Hono + OpenAPI)

The REST API lives in `packages/hono-api` and is mounted into Next.js via `apps/web/src/app/api/[[...slugs]]/route.tsx`. It uses `@hono/zod-openapi` (with zod v3) for route definitions that auto-generate an OpenAPI 3.0 spec.

- **OpenAPI spec**: `GET /api/openapi.json`
- **Scalar docs UI**: `GET /api/docs`
- **Health check**: `GET /api/health`

### Request Flow (Code Submission)
1. `POST /api/v1/submissions` with Bearer token → auth middleware (SHA-256 hashed API key or session)
2. Job enqueued to BullMQ (Redis)
3. Worker picks up job → `IsolateRunner` executes code in isolate sandbox
4. `GET /api/v1/submissions/{id}` to poll results

### Key Files
- `packages/hono-api/src/index.ts` — Hono app factory, OpenAPI doc + Scalar UI
- `packages/hono-api/src/middleware/auth.ts` — Bearer token auth (hash + playground bypass)
- `packages/hono-api/src/routes/submissions.ts` — Submit + get result endpoints
- `packages/hono-api/src/routes/jobs.ts` — Alternative jobs endpoints
- `apps/web/src/app/api/[[...slugs]]/route.tsx` — Mounts Hono into Next.js
- `packages/jobs/src/utils/isolate-runner.ts` — Sandbox executor
- `packages/jobs/src/config/languages.ts` — Language configs (Python 3, Node 18, Java 17, C++ 17)
- `packages/db/src/schema/api-keys.ts` — API key schema with usage tracking
- `packages/auth/src/index.ts` — Better Auth setup with oAuthProxy plugin
- `apps/web/src/middleware.ts` — Session protection for `/dashboard/*` routes

### Frontend
Next.js 15 with shadcn/ui (Radix + Tailwind v4). tRPC for data fetching via TanStack React Query. Dashboard pages: playground, API keys, usage charts, performance metrics.

### Auth
Two-tier: standard API key (SHA-256 hash lookup) OR session-based with UUID key ID (for playground). API keys track per-day, per-language usage statistics.

### Zod Versioning
The monorepo uses zod v4 (`catalog: ^4.1.13`). `packages/hono-api` pins zod v3 (`^3.24.0`) because `@hono/zod-openapi` / `@asteasolutions/zod-to-openapi` require it. Use `z` from `@hono/zod-openapi` in that package.

## Environment Variables

Required: `POSTGRES_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_GITHUB_ID`, `BETTER_AUTH_GITHUB_SECRET`, `BETTER_AUTH_GOOGLE_ID`, `BETTER_AUTH_GOOGLE_SECRET`, `BASE_URL`, `PRODUCTION_URL`. See `.env.example`.

## CI

GitHub Actions runs lint, format check, and typecheck on push/PR (`.github/workflows/ci.yml`).

## Isolate Sandbox

Requires Linux kernel 5.19+ with cgroup v2. The isolate tool from ioi/isolate runs submitted code with resource limits (time, memory, process count).
