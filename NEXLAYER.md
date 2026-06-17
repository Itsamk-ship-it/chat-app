# Nexlayer — chat-app

<!-- nexlayer:meta version=1 analyzed=2026-06-17T12:44:44Z repo=https://github.com/Itsamk-ship-it/chat-app branch=main -->

> **For AI agents (Claude Code, Cursor, Gemini CLI, Copilot):**
> This file is the **project context** for this Nexlayer deployment — tech stack, env vars, secrets, live URL.
> For full platform detail (nexlayer.yaml schema, Dockerfile rules, CI/CD, task recipes) read **`nexlayer.skills`** in this repo.
>
> **Critical rules (full detail in `nexlayer.skills`):**
> - Inter-pod refs: `${podName:port}` only — never `localhost` or bare hostnames
> - Docker Hub images: prefix with `mirror.gcr.io/library/` — bare tags fail on the cluster
> - Secrets: set in the Nexlayer dashboard — never commit to `nexlayer.yaml` or Dockerfile
>
> **This file:** `agent-managed` sections update automatically. `user-editable` sections (Local Development Setup, Nexlayer Deployment Plan, Build Notes) are yours — preserved across re-analysis.

## Project Summary
<!-- nexlayer:section agent-managed=project_summary -->
A real-time Slack-like team chat application featuring organizations, channels, direct messages, and threads. It utilizes a Node.js/Express backend with Socket.io for real-time communication and Redis for pub/sub fan-out.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Node.js | language | 20 | Dockerfile |
| Express | framework | 4.18.3 | package.json |
| Next.js | framework | 14 | README.md |
| PostgreSQL | database | latest | package.json, README.md |
| Redis | database | latest | package.json, README.md |
| Socket.io | infra | 4.7.4 | package.json |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- src/ — Backend API (Express + Socket.io)
- src/db/ — Postgres pool, schema, and migrations
- src/socket/ — Socket.io event handlers
- web/ — Next.js frontend application
- web/src/app/ — Next.js App Router pages
<!-- nexlayer:end -->

## External Services Required
<!-- nexlayer:section agent-managed=external_deps -->
_No external services detected._
<!-- nexlayer:end -->

## Local Development Setup
<!-- nexlayer:section user-editable=local_setup -->
### Prerequisites

- Node.js >= 18
- PostgreSQL
- Redis

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatdb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
```

### Steps

1. `npm install` — Install backend dependencies
2. `npm run init-db` — Initialize database schema
3. `npm run dev` — Start backend server on http://localhost:3000
4. `cd web && npm install && npm run dev` — Start Next.js frontend

<!-- nexlayer:end -->

## Nexlayer Setup
<!-- nexlayer:section agent-managed=nexlayer_setup -->
### Pod Environment Variables

| Pod | Variable | Value | Kind |
|-----|----------|-------|------|
| `app` | `NODE_ENV` | `production` | plain |
| `app` | `PORT` | `"3000"` | plain |
| `app` | `HOSTNAME` | `"0.0.0.0"` | plain |
| `app` | `ROOT_URL` | `"<% URL %>"` | plain |
| `app` | `DATABASE_URL` | `"postgresql://postgres:password@${postgres:5432}/chatdb"` | inter-pod |
| `app` | `REDIS_URL` | `"redis://${redis:6379}"` | inter-pod |
| `postgres` | `POSTGRES_USER` | `"postgres"` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `postgres` | `POSTGRES_DB` | `"chatdb"` | plain |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `POSTGRES_PASSWORD` (`postgres` pod)

### nexlayer.yaml

```yaml
application:
  name: warm-jade-chat-app
  pods:
    - name: app
      image: "# filled by pipeline"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
        DATABASE_URL: "postgresql://postgres:password@${postgres:5432}/chatdb"
        REDIS_URL: "redis://${redis:6379}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: "postgres"
        POSTGRES_PASSWORD: "password"
        POSTGRES_DB: "chatdb"
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
```

<!-- nexlayer:end -->

## Nexlayer Deployment Plan
<!-- nexlayer:section user-editable=deployment_plan -->
### Pod Topology

| Pod | Image | Port | Role |
|-----|-------|------|------|
| api | mirror.gcr.io/library/node:20-alpine | 3000 | web |
| web | mirror.gcr.io/library/node:20-alpine | 3001 | web |
| postgres-db | mirror.gcr.io/library/postgres:16-alpine | 5432 | database |
| redis-cache | mirror.gcr.io/library/redis:7-alpine | 6379 | cache |

### Inter-pod environment variables

- `api` pod: `DATABASE_URL=${postgres-db:5432}`
- `api` pod: `REDIS_URL=${redis-cache:6379}`
- `web` pod: `NEXT_PUBLIC_API_URL=http://${api:3000}`

### Deployment notes

- Backend pod 'api' communicates with 'postgres-db' and 'redis-cache' using Nexlayer ${podName:port} syntax
- Separate pods used for DB and Cache per Nexlayer Rule 4
- Frontend 'web' is decoupled into its own pod to follow the one-service-per-pod rule

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-17T12:45:51Z  
**Live URL:** https://vibrant-wasp-warm-jade-chat-app.cloud.nexlayer.ai  
**Runtime:** node · **Port:** 3000  
**Deploy branch:** main  

```yaml
application:
  name: warm-jade-chat-app
  pods:
    - name: app
      image: "# filled by pipeline"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
        DATABASE_URL: "postgresql://postgres:password@${postgres:5432}/chatdb"
        REDIS_URL: "redis://${redis:6379}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: "postgres"
        POSTGRES_PASSWORD: "password"
        POSTGRES_DB: "chatdb"
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-06-17T12:44:44Z | analyzed | initial repo analysis |
| 2026-06-17T12:45:51Z | success | deployed https://vibrant-wasp-warm-jade-chat-app.cloud.nexlayer.ai |
<!-- nexlayer:end -->
