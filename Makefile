# Default target
help:
	@echo "Available commands:"
	@echo "  make dev                - Start development environment"
	@echo "  make prod               - Start production environment"
	@echo "  make services           - Start ONLY dependencies (db, redis) for local dev"
	@echo "  make down               - Stop all containers"
	@echo "  make logs               - Follow container logs"
	@echo "  make clean              - Stop containers (preserves data)"
	@echo "  make dangerously-clean  - Stop containers AND DELETE ALL DATA"

dev:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

prod:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build


services:
	docker compose -f docker-compose.base.yml up -d

down:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml down --remove-orphans

logs:
	docker compose logs -f

clean:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

dangerously-clean:
	@echo "WARNING: This will delete all database and redis data. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v --remove-orphans
