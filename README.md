# runtime42

**Vibe coding, done the right way.** Describe a web app in plain English and get a production-style **Next.js 14** landing page with live in-browser preview, streaming codegen, and automatic error repair—all inside a deterministic scaffold so generated apps actually run.

---

## Features

- **Landing & marketing** — Responsive marketing site with hero, benchmarks, vision, FAQ, and CTAs
- **Auth** — Sign up / sign in with **Neon Auth** (email + password)
- **Project dashboard** — Create projects from a prompt, list/rename/delete, status badges
- **Project editor** — Chat-style workspace with pipeline progress, file tree, code viewer, diff view, and terminal
- **Multi-agent AI pipeline** — Intent chunker → planner → dependency selector → coding agent → error fixer → summarizer
- **SSE streaming** — Live checkpoints and per-file `files_delta` events during generation
- **Deterministic scaffold** — Pinned Next.js 14 toolchain, configs, UI kit, and providers; AI only writes `app/page.tsx` + `components/site/*`
- **WebContainer preview** — In-browser boot, `npm install`, `next dev`, iframe preview, sandbox terminal logs
- **Closed-loop error repair** — Parse sandbox/npm/RSC errors → optional fixer agent without full regeneration
- **Templates gallery** — Static template browser UI (`/templates`)

---

## Tech stack

| Layer | Technology |
|--------|------------|
| **Frontend app** | React 18, TypeScript, Vite 6, React Router, TanStack React Query |
| **UI** | Tailwind CSS, shadcn-style Radix UI, Lucide React, Sonner, next-themes |
| **In-browser preview** | WebContainer API (`@webcontainer/api`) with COEP/COOP headers |
| **Backend** | Node.js, Express 4, TypeScript |
| **Database** | PostgreSQL (Neon serverless), Drizzle ORM |
| **Auth** | Neon Auth (JWT verified via JWKS with `jose`) |
| **AI** | OpenAI Chat Completions + Responses API (planner nano model, Codex coding model) |
| **Generated apps** | Next.js 14.2.29, React 18, Tailwind 3, Framer Motion, pinned Radix/shadcn deps |

---

## Project structure

```
runtime42/
├── src/                              # Frontend (Vite + React)
│   ├── pages/
│   │   ├── Index.tsx                 # Marketing landing page
│   │   ├── Auth.tsx                  # Sign in / sign up
│   │   ├── Dashboard.tsx             # Project list + create
│   │   ├── ProjectEditor.tsx         # Chat, preview, code, terminal
│   │   └── Templates.tsx             # Template gallery (static)
│   ├── components/
│   │   ├── ui/                       # shadcn primitives (sidebar, toast, etc.)
│   │   ├── editor/                   # File tree, diff, terminal, streaming chat
│   │   ├── AppSidebar.tsx            # Dashboard sidebar
│   │   ├── BuildingScreen.tsx        # Preview loading state
│   │   └── ProtectedRoute.tsx        # Auth guard
│   ├── hooks/
│   │   └── useWebContainer.ts        # Sandbox boot, install, dev server, file deltas
│   ├── lib/
│   │   ├── api.ts                    # REST + SSE client
│   │   ├── baseScaffold.ts           # Fixed Next scaffold (mirrors backend)
│   │   ├── scaffoldUi.ts             # Pre-built UI components for generated apps
│   │   ├── patchWebContainerFiles.ts # Dependency pinning, path normalization
│   │   ├── normalizeProductSource.ts # Import fixes, use client, Lucide renames
│   │   ├── sandboxErrors.ts          # Structured error types
│   │   ├── terminalSanitize.ts       # Parse npm/RSC/dev errors from logs
│   │   └── webContainerManager.ts    # Singleton WebContainer instance
│   └── contexts/
│       └── AuthContext.tsx           # Session state
│
├── backend/                          # Express API
│   ├── src/
│   │   ├── index.ts                  # Express app, CORS, routes
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /sync, GET /me
│   │   │   └── projects.ts           # CRUD + generate + SSE stream
│   │   ├── middleware/
│   │   │   └── requireAuth.ts        # JWT verification (Neon Auth JWKS)
│   │   ├── db/
│   │   │   ├── schema.ts             # users, projects, chat_messages
│   │   │   ├── index.ts              # Drizzle + Neon client
│   │   │   └── migrations/           # SQL migrations
│   │   └── lib/
│   │       ├── pipeline.ts           # Orchestration, SSE events, DB persistence
│   │       ├── agents.ts             # Multi-agent prompts + OpenAI calls
│   │       ├── scaffold.ts           # BASE_NEXT_SCAFFOLD, merge, locked paths
│   │       ├── scaffoldUi.ts         # Fixed Button, Card, Accordion, etc.
│   │       ├── fileTreeTemplate.ts   # Allowlist + filter AI output paths
│   │       ├── normalizeProductCode.ts
│   │       ├── projectStructure.ts   # Path rewrites, app/page reconciliation
│   │       ├── lucideIconFixes.ts    # PiSparkle → Sparkles, YouTube → Youtube
│   │       └── openai.ts             # Chat Completions + Responses API router
│   └── drizzle.config.ts
│
├── vite.config.ts                    # COEP/COOP for WebContainer (port 8080)
└── index.html
```

