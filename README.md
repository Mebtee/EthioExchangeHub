# Ethio Exchange

Ethio Exchange is a web application that aggregates real-time foreign exchange
rates from Ethiopian banks, plus rankings, market insights, and banking news.

## Features

- **Exchange rates**: live FX rates across Ethiopian banks, with a scrolling market ticker
- **Bank directory**: browse banks and view detailed rate pages per bank
- **Rankings**: compare banks on buying/selling rates with filters and insights
- **News & notifications**: latest banking news and rate alerts
- **Responsive UI**: built with React 19, Tailwind CSS 4, and shadcn/ui components

## Tech stack

- [React](https://react.dev) 19 + [React Router](https://reactrouter.com) 7
- [Vite](https://vitejs.dev) 8 with the React and Tailwind plugins
- [Tailwind CSS](https://tailwindcss.com) 4
- [TanStack Query](https://tanstack.com/query) for data fetching
- [shadcn/ui](https://ui.shadcn.com) components (Radix UI primitives)
- [Bun](https://bun.sh) as the package manager and lockfile tool

## Getting started

Requirements: [Node.js](https://nodejs.org) 20+ or [Bun](https://bun.sh).

```sh
# Install dependencies
npm install   # or: bun install

# Start the development server (http://localhost:8080)
npm run dev   # or: bun run dev
```

### Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start the Vite dev server    |
| `npm run build`   | Build the production bundle  |
| `npm run preview` | Preview the production build |
| `npm run lint`    | Run ESLint                   |
| `npm run format`  | Format code with Prettier    |

## Configuration

The app reads `VITE_API_BASE_URL` (required) to point at the backend API
(e.g. `http://localhost:5000/api/v1`). There is no mock, demo, or fallback
data anywhere in the runtime — every hook calls the real backend, and pages
render loading, empty, or API-error states when an endpoint is unavailable.

**Endpoint availability (verified):** the public endpoints (`/banks`,
`/rates/latest`, `/manual-rates`, `/scraper-health`, `/scrape-logs`, `/news`)
are wired to the real API. The admin endpoints (`/admin/dashboard/rate-trend`,
`/admin/profile`, `/admin/settings`), the auth endpoints (`/auth/*`), and
`/market-ticker` are not shipped yet — the corresponding UI sections render
empty/error states until the backend exposes them.

## Project structure

```
src/
  components/   Reusable UI components (layout, ticker, rankings, shadcn/ui)
  hooks/        Custom React hooks (rankings, exchange rates, mobile)
  lib/          API client, adapters, and utilities
  routes/       Page-level route components
  types/        Shared TypeScript types
  styles.css    Global styles and Tailwind entry point
```

## Backend API

The backend lives in [`backend/`](backend/README.md) — Express + TypeScript,
Supabase-backed, with Swagger docs, a test suite (277+ tests, coverage
gates 90/85/90/90), Docker multi-stage build, and CI via GitHub Actions.

![Backend CI](https://github.com/your-org/ethio-exchange-hub/actions/workflows/backend-ci.yml/badge.svg)

```sh
cd backend
cp .env.example .env   # fill in Supabase credentials & JWT secret
npm ci
npm run dev            # http://localhost:5000 — Swagger UI at /docs
```

### Docker

```sh
docker compose up --build backend     # API on http://localhost:5000
docker compose --profile nginx up     # optional nginx reverse proxy
```

See [`backend/README.md`](backend/README.md) for environment variables,
deployment instructions, and the full ops story.
