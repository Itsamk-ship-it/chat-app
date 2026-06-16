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

### 503 root-cause analysis (2026-06-16, branch `nexlayer`, PR #1)

**Symptom:** Image builds and pushes fine, but the app never answers — `app not responding
after 2m (HTTP 503)`. A 503 here means **nothing is listening on port 3000**, i.e. the Node
process crashed during startup. It is *not* a build, bcrypt, or routing problem.

**Why it crashes — primary cause: the app exits before it ever binds the port.**

In [src/index.js:57-73](src/index.js#L57-L73) `start()` does `await bootstrapDatabase()`
*before* `server.listen()`. `bootstrapDatabase()` ([src/db/bootstrap.js:63-83](src/db/bootstrap.js#L63-L83))
calls `waitForDatabase()`, which retries `SELECT 1` 60× at 2s = **up to 120s**, then **throws**.
The top-level `.catch` then calls `process.exit(1)`. So any DB connection problem =
no listener on :3000 = connection refused = 503. The 4–5 min of "app starting…" is the
retry window plus restarts.

**Why the DB connection fails — the `DATABASE_URL` the container uses is wrong:**

1. **No credentials.** The `/nx-start.sh` hack in the [Dockerfile](Dockerfile#L22-L30) builds
   `postgresql://<derived>-postgres-service:5432/chatdb` with **no user/password**. The
   `postgres` pod runs with `POSTGRES_USER=user` / `POSTGRES_PASSWORD=pass`, so it requires
   auth → `password authentication failed` → bootstrap throws → crash.
2. **Guessed hostname.** The script strips `ROOT_URL` and does `cut -d- -f3-` to guess the
   namespace, then appends `-postgres-service`. This assumes the prefix is exactly two
   hyphenated words and that the service is named `<ns>-postgres-service`. Both are guesses
   that almost certainly don't match the real in-cluster DNS name.
3. **Depends on `ROOT_URL` existing.** If `ROOT_URL` is unset at runtime, the script exports
   nothing, and dotenv then falls back to the **committed `.env`** (`postgresql://localhost/chatapp`),
   which points at localhost → no Postgres in the pod → same crash.
4. The whole shell hack fights the platform. Nexlayer's own rule (see `nexlayer.skills:44-49`,
   `76`, `93`) is to reference pods with `${podName:port}` directly in `nexlayer.yaml vars`.

**Contributing / secondary issues:**

- **`.env` is baked into the image.** It is *not* in [.dockerignore](.dockerignore), so `COPY . .`
  ships `DATABASE_URL=postgresql://localhost/chatapp`, `REDIS_URL=redis://localhost:6379`, and a
  hardcoded `JWT_SECRET`. This is both a wrong-config footgun and a secret leak.
- **No `GET /` route.** `nexlayer.yaml` sets `path: /`, but Express only serves `/api/*` and
  `/health` ([src/index.js:33-51](src/index.js#L33-L51)). Even a fully healthy app returns 404 at
  root. Point the health path at `/health` or add a root route.
- **`HOSTNAME=0.0.0.0` is a no-op here.** The code calls `server.listen(PORT)` with no host
  ([src/index.js:61](src/index.js#L61)); Node already binds 0.0.0.0 by default. `HOSTNAME` only
  matters for Next.js, not this Express server. Not harmful, just ineffective.
- **bcrypt is a red herring.** Builder and runtime use the same `node:22-alpine` base, so the
  copied native binary is ABI-compatible. The multi-stage change didn't fix the real problem.

**Recommended fix (do this instead of the nx-start.sh hack):**

1. Delete `/nx-start.sh` and the `ENTRYPOINT`; let `CMD ["node","src/index.js"]` run directly.
2. Set connection strings in `nexlayer.yaml` `app` pod `vars` using documented interpolation,
   **with credentials matching the postgres pod**:
   ```yaml
   vars:
     NODE_ENV: production
     PORT: "3000"
     DATABASE_URL: "postgresql://user:pass@${postgres:5432}/chatdb"
     REDIS_URL: "redis://${redis:6379}"
     JWT_SECRET: "<set as a secret in the Nexlayer dashboard, not here>"
   ```
   (Move `JWT_SECRET` and the real Postgres password to dashboard secrets per the rules above.)
3. Add `.env` to `.dockerignore` so the localhost config and committed secret never ship.
4. Make startup resilient so a slow/absent DB doesn't 503 the whole app — either:
   - call `server.listen(PORT)` **first**, then run `bootstrapDatabase()` in the background, or
   - keep the order but ensure DB vars are correct (above) so `waitForDatabase` succeeds.
5. Either set the health path to `/health` in `nexlayer.yaml`, or add `app.get('/', ...)`.

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
