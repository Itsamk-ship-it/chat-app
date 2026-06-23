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
