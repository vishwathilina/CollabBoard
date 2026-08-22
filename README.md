# CollabBoard

Frontend-only collaborative workspace (Work Tree, Kanban Board, Task Detail, Gantt). This phase uses hardcoded data in `mocks/data.ts` — no backend, auth, or sockets.

## Setup

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `/` redirects to `/dashboard`.

```powershell
npm run build
```

## Stack

Next.js 15 (App Router), TypeScript, Tailwind CSS, `lucide-react`. Import alias `@/*`.

## Team docs

Member roles, frozen types, tokens, and Git protocol:

- [member-contexts/README.md](./member-contexts/README.md)
- [member-contexts/00-SHARED-CONVENTIONS.md](./member-contexts/00-SHARED-CONVENTIONS.md)
- [member-contexts/00-GIT-WORKFLOW.md](./member-contexts/00-GIT-WORKFLOW.md)
- [collabboard-frontend-plan.md](./collabboard-frontend-plan.md)

## Routes

| Route | Owner |
|---|---|
| `/dashboard` | Member 2 |
| `/workspace/[id]/tree` | Member 3 |
| `/workspace/[id]/board` | Member 5 |
| `/workspace/[id]/gantt` | Member 8 |

Until other members replace the stubs, those pages show a dashed placeholder labeled with the owning member number.
