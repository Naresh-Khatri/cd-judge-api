# CD Judge

**CD Judge** is a secure, multi-language code execution engine and online judge platform featuring a sandboxed runner, interactive playground, and integrated performance analytics.

## Tech Stack

- **Framework**: Next.js 15
- **Database**: PG with Drizzle ORM
- **Authentication**: Better Auth
- **API**: tRPC
- **UI**: React 19 with Tailwind CSS v4
- **Monorepo**: Turborepo with pnpm

## Getting Started

### Prerequisites

- Node.js ^23
- pnpm ^10.19.0

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Setup environment:

   ```bash
   cp .env.example .env
   ```

3. Start required services (Database & Redis):

   ```bash
   make services
   ```

4. Initialize database and auth:
   ```bash
   pnpm db:push
   pnpm auth:generate
   ```

### Development

Run the full stack in development mode:

```bash
pnpm dev
```

Or run only the web application (ensure services are running):

```bash
pnpm dev:next
```

### Available Scripts

- `pnpm build` - Build all apps
- `pnpm dev` - Start development servers
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Type check all packages
- `pnpm db:studio` - Open Drizzle Studio

## API Documentation

The Submissions API allows you to execute code in various programming languages and retrieve results asynchronously.

### Authentication

All requests require a `Bearer` token in the `Authorization` header.

```http
Authorization: Bearer <your_api_key_or_session_token>
```

- **API Key**: Secret key from your dashboard.
- **Session Token**: Internal usage for the playground.

---

### 1. Submit Code for Execution

`POST /api/v1/submissions`

**Request Body:**

| Field  | Type     | Description                                           |
| :----- | :------- | :---------------------------------------------------- |
| `code` | `string` | The source code to be executed.                       |
| `lang` | `string` | The programming language (`py`, `js`, `java`, `cpp`). |

**Example:**

```json
{
  "code": "print('Hello, World!')",
  "lang": "py"
}
```

**Success Response (200 OK):**

```json
{
  "id": "12345"
}
```

---

### 2. Get Execution Status and Result

`GET /api/v1/submissions/[id]`

**Success Response (200 OK):**

Returns the status and output of the job.

- `status`: `waiting`, `active`, `completed`, or `failed`.
- `result`: Execution details (verdict, stdout, stderr, time, memory).

**Example Response:**

```json
{
  "id": "12345",
  "status": "completed",
  "result": {
    "verdict": "OK",
    "stdout": "Hello, World!\n",
    "stderr": "",
    "exitCode": 0,
    "time": 50,
    "memory": 1048576
  }
}
```

## Project Structure

```
.
├── apps
│   └── web             # Next.js web application
├── packages
│   ├── api             # tRPC API definitions
│   ├── auth            # Authentication configuration
│   ├── db              # Database schema and client
│   ├── jobs            # Job queue and logic
│   ├── ui              # Shared UI components
│   ├── validators      # Shared validation schemas
└── tooling
    ├── eslint          # ESLint configurations
    ├── prettier        # Prettier configuration
    ├── tailwind        # Tailwind CSS configuration
    └── typescript      # TypeScript configurations
```
