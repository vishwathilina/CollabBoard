# CollabBoard

Full-stack collaborative workspace: Dashboard, Work Tree, Kanban Board, Task Detail, and Gantt. The **Next.js** frontend (`:3000`) talks to an **Express** REST API (`:4000`) backed by an in-memory store — no MongoDB or SQL. Data is seeded from the same records as `frontend/mocks/data.ts` and reloads on server restart.

## Architecture

```mermaid
flowchart LR
  subgraph client [Next.js :3000]
    Pages[Pages]
    ApiTs[lib/api.ts]
  end
  subgraph server [Express :4000]
    Routes[routes]
    Ctrl[controllers]
    Svc[services]
    Repos[repos]
    Store[in-memory store]
    JWT[auth middleware]
  end
  Pages --> ApiTs
  ApiTs -->|Bearer JWT| Routes
  Routes --> Ctrl
  Ctrl --> Svc
  Svc --> Repos
  Repos --> Store
  Routes --> JWT
```

The backend is layered **routes → controllers → services → repos → in-memory store**. CORS allows `http://localhost:3000`. Auth uses **Bearer JWT** (stored in `localStorage` on the client) so Postman and the frontend share the same scheme.

## Setup

Run the API and frontend in separate terminals.

**Backend** (`http://localhost:4000`):

```bash
cd backend
npm install
npm run dev
```

Optional `.env` in `backend/` (defaults work for local dev):

| Variable | Default |
|---|---|
| `PORT` | `4000` |
| `JWT_SECRET` | `replace-me-in-real-env` |
| `CLIENT_ORIGIN` | `http://localhost:3000` |

**Frontend** (`http://localhost:3000`):

```bash
cd frontend
npm install
npm run dev
```

Optional: set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the API is not on `http://localhost:4000`.

Open [http://localhost:3000](http://localhost:3000). `/` redirects to `/dashboard`. Sign in at `/login`.

**Demo login:** `ada@collabboard.local` / `CollabBoard!1`

```bash
cd frontend && npm run build
cd backend && npm test
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, `lucide-react` — import alias `@/*` |
| Backend | Node.js 20+, Express, JWT, Zod, repository pattern over in-memory store |
| API contract | OpenAPI 3.0, Swagger UI, Postman collection |

Frontend HTTP client: `frontend/lib/api.ts`.

## API

**Base URL:** `http://localhost:4000/api`

All JSON responses use a uniform envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

**Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`

**Resources:** CRUD for workspaces, tree nodes, tasks, messages, and attachment metadata. Tasks move between four frozen Kanban columns via `PATCH /tasks/:taskId/move`. Gantt rows are **derived** from `startDate` / `dueDate` (`leftPercent`, `widthPercent`) — not stored. Workspace-scoped mutations require membership. Input is validated with Zod at the route edge.

**Health:** `GET /api/health` reports `store: "memory"`.

Seed ids match the frontend mocks (`task-01`, `ws-website`, …).

## Frontend routes

| Route | Description |
|---|---|
| `/login` | JWT sign-in |
| `/dashboard` | Workspace list |
| `/workspace/[id]/tree` | Work tree |
| `/workspace/[id]/board` | Kanban board |
| `/workspace/[id]/gantt` | Gantt chart |

Task detail opens as a drawer from tree or board views.

## API docs

- Swagger UI: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- [docs/api/openapi.yaml](./docs/api/openapi.yaml)
- [docs/api/API-REFERENCE.md](./docs/api/API-REFERENCE.md)
- Postman: [postman/CollabBoard.postman_collection.json](./postman/CollabBoard.postman_collection.json) + [postman/CollabBoard.postman_environment.json](./postman/CollabBoard.postman_environment.json)

Import the collection and environment, select **CollabBoard Local**, run **Auth → Login (Ada)** first (saves `token`), then exercise other folders. Newman: `npm run test:postman` from `backend/`.

## Limitations

Process memory is volatile — restarting the API reloads seed data. Out of scope for this phase: MongoDB/SQL, Socket.io / live presence, multipart file uploads (attachments are URL + type + name metadata only), and Next.js `app/api` routes (Express is the API).
