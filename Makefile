# Default target
help:
	@echo "Available commands:"
	@echo "  make dev                - Start development environment (turbo + worker)"
	@echo "  make prod               - Start production environment"
	@echo "  make services           - Start ONLY dependencies (db, redis) for local dev"
	@echo "  make worker             - Start ONLY worker container (+ dependencies)"
	@echo "  make down               - Stop all containers"
	@echo "  make logs               - Follow container logs"
	@echo "  make logs-worker        - Follow worker container logs"
	@echo "  make clean              - Stop containers (preserves data)"
	@echo "  make dangerously-clean  - Stop containers AND DELETE ALL DATA"
	@echo "  make rebuild-worker     - Rebuild worker image from scratch"

dev:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

prod:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build

services:
	docker compose -f docker-compose.base.yml up -d db redis

worker:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d worker

rebuild-worker:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml build --no-cache worker
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d worker

down:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml down --remove-orphans

logs:
	docker compose logs -f

logs-worker:
	docker compose logs -f worker

clean:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

dangerously-clean:
	@echo "WARNING: This will delete all database and redis data. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v --remove-orphans
