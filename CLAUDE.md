# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

```bash
# Run both frontend and backend concurrently (from root)
npm run dev

# Run individually
npm run dev:backend    # nodemon on port 3001
npm run dev:frontend   # Vite on port 5173

# Frontend build (TypeScript check + Vite bundle)
cd frontend && npm run build

# Install all dependencies after cloning
npm run install:all
```

There are no automated tests. Verify API changes manually via curl or the browser.

## Architecture

Monorepo with two independent apps:

- **`backend/`** — Express.js REST API, LibSQL (SQLite via `@libsql/client`), database file at `data/research.db`
- **`frontend/`** — React 18 + TypeScript + Vite + Tailwind CSS, proxied to backend via Vite dev server
- **`uploads/`** — PDF/file storage, served as static files at `/uploads/*`

### Backend

`backend/src/server.js` is the entry point. It calls `init()` (which runs CREATE TABLE IF NOT EXISTS migrations + seeds) then starts Express.

Route files in `backend/src/routes/`: `auth`, `papers`, `authors`, `venues`, `stats`, `teams`, `files`.

Auth middleware in `backend/src/middleware/auth.js`:
- `requireAuth` — verifies Bearer JWT, sets `req.user`
- `requireRole(...roles)` — checks role after `requireAuth`
- `getVisibleAuthorIds(user)` — returns `null` (admin = no filter), `[]` (member with no linked author), or `[...ids]` (member's own id, or lead's team member ids via self-join on `team_members`)

**Adding a new protected endpoint:** apply `requireAuth` then call `getVisibleAuthorIds(req.user)` and build a subquery filter using:
```js
const paperSubquery = hasFilter && visibleIds.length > 0
  ? `EXISTS (SELECT 1 FROM paper_authors pa WHERE pa.paper_id = p.id AND pa.author_id IN (${visibleIds.join(',')}))`
  : hasFilter ? '0' : '1';
```
See `routes/papers.js` and `routes/stats.js` for the full pattern.

JWT secret is in `backend/.env` as `JWT_SECRET`. Tokens expire in 7 days and embed `{ id, username, role, author_id }`.

### Frontend

`frontend/src/utils/api.ts` is the single HTTP client. All requests go through `request<T>()`, which auto-injects the Bearer token from `localStorage` and redirects to `/login` on 401.

`frontend/src/contexts/AuthContext.tsx` — `AuthProvider` wraps the whole app. On mount it calls `GET /api/auth/me` to validate any saved token. Exposes `useAuth()` hook with `{ user, token, isLoading, login, register, logout }`.

`frontend/src/types/index.ts` — all shared TypeScript types and display constants (`STATUS_LABEL`, `STATUS_COLOR`, `TYPE_LABEL`, etc.).

`frontend/src/App.tsx` — routing: `/login` and `/register` are public; all other routes require `user` from `useAuth()`.

### Database Schema

Key tables and relationships:
- `papers` ← `paper_authors` → `authors` (many-to-many, with `role` and `order_index`)
- `teams` ← `team_members` → `authors` (many-to-many, with `kpi_papers`)
- `papers` → `venues` (venue_id FK, nullable)
- `papers` → `files` (one-to-many, cascades on delete)
- `users` → `authors` (author_id FK, nullable — links an account to a lab member)

Role-based visibility is computed at query time; there is no separate ACL table.

### Auth Roles

| Role | Data Visible |
|---|---|
| `admin` | All papers, all authors |
| `lead` | Own papers + papers of all authors sharing any team (via `team_members` self-join) |
| `member` | Only papers where `author_id = user.author_id` |

A user with no linked `author_id` (member or lead) sees zero papers.
