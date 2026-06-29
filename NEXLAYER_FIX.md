# Nexlayer Deploy Fix — chat-app

> Kept separate from `NEXLAYER.md` (which the Nexlayer bot regenerates) so this
> analysis isn't overwritten.

## Deploy failure analysis — 2026-06-23 (HTTP 503)

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

## Resulting topology

- `web` (Next.js) → path `/`, port **3000**
- `app` (Express + Socket.io) → path `/api`, port **3001**
- `postgres` → 5432, `redis` → 6379

All pods share one public hostname; path routing sends `/` to `web` and `/api` to
`app`. This matches how the frontend is written: `web/src/lib/api.ts` calls
same-origin `/api/*` in production, and `web/src/hooks/useSocket.ts` connects
Socket.io to the same origin with `path: '/api/socket.io'`. The `/api` prefix must
be **preserved** when routing to the backend, since the backend mounts every route
under `/api`.

## Deploy checklist

- **Rebuild images from source** — don't reuse the existing `chat-app:*` tags. They
  were built from the old broken Dockerfile (`CMD ["node", "src/index.js"]`) and
  will 503 again. The `web` pod also needs a first-time build from `web/Dockerfile.web`.
- The GitHub token used for the previous deploy lacked the `workflow` scope, so the
  CI/CD workflow was not added. Re-deploy with a token that has `workflows:write` to
  enable automatic CI/CD.
- The Nexlayer bot has overwritten the `nexlayer` branch before — if it reverts
  these fixes, this file documents what needs to be re-applied.

## Recurrence — 2026-06-29 (HTTP 502)

As predicted in the checklist above, the Nexlayer bot regenerated the deploy
config and **reverted every fix** from 2026-06-23. The live URL
(`https://vibrant-wasp-neat-drift-chat-app.cloud.nexlayer.ai`) returned **HTTP
502** on both `/` and `/api/` — a gateway error because the `app` pod was
crash-looping, so there was no healthy upstream to route to. (503 last time vs.
502 now is just the gateway distinguishing "pod up but erroring" from "no pod to
route to"; the root cause is the same backend crash-on-start.)

What the bot reverted to, and what was re-applied:

**1. `Dockerfile` — back to `CMD ["node", "src/index.js"]`.**
There is no `src/` (entrypoint is `backend/index.js`, per `package.json` →
`"main"`). Node exits with `Cannot find module '/app/src/index.js'` before
binding a port → crash loop → 502. The bot also re-injected the `nx-start.sh`
script that derives invalid `<...>-postgres-service` / `<...>-redis-service`
hostnames. Re-applied the proven Dockerfile: no entrypoint script, `EXPOSE 3001`,
`CMD ["node", "backend/index.js"]`.

**2. `nexlayer.yaml` — back to a single `app` pod on `/` : 3000, no DB/Redis/JWT envs.**
Even past the CMD crash, `start()` calls `bootstrapDatabase()` immediately; with
no `DATABASE_URL` / `REDIS_URL` set, the connection fails and the catch does
`process.exit(1)` — another crash-loop path. `JWT_SECRET` was also missing
(`backend/routes/auth.js`, `backend/middleware/auth.js`), and the `web` frontend
pod was gone so `/` had nothing to serve. Re-applied the four-pod topology with
`DATABASE_URL`/`REDIS_URL` via `postgres.pod:5432` / `redis.pod:6379` and an
explicit `JWT_SECRET`.

**Restored topology** is the same as documented above: `web` (`/`, 3000),
`app` (`/api`, 3001), `postgres` (5432), `redis` (6379).

### Standing recommendation

This is now the **second** time the bot has wiped these fixes. The durable
remedies (any one breaks the loop):
- Set the deploy secrets (`JWT_SECRET`, DB creds) in the **Nexlayer dashboard**
  rather than in `nexlayer.yaml`, so a regenerated YAML still inherits them.
- Pin the `Dockerfile` CMD / topology so the bot's regeneration is a no-op, or
  stop the bot from force-pushing the `nexlayer` branch.
- Treat `NEXLAYER_FIX.md` as the source of truth: after any `[nexlayer-bot]`
  commit, diff `Dockerfile` + `nexlayer.yaml` against the snippets here and
  re-apply if they drifted.
