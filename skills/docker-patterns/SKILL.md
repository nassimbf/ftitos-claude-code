---
name: docker-patterns
description: Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
origin: ECC
---

# Docker Patterns

Docker and Docker Compose best practices for containerized development.

## When to Activate

- Setting up Docker Compose for local development
- Designing multi-container architectures
- Troubleshooting container networking or volume issues
- Reviewing Dockerfiles for security and size

## Docker Compose for Local Development

### Standard Web App Stack

```yaml
services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Multi-Stage Dockerfile

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

## Networking

### Custom Networks

```yaml
services:
  frontend:
    networks: [frontend-net]
  api:
    networks: [frontend-net, backend-net]
  db:
    networks: [backend-net]    # Only reachable from api

networks:
  frontend-net:
  backend-net:
```

## Container Security

```dockerfile
# Use specific tags (never :latest)
FROM node:22.12-alpine3.20

# Run as non-root
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app
```

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    cap_drop:
      - ALL
    env_file:
      - .env    # Never commit .env to git
```

## .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.log
```

## Debugging

```bash
docker compose logs -f app              # Follow app logs
docker compose exec app sh              # Shell into app
docker compose exec db psql -U postgres # Connect to postgres
docker compose ps                       # Running services
docker compose up --build               # Rebuild images
docker compose down                     # Stop and remove
docker compose down -v                  # Also remove volumes
```

## Anti-Patterns

- Using docker compose in production without orchestration
- Storing data in containers without volumes
- Running as root
- Using `:latest` tag
- One giant container with all services
- Putting secrets in docker-compose.yml or Dockerfile
