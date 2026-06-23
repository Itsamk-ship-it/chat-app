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
A real-time team chat application featuring organizations, channels, and direct messaging, built with a Node.js/Express backend, Next.js frontend, and Socket.io for live communication.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Node.js | language | 22 | Dockerfile |
| Express | framework | 4.18.3 | package.json |
| Next.js | framework | 14 | README.md |
| PostgreSQL | database | latest | README.md |
| Redis | infra | latest | README.md |
| Socket.io | infra | 4.7.4 | package.json |
| TypeScript | language | latest | README.md |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- src/ — Backend API (Express + Socket.io logic)
- src/db/ — PostgreSQL pool and schema migrations
- src/socket/ — Socket.io event handlers
- web/src/app/ — Next.js App Router pages
- web/src/store/ — Redux toolkit state management
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
| `web` | `NODE_ENV` | `production` | plain |
| `web` | `PORT` | `"3000"` | plain |
| `web` | `HOSTNAME` | `"0.0.0.0"` | plain |
| `app` | `NODE_ENV` | `production` | plain |
| `app` | `PORT` | `"3001"` | plain |
| `app` | `HOSTNAME` | `"0.0.0.0"` | plain |
| `app` | `ROOT_URL` | `"<% URL %>"` | plain |
| `app` | `JWT_SECRET` | _(set via Nexlayer dashboard)_ | secret |
| `app` | `DATABASE_URL` | `postgresql://user:pass@postgres.pod:5432/chatdb` | plain |
| `app` | `REDIS_URL` | `redis://redis.pod:6379` | plain |
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
    - name: web
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app-web:latest"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
    - name: app
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app:19ef5a7e40f"
      path: /api
      servicePorts:
        - 3001
      vars:
        NODE_ENV: production
        PORT: "3001"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
        JWT_SECRET: "super-secret-jwt-key-change-in-production-please"
        DATABASE_URL: "postgresql://user:pass@postgres.pod:5432/chatdb"
        REDIS_URL: "redis://redis.pod:6379"
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

| Pod | Image | Port | Path | Role |
|-----|-------|------|------|------|
| web | chat-app-web (built from web/Dockerfile.web) | 3000 | `/` | frontend |
| app | chat-app (built from ./Dockerfile) | 3001 | `/api` | backend API |
| postgres | mirror.gcr.io/library/postgres:16-alpine | 5432 | — | database |
| redis | mirror.gcr.io/library/redis:7-alpine | 6379 | — | cache |

### Deployment notes

- Backend reaches Postgres via `postgres.pod:5432` and Redis via `redis.pod:6379`
  (set as `DATABASE_URL` / `REDIS_URL` in nexlayer.yaml).
- Frontend talks to the backend same-origin: `/` → web, `/api` → app. The `/api`
  prefix is preserved when routed to the backend (backend mounts all routes under `/api`).
- Socket.io runs over the same origin at `path: /api/socket.io`.
- Base images use the mirror.gcr.io/library prefix to comply with Nexlayer rules.

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->

### Deploy failure analysis — 2026-06-23 (HTTP 503)

The deployment built and pushed the image successfully but the app URL returned
**HTTP 503**. Root cause was a crash-on-start in the backend container plus a
missing frontend, not a build problem. Three distinct issues were found and fixed:

**1. Wrong CMD in the backend Dockerfile (the actual 503).**
The root `Dockerfile` ended with `CMD ["node", "src/index.js"]`, but there is no
`src/` directory — the entrypoint is `backend/index.js` (`package.json` → `"main":
"backend/index.js"`). Node exited immediately with `Cannot find module
'/app/src/index.js'`, so the pod never served traffic. Fixed to
`CMD ["node", "backend/index.js"]`.

**2. Invalid inter-pod hostnames for Postgres/Redis.**
The Dockerfile injected an `nx-start.sh` script that derived DB/Redis hostnames by
string-slicing `ROOT_URL` into `<...>-postgres-service` / `<...>-redis-service`.
Those are not valid Nexlayer service names. Per `nexlayer.skills`, pod names *are*
the internal DNS hostnames and must be referenced as `<podName>.pod:<port>`. The
script was removed; `DATABASE_URL` and `REDIS_URL` are now set directly in
`nexlayer.yaml`:
- `DATABASE_URL=postgresql://user:pass@postgres.pod:5432/chatdb`
- `REDIS_URL=redis://redis.pod:6379`

**3. No frontend pod, and `JWT_SECRET` missing.**
The deployed `app` pod ran the backend API only — the Next.js frontend in `web/`
(its own `web/Dockerfile.web`) was never built or served, so `/` would 404 even
after the backend booted. Also `JWT_SECRET` (used in `backend/middleware/auth.js`
and `backend/routes/auth.js`) was not provided, so auth would fail. Both fixed.

### Resulting topology

- `web` (Next.js) → path `/`, port **3000**
- `app` (Express + Socket.io) → path `/api`, port **3001**
- `postgres` → 5432, `redis` → 6379

All pods share one public hostname; path routing sends `/` to `web` and `/api` to
`app`. This matches how the frontend is written: `web/src/lib/api.ts` calls
same-origin `/api/*` in production, and `web/src/hooks/useSocket.ts` connects
Socket.io to the same origin with `path: '/api/socket.io'`. The `/api` prefix must
be **preserved** when routing to the backend, since the backend mounts every route
under `/api`.

> Note: the GitHub token used for the previous deploy lacked the `workflow` scope,
> so the CI/CD workflow was not added. Re-deploy with a token that has
> `workflows:write` to enable automatic CI/CD.

<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-23T18:11:23Z  
**Live URL:** https://vibrant-wasp-neat-drift-chat-app.cloud.nexlayer.ai  
**Runtime:**  · **Port:** auto-detected  
**Deploy branch:** nexlayer  

```yaml
application:
  name: neat-drift-chat-app
  pods:
    - name: web
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app-web:latest"
      path: /
      servicePorts:
        - 3000
      vars:
        NODE_ENV: production
        PORT: "3000"
        HOSTNAME: "0.0.0.0"
    - name: app
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/chat-app:19ef5a7e40f"
      path: /api
      servicePorts:
        - 3001
      vars:
        NODE_ENV: production
        PORT: "3001"
        HOSTNAME: "0.0.0.0"
        ROOT_URL: "<% URL %>"
        JWT_SECRET: "super-secret-jwt-key-change-in-production-please"
        DATABASE_URL: "postgresql://user:pass@postgres.pod:5432/chatdb"
        REDIS_URL: "redis://redis.pod:6379"
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
| 2026-06-23T18:05:13Z | analyzed | initial repo analysis |
| 2026-06-23T18:11:23Z | success | deployed https://vibrant-wasp-neat-drift-chat-app.cloud.nexlayer.ai |
<!-- nexlayer:end -->






