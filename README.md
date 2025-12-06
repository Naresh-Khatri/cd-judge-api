# CD Judge

A modern web application built with the T3 stack.

## Tech Stack

- **Framework**: Next.js 15
- **Database**: PG with Drizzle ORM
- **Authentication**: Better Auth
- **API**: tRPC
- **UI**: React 19 with Tailwind CSS v4
- **Monorepo**: Turborepo with pnpm

## Getting Started

### Prerequisites

- Node.js ^22.21.0
- pnpm ^10.19.0

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env

# Push the database schema
pnpm db:push

# Generate Better Auth schema
pnpm auth:generate
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run only Next.js app
pnpm dev:next
```

### Available Scripts

- `pnpm build` - Build all apps
- `pnpm dev` - Start development servers
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Type check all packages
- `pnpm db:studio` - Open Drizzle Studio

## Project Structure

```
.
├── apps
│   └── nextjs          # Next.js web application
├── packages
│   ├── api             # tRPC API definitions
│   ├── auth            # Authentication configuration
│   ├── db              # Database schema and client
│   ├── ui              # Shared UI components
│   └── validators      # Shared validation schemas
└── tooling
    ├── eslint          # ESLint configurations
    ├── prettier        # Prettier configuration
    ├── tailwind        # Tailwind CSS configuration
    └── typescript      # TypeScript configurations
```