---

## How it works

### Auth

1. User signs up / signs in on `/auth` via **Neon Auth** (`src/lib/neonAuth.ts`).
2. Frontend calls `POST /api/auth/sync` with Bearer token to upsert the user in Postgres.
3. Protected routes use `ProtectedRoute`; API calls attach the session token (`src/lib/api.ts`).
4. Backend `requireAuth` verifies JWT against `NEON_AUTH_URL/.well-known/jwks.json`.

### Project creation

1. Dashboard: `POST /api/projects` with `{ prompt }` creates a project row (`status`: pending → generating → ready/failed).
2. User opens `/editor/:projectId`.
3. Chat history is stored in `chat_messages` (roles, types: `text`, `thinking`, `summary`, `error`).

### AI generation pipeline

`POST /api/projects/:id/generate/stream` (SSE) or `POST /api/projects/:id/generate` (JSON):

| Step | Agent | Role |
|------|-------|------|
| 1 | Input chunker | Prompt → structured intent JSON |
| 2 | Planner | Intent → file tree plan (`components/site/*` only) |
| 6 | Dependency planner | Optional extra npm packages (exact versions) |
| 3 | Coding agent | Generates `app/page.tsx` + site section components |
| 4 | Error fixer | Optional — when client sends sandbox `errors[]` |
| 5 | Summarizer | User-facing summary + follow-up suggestions |

- **Scaffold merge**: configs, `lib/utils.ts`, `components/ui/*`, layout, and providers are deterministic constants; AI output is filtered to an allowlist.
- **SSE events**: `checkpoint`, `files_delta` (per file), `complete`, `error`.
- **Persisted**: `files` (JSON), `chunked_intent`, `coding_plan`, `chat_title`, `status`.

### WebContainer preview

1. Vite dev server sets **Cross-Origin-Embedder-Policy** and **Cross-Origin-Opener-Policy** (required for WebContainer).
2. `useWebContainer` boots a singleton sandbox → mounts **BASE_NEXT_SCAFFOLD** → `npm install` (once) → `npx next dev` (port 3000–3009 fallback).
3. On generation complete, product files are written in one batch; iframe preview reloads.
4. `patchWebContainerFiles` pins dependency versions; `normalizeProductSource` fixes imports, icons, and `'use client'`.
5. On compile/runtime errors, terminal logs are parsed → toast alerts → optional auto-retry via error fixer agent.

### Generated app layout (fixed tree)

```
Generated Next.js app (inside WebContainer)
├── package.json, next.config.js, tsconfig.json, tailwind.config.js  ← scaffold
├── lib/utils.ts                                                     ← scaffold (cn helper)
├── components/ui/Button.tsx, Card.tsx, Accordion.tsx, …             ← scaffold
├── components/providers/AppProviders.tsx                            ← TooltipProvider
├── app/layout.tsx, app/globals.css                                  ← scaffold
├── app/page.tsx                                                     ← AI writes
└── components/site/HeroSection.tsx, FeaturesSection.tsx, …          ← AI writes
```

---

## Environment variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend URL (e.g. `http://localhost:3001`) |
| `VITE_NEON_AUTH_URL` | Yes | Neon Auth URL for the auth client |

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `NEON_AUTH_URL` | Yes | Neon Auth URL (JWKS verification) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for all agents |
| `FRONTEND_URL` | Recommended | Allowed CORS origin (e.g. `http://localhost:8080`) |
| `PORT` | No | API port (default `3001`) |

---

## Database

Tables (Drizzle schema in `backend/src/db/schema.ts`):

- **users** — synced from Neon Auth
- **projects** — prompt, files JSON, intent/plan metadata, status
- **chat_messages** — per-project chat thread

Run migrations:

```bash
cd backend
npm run db:generate   # generate migration from schema changes
npm run db:migrate    # apply migrations
```

---

## Development

### Prerequisites

- Node.js 18+
- Neon project (Postgres + Auth)
- OpenAI API key
- Chrome or Edge (WebContainer preview)

### Install & run

```bash
# Frontend — create `.env` in project root
npm install

# Backend — create `backend/.env`
cd backend
npm install
npm run db:migrate

# Terminal 1 — API (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 8080, COEP/COOP enabled)
npm run dev
```

Open **http://localhost:8080**.

> WebContainer requires the frontend to be served with COEP/COOP headers. Use the Vite dev server on port **8080**, not a plain static server.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/sync` | Upsert user from JWT |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects` | Create project `{ prompt, title? }` |
| `GET` | `/api/projects/:id` | Get project |
| `PATCH` | `/api/projects/:id` | Rename `{ title }` |
| `DELETE` | `/api/projects/:id` | Delete project |
| `GET` | `/api/projects/:id/messages` | Chat history |
| `POST` | `/api/projects/:id/generate` | Generate (JSON response) |
| `POST` | `/api/projects/:id/generate/stream` | Generate (SSE stream) |

All `/api/projects/*` routes require `Authorization: Bearer <token>`.

---

## Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled server |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate` | Apply migrations |

---

## License

Private. All rights reserved.
