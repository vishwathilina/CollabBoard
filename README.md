# CollabBoard

Full-stack collaborative workspace: Dashboard, Work Tree, Kanban Board (DnD), Task Detail Drawer, Gantt Chart, Realtime Workspace Chat, Socket.io Presence, and File Uploads via UploadThing.

The **Next.js** frontend (`:3000`) communicates with an **Express** REST API (`:4000`) backed by **MongoDB Atlas** via Mongoose, with realtime bidirectional updates powered by Socket.io. Public string IDs (`u-ada`, `ws-website`, `task-01`, …) are preserved for deterministic testing and demos.

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Next.js :3000]
    Pages[Pages & Layouts]
    ApiTs[lib/api.ts]
    UTClient[UploadThing React]
    SocketClient[Socket.io Client]
  end

  subgraph server [Express :4000]
    Routes[Routes]
    Ctrl[Controllers]
    Svc[Services & RBAC]
    Repos[Repositories]
    Models[Mongoose Models]
    JWT[Auth Middleware]
    UTRoute[/api/uploadthing]
    SocketServer[Socket.io Server]
  end

  Atlas[(MongoDB Atlas)]
  UTCloud[(UploadThing CDN)]

  Pages --> ApiTs
  Pages --> UTClient
  Pages --> SocketClient

  ApiTs -->|Bearer JWT| Routes
  UTClient -->|Upload File| UTRoute
  SocketClient <-->|Presence & Chat| SocketServer

  Routes --> JWT
  Routes --> Ctrl
  Ctrl --> Svc
  Svc --> Repos
  Repos --> Models
  Models --> Atlas

  UTRoute --> UTCloud
  UTRoute -->|onUploadComplete| Repos
```

The backend follows a strict layered pattern: **routes → controllers → services → repos → Mongoose → Atlas**. Auth utilizes **Bearer JWT** (stored in client `localStorage` and sent in HTTP Authorization headers and Socket.io handshake auth).

---

## Data Modeling — Embed vs Reference

| Entity | Storage Decision | Rationale |
|---|---|---|
| Kanban columns | **Enum (`todo \| in_progress \| review \| done`)** | Fixed domain set; bounded; strictly validated |
| Workspace members + role + visibility | **Embedded array in Workspace** | Tens of members; always loaded together with workspace for RBAC evaluation |
| Tree nodes | **Own collection (`TreeNode`)** | Hierarchical; queried recursively; scoped by member visibility |
| Tasks | **Own collection (`Task`)** | High mutation rate; optimistic locking (`version`); reordered with `order` |
| Task messages / comments | **Own collection (`Message`)** | Unbounded growth per task thread |
| Workspace chat messages | **Own collection (`WorkspaceChatMessage`)** | High write velocity; real-time broadcast via Socket.io |
| Attachments | **Own collection (`Attachment`)** | Tied to UploadThing files (`fileKey`, `url`, `type`) |
| Users | **Own collection (`User`)** | Shared across workspaces; unique email; global `orgRole` |
| Presence | **In-memory state (Socket.io)** | Ephemeral live session data; does not require persistence |

---

## Demo Accounts & RBAC Matrix

Password for all demo accounts: **`CollabBoard!1`**

| Email | Name | Org Role | Workspace Role (`ws-website`) | Accessible Tree Scope |
|---|---|---|---|---|
| `ada@collabboard.local` | Ada Lovelace | `senior_project_manager` | `owner` | Full tree across **all** workspaces |
| `grace@collabboard.local` | Grace Hopper | `project_manager` | `project_manager` | Full tree on assigned workspaces; can manage members |
| `linus@collabboard.local` | Linus Torvalds | `developer` | `developer` | **Scoped:** Engineering nodes only (`tn-engineering`, `tn-api`, `tn-frontend`) |
| `barbara@collabboard.local`| Barbara Liskov | `designer` | `designer` | Full tree on assigned workspaces |
| `dennis@collabboard.local` | Dennis Ritchie | `qa` | `qa` | Full tree on assigned workspaces |
| `tim@collabboard.local`    | Tim Berners-Lee | `stakeholder` | `viewer` | Read-only access; cannot chat or move cards |

---

## Getting Started

Run the backend API and frontend Next.js application in separate terminals.

### 1. Backend Setup (`:4000`)

```bash
cd backend
cp .env.example .env
npm install
```

Configure `backend/.env`:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret-string-at-least-32-chars
CLIENT_ORIGIN=http://localhost:3000

# MongoDB Atlas Connection URI (append database name /collabboard)
MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>.mongodb.net/collabboard?retryWrites=true&w=majority

# UploadThing API Token (from https://uploadthing.com/dashboard)
UPLOADTHING_TOKEN=your-uploadthing-token
```

Seed initial demo data into MongoDB:

```bash
npm run seed
```

Start the backend development server:

```bash
npm run dev
```

The API will listen on `http://localhost:4000`. Health check: `http://localhost:4000/api/health`.

### 2. Frontend Setup (`:3000`)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## End-to-End Demo Walkthrough

1. **Sign In**: Navigate to `/login`. Sign in as `ada@collabboard.local` with password `CollabBoard!1`.
2. **Dashboard & Workspaces**: Observe the list of workspaces. Member avatars are dynamically resolved from the API.
3. **Create Workspace**: Click **+ New Workspace** in the top bar or sidebar, assign a name, description, and accent color.
4. **Work Tree**: Click the workspace to view the hierarchical tree (`/workspace/[id]/tree`). Inspect task counts, completion percentages, and add/edit nodes.
5. **Kanban Board & DnD**: Switch to the **Board** tab (`/workspace/[id]/board`). Drag a task between columns (`todo`, `in_progress`, `review`, `done`). Optimistic locking verifies `version` and returns 409 conflict on concurrent updates.
6. **Task Detail Drawer**: Click any task card to slide open the Task Detail Drawer.
   - Switch between **Messages** and **Attachments**.
   - Under **Attachments**, use the UploadThing button to upload real images or documents.
7. **Realtime Chat & Presence**:
   - In the workspace header, click **Workspace Chat** to open the slide-out chat panel.
   - Send messages in real-time. Active online users are displayed with pulsing indicators.
8. **RBAC Scope Verification**:
   - Sign out and log in as `linus@collabboard.local`.
   - Open `ws-website`: notice that only engineering nodes (`tn-engineering`, `tn-api`, `tn-frontend`) appear in the tree and board. Design and marketing nodes are restricted.

---

## Testing & Quality

### Backend Tests (In-Memory MongoDB)
Backend tests run against an isolated in-memory MongoDB server (`mongodb-memory-server`), ensuring zero pollution and zero dependence on external Atlas connectivity:

```bash
cd backend
npm test
```

### Frontend Tests (React Testing Library)
Frontend component and authentication tests run via Vitest/Jest:

```bash
cd frontend
npm test
```

### Production Build Verification
```bash
cd frontend
npm run build
```

---

## API & Documentation

- **Swagger UI**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **OpenAPI 3.0 Spec**: [`docs/api/openapi.yaml`](./docs/api/openapi.yaml)
- **Postman Collection**: [`postman/CollabBoard.postman_collection.json`](./postman/CollabBoard.postman_collection.json)
- **Postman Environment**: [`postman/CollabBoard.postman_environment.json`](./postman/CollabBoard.postman_environment.json)

Run Newman collection tests:
```bash
cd backend
npm run test:postman
```
