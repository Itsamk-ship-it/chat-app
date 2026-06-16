# Nexlayer — chat-app

<!-- nexlayer:meta version=1 analyzed=2026-06-16T12:45:50Z repo=https://github.com/Itsamk-ship-it/chat-app branch=main -->

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
A real-time, Slack-like team collaboration application featuring organizations, channels, and direct messaging. It utilizes a Node.js/Express backend with Socket.io for real-time communication, PostgreSQL for persistence, and Redis for pub/sub fan-out.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Next.js | framework | 14 | README.md |
| Node.js | language | 18+ | README.md, package.json |
| Express | framework | 4.18.3 | package.json |
| PostgreSQL | database | Not specified | README.md, package.json |
| Redis | database | Not specified | README.md, package.json |
| Socket.io | infra | 4.7.4 | package.json |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- src/ — Backend API (Express + Socket.io)
- src/db/ — Postgres pool, schema, and bootstrap/migrations
- src/redis/ — Redis pub/sub client logic
- src/routes/ — REST endpoints for auth, orgs, and messages
- src/socket/ — Real-time event handlers
- web/src/app/ — Next.js 14 App Router pages
- web/src/components/ — React UI components
- web/src/store/ — Redux Toolkit state management
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
DATABASE_URL=postgresql://user:pass@localhost:5432/chatdb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
```

### Steps

1. `npm install` — Install backend dependencies
2. `npm run init-db` — Initialize the PostgreSQL database schema
3. `npm run dev` — Start the backend server
4. `cd web && npm install && npm run dev` — Start the Next.js frontend

<!-- nexlayer:end -->

## Nexlayer Setup
<!-- nexlayer:section agent-managed=nexlayer_setup -->
### Pod Environment Variables

| Pod | Variable | Value | Kind |
|-----|----------|-------|------|
| `app` | `NODE_ENV` | `production` | plain |
| `app` | `PORT` | `"3000"` | plain |
| `app` | `HOSTNAME` | `"0.0.0.0"` | plain |
| `postgres` | `POSTGRES_DB` | `chatdb` | plain |
| `postgres` | `POSTGRES_USER` | `user` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |

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
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_DB: chatdb
        POSTGRES_USER: user
        POSTGRES_PASSWORD: pass
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
| web | mirror.gcr.io/library/node:22-alpine | 3000 | web |
| api | mirror.gcr.io/library/node:22-alpine | 4000 | web |
| db | mirror.gcr.io/library/postgres:16-alpine | 5432 | database |
| redis | mirror.gcr.io/library/redis:7-alpine | 6379 | cache |

### Inter-pod environment variables

- `web` pod: `NEXT_PUBLIC_API_URL=http://${api:4000}`
- `api` pod: `DATABASE_URL=postgresql://user:pass@${db:5432}/chatdb`
- `api` pod: `REDIS_URL=redis://${redis:6379}`

### Deployment notes

- API connects to Database via ${db:5432}
- API connects to Redis via ${redis:6379}
- Frontend connects to API via ${api:4000}
- Redis is used specifically for Socket.io pub/sub fan-out across possible multiple API instances

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-16T12:58:46Z  
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
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_DB: chatdb
        POSTGRES_USER: user
        POSTGRES_PASSWORD: pass
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
| 2026-06-16T12:45:50Z | analyzed | initial repo analysis |
| 2026-06-16T12:58:46Z | success | deployed https://vibrant-wasp-warm-jade-chat-app.cloud.nexlayer.ai |
<!-- nexlayer:end -->
