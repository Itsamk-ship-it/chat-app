# Nexlayer — chat-app

<!-- nexlayer:meta version=1 analyzed=2026-06-20T12:12:34Z repo=https://github.com/Itsamk-ship-it/chat-app branch=nexlayer -->

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
A real-time, Slack-like team collaboration platform featuring organizations, channels, direct messaging, and threaded conversations. It utilizes a Node.js backend with Socket.io for live communication and PostgreSQL/Redis for persistence and pub/sub.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Node.js | language | 22 | Dockerfile |
| Express | framework | 4.18.3 | package.json |
| Next.js | framework | 14 | README.md |
| PostgreSQL | database | 16 | README.md |
| Redis | database | 7 | README.md |
| Socket.io | infra | 4.7.4 | package.json |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- backend/ — Express API and Socket.io server logic
- backend/db/ — Postgres pool configuration and schema migrations
- backend/socket/ — Real-time event handlers
- web/ — Next.js frontend application
- web/src/app/ — App Router pages and layouts
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
JWT_SECRET=your-secret-key
```

### Steps

1. `npm install` — Install backend and shared dependencies
2. `npm run init-db` — Initialize the PostgreSQL database schema
3. `npm run dev` — Start the backend server on port 3000
4. `cd web && npm install && npm run dev` — Start the Next.js frontend on port 3001

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
| `postgres` | `POSTGRES_DB` | `chatdb` | plain |
| `postgres` | `POSTGRES_USER` | `user` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `POSTGRES_PASSWORD` (`postgres` pod)

### nexlayer.yaml

```yaml
application:
  name: neat-drift-chat-app
  pods:
    - name: app
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app:19ef4dc9dc8"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
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
| web-frontend | mirror.gcr.io/library/node:22-alpine | 3000 | web |
| backend-api | mirror.gcr.io/library/node:22-alpine | 3000 | web |
| postgres-db | mirror.gcr.io/library/postgres:16-alpine | 5432 | database |
| redis-cache | mirror.gcr.io/library/redis:7-alpine | 6379 | cache |

### Deployment notes

- Backend API communicates with the database via postgres-db.pod:5432
- Backend API communicates with the Redis cache via redis-cache.pod:6379
- Frontend communicates with the Backend API via backend-api.pod:3000
- All images use the mirror.gcr.io/library prefix to comply with Nexlayer rules

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-23T14:29:39Z  
**Live URL:** https://vibrant-wasp-neat-drift-chat-app.cloud.nexlayer.ai  
**Runtime:**  · **Port:** auto-detected  
**Deploy branch:** nexlayer  

```yaml
application:
  name: neat-drift-chat-app
  pods:
    - name: app
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app:19ef4dc9dc8"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
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
| 2026-06-23T14:23:13Z | analyzed | initial repo analysis |
| 2026-06-23T14:29:39Z | success | deployed https://vibrant-wasp-neat-drift-chat-app.cloud.nexlayer.ai |
<!-- nexlayer:end -->


