# ChatApp

A real-time, Slack-like team chat application. Organizations, channels, direct messages, threads, drafts, starred items, and full-text search — powered by a Node.js/Express API, Socket.io, PostgreSQL, and Redis, with a Next.js frontend.

## Features

- **Organizations & invites** — create workspaces, invite by username or shareable join link
- **Channels** — public/private channels with membership management
- **Direct messages** — 1:1 and group DMs, with edit/delete
- **Threads** — reply to any message in a threaded view
- **Drafts** — per-channel message drafts, persisted server-side
- **Starred items** — bookmark messages, channels, or people
- **Search** — across messages, channels, and users
- **Real-time** — live message delivery, presence/status, and typing via Socket.io (Redis pub/sub fan-out)
- **Auth** — JWT-based authentication with bcrypt password hashing

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js, Express, Socket.io |
| Database   | PostgreSQL (`pg`) |
| Cache / PubSub | Redis (`ioredis`) |
| Auth       | JWT (`jsonwebtoken`), `bcrypt` |
| Frontend   | Next.js 14, React 18, TypeScript |
| State      | Redux Toolkit |
| Styling    | Tailwind CSS |

## Project Structure

```
.
├── src/                  # Backend API
│   ├── index.js          # Express + Socket.io entry point
│   ├── db/               # Postgres pool, schema, bootstrap/migrate
│   ├── redis/            # Redis pub/sub client
│   ├── middleware/       # Auth (HTTP + socket)
│   ├── routes/           # REST endpoints (auth, orgs, channels, dms, …)
│   └── socket/           # Socket.io handlers
└── web/                  # Next.js frontend
    └── src/
        ├── app/          # App Router pages
        ├── components/   # UI + modals
        ├── store/        # Redux slices, thunks
        ├── hooks/        # useSocket, etc.
        └── lib/          # API client, types, utils
```

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

## Getting Started

### 1. Backend

```bash
# from the repo root
npm install
```

Create a `.env` file in the repo root:

```env
DATABASE_URL=postgres://user:password@localhost:5432/chatapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
PORT=3001
```

Start the API (the database schema is bootstrapped automatically on boot):

```bash
npm run dev     # with nodemon
# or
npm start
```

The API runs on `http://localhost:3001`. Health check: `GET /health`.

### 2. Frontend

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Run it:

```bash
npm run dev     # http://localhost:3000
```

## API Overview

All routes are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Resource   | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/register`, `POST /auth/login` |
| Orgs       | `POST /orgs`, `GET /orgs`, `GET /orgs/:id/members`, `POST /orgs/:id/invite/username`, `POST /orgs/:id/invite/link`, `POST /orgs/join/:code` |
| Channels   | `GET/POST /orgs/:id/channels`, `PATCH/DELETE /orgs/:id/channels/:channelId`, channel member management |
| DMs        | `GET /dms/org/:orgId`, `POST /dms/start`, `GET/POST /dms/:dmId/messages`, `PATCH/DELETE /dms/messages/:messageId` |
| Messages   | `PATCH /messages/:messageId`, `DELETE /messages/:messageId` |
| Threads    | `GET /threads/:messageId`, `GET /threads/user/all`, `POST /threads/:messageId/reply` |
| Drafts     | `GET /drafts/org/:orgId`, `GET /drafts/channel/:channelId`, `POST /drafts`, `DELETE /drafts/:draftId` |
| Starred    | `GET /starred/org/:orgId`, `POST /starred`, `DELETE /starred/:itemType/:itemId`, `GET /starred/check/:itemType/:itemId` |
| Search     | `GET /search`, `GET /search/channels`, `GET /search/users` |

Real-time events are served over Socket.io at the `/api/socket.io` path.

## Docker

Dockerfiles are provided for both services:

- `Dockerfile.api` — backend API
- `web/Dockerfile.web` — frontend

Build and run them individually, or wire them up with your own `docker-compose` alongside PostgreSQL and Redis.

## Available Scripts

**Backend** (repo root)

| Script | Description |
|--------|-------------|
| `npm start` | Start the API |
| `npm run dev` | Start with nodemon (hot reload) |
| `npm run init-db` | Initialize the database schema manually |

**Frontend** (`web/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## Notes

- `.env` and `.env.local` are gitignored — never commit secrets. Use the examples above as templates.
- The database schema is created automatically on backend startup via `bootstrapDatabase()`.
