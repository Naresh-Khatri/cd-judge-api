# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Local development (run web with pnpm dev separately):"
	@echo "    make services           - Start db + redis containers"
	@echo "    make worker             - Start worker container"
	@echo ""
	@echo "  Production:"
	@echo "    make web                - Build & start web app container"
	@echo "    make prod               - Start everything (services + worker + web)"
	@echo ""
	@echo "  Docker-based development (all in containers):"
	@echo "    make dev                - Start turbo dev + worker in containers"
	@echo ""
	@echo "  Management:"
	@echo "    make down               - Stop all containers"
	@echo "    make logs               - Follow all container logs"
	@echo "    make logs-worker        - Follow worker logs"
	@echo "    make logs-web           - Follow web app logs"
	@echo "    make rebuild-worker     - Rebuild worker image from scratch"
	@echo "    make rebuild-web        - Rebuild web image from scratch"
	@echo "    make clean              - Stop containers (preserves data)"
	@echo "    make dangerously-clean  - Stop containers AND DELETE ALL DATA"

# ─── Local development ───────────────────────────────────────────────────────
# Run services + worker in Docker, then run `pnpm dev` on the host.

services:
	docker compose -f docker-compose.base.yml up -d db redis

worker:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d worker

# ─── Production ──────────────────────────────────────────────────────────────
# Assumes services + worker are already running.

web:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build app

prod:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build

# ─── Docker-based development ────────────────────────────────────────────────

dev:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# ─── Rebuild ─────────────────────────────────────────────────────────────────

rebuild-worker:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml build --no-cache worker
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d worker

rebuild-web:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml build --no-cache app
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d app

# ─── Management ──────────────────────────────────────────────────────────────

down:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml down --remove-orphans

logs:
	docker compose logs -f

logs-worker:
	docker compose logs -f worker

logs-web:
	docker compose logs -f app

clean:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

dangerously-clean:
	@echo "WARNING: This will delete all database and redis data. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v --remove-orphans
