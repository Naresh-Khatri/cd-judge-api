# CD Judge

A free, open-source code execution engine and online judge platform. Run code securely across 10 programming languages in isolated Linux sandboxes with 10x Judge0 limits.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **API**: Hono REST API with OpenAPI spec + tRPC for dashboard
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: BullMQ (Redis)
- **Auth**: Better Auth (GitHub/Google OAuth)
- **Sandbox**: Linux isolate (cgroup v2)
- **Monorepo**: Turborepo + pnpm workspaces

## Supported Languages

Python 3, Node.js, TypeScript, Java 17, C++ 17, C, Rust, Go, Ruby, PHP

## Quick Start

### Prerequisites

- Node.js ^23, pnpm ^10.19
- Docker (for PostgreSQL, Redis, and the worker container)
- Linux with cgroup v2 (for the worker/sandbox)

### Setup

```bash
pnpm install
cp .env.example .env
```

### Local Development

Start services (db + redis) and the worker container, then run the web app on the host:

```bash
make services          # Start PostgreSQL + Redis
make worker            # Start worker container (isolate sandbox)
pnpm db:push           # Push schema to database (first time only)
pnpm dev               # Start Next.js dev server
```

The app runs at `http://localhost:3000` with the API at `/api`.

### Production

```bash
make services          # Start PostgreSQL + Redis
make worker            # Start worker container
make web               # Build & start Next.js in production container
```

Or start everything at once:

```bash
make prod              # Start all containers (services + worker + web)
```

## Make Commands

| Command | Description |
|---------|-------------|
| `make services` | Start db + redis containers |
| `make worker` | Start worker container |
| `make web` | Build & start web app container (production) |
| `make prod` | Start everything (services + worker + web) |
| `make dev` | Start all in Docker (turbo dev + worker) |
| `make down` | Stop all containers |
| `make logs` | Follow all container logs |
| `make logs-worker` | Follow worker logs |
| `make logs-web` | Follow web app logs |
| `make rebuild-worker` | Rebuild worker image from scratch |
| `make rebuild-web` | Rebuild web image from scratch |
| `make clean` | Stop containers (preserves data) |
| `make dangerously-clean` | Stop containers AND delete all data |

## pnpm Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers (turbo watch) |
| `pnpm dev:next` | Start only the web app |
| `pnpm build` | Build all packages |
| `pnpm lint` | ESLint all packages |
| `pnpm format` | Check formatting (Prettier) |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## API

Interactive API docs are available at `/api/docs` (Scalar UI). OpenAPI spec at `/api/openapi.json`.

### Submit Code

```bash
curl -X POST https://your-host/api/v1/submissions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lang": "py", "code": "print(42)"}'
```

Returns `{"id": "123"}`. Poll for results:

```bash
curl https://your-host/api/v1/submissions/123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Response

```json
{
  "id": "123",
  "status": "completed",
  "result": {
    "verdict": "OK",
    "stdout": "42\n",
    "stderr": "",
    "time": 45,
    "memory": 8192,
    "exitCode": 0
  }
}
```

### Verdicts

| Verdict | Meaning |
|---------|---------|
| `OK` | Successful execution |
| `CE` | Compilation error |
| `RE` | Runtime error |
| `TO` | Time limit exceeded |
| `SG` | Signal (segfault, etc.) |
| `XX` | Internal error |

## Project Structure

```
├── apps/web              # Next.js frontend + API mount
├── packages/
│   ├── hono-api          # Hono REST API (OpenAPI + Scalar docs)
│   ├── jobs              # BullMQ worker + IsolateRunner sandbox
│   ├── db                # Drizzle ORM schema + PostgreSQL client
│   ├── auth              # Better Auth (GitHub/Google OAuth)
│   └── validators        # Shared Zod schemas
└── tooling/              # Shared ESLint, Prettier, Tailwind, TS configs
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `POSTGRES_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `BASE_URL` — App URL (e.g. `http://localhost:3000`)
- `BETTER_AUTH_SECRET` — Auth secret key
- `BETTER_AUTH_GITHUB_ID/SECRET` — GitHub OAuth credentials
- `BETTER_AUTH_GOOGLE_ID/SECRET` — Google OAuth credentials

## License

MIT
