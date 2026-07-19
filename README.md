# EthioBanksHub 🏦

> **A unified banking interface for Ethiopian banks.**  
> Manage accounts across CBE, Awash, Dashen, and 20+ banks from a single dashboard.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
  - [Quick Start (Local)](#quick-start-local)
  - [Docker Setup](#docker-setup)
- [Commands](#-commands)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

EthioBanksHub is a full-stack monorepo that provides:

- **Multi-bank aggregation** — Link accounts from all major Ethiopian banks in one place.
- **Unified dashboard** — View balances, transactions, and account details across institutions.
- **Seamless transfers** — Send money between accounts at different banks.
- **Real-time sync** — Keep your account data up to date with automatic synchronization.
- **Secure authentication** — JWT-based auth with refresh token rotation.

---

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Next.js   │─────▶│   NestJS    │─────▶│  PostgreSQL  │
│   (React)   │◀────▶│   (API)     │      └──────────────┘
└─────────────┘      │             │      ┌──────────────┐
                     │   Prisma    │─────▶│    Redis     │
                     │   (ORM)     │      └──────────────┘
                     └─────────────┘
```

| Layer     | Technology              | Purpose                        |
| --------- | ----------------------- | ------------------------------ |
| Frontend  | Next.js 14 + TypeScript | SSR React app with App Router  |
| Backend   | NestJS + TypeScript     | REST API with modular services |
| ORM       | Prisma                  | Database access & migrations   |
| Database  | PostgreSQL 16           | Primary data store             |
| Cache     | Redis 7                 | Session store, rate limiting   |
| Auth      | JWT + Passport          | Authentication & authorization |
| Container | Docker + Docker Compose | Consistent dev & prod envs     |

---

## 🛠 Tech Stack

| Category            | Technology                           |
| ------------------- | ------------------------------------ |
| **Runtime**         | Node.js 20+                          |
| **Package Manager** | pnpm 9+                              |
| **Monorepo**        | pnpm workspaces                      |
| **Frontend**        | Next.js 14, React 18, Tailwind CSS 3 |
| **Backend**         | NestJS 10, Express                   |
| **Database**        | PostgreSQL 16, Prisma 5              |
| **Cache**           | Redis 7                              |
| **Auth**            | JWT, Passport.js                     |
| **Validation**      | class-validator, class-transformer   |
| **Code Quality**    | ESLint, Prettier, Husky, lint-staged |
| **CI/CD**           | GitHub Actions                       |
| **Container**       | Docker, Docker Compose               |

---

## 📁 Project Structure

```
ethiobankshub/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI pipeline
├── .husky/
│   └── pre-commit                 # Git hook
├── apps/
│   ├── api/                       # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   └── seed.ts            # Database seed
│   │   ├── src/
│   │   │   ├── config/            # App configuration
│   │   │   ├── prisma/            # Prisma module
│   │   │   ├── app.module.ts      # Root module
│   │   │   ├── app.controller.ts  # Health check
│   │   │   ├── app.service.ts     # App service
│   │   │   └── main.ts            # Entry point
│   │   ├── nest-cli.json
│   │   └── package.json
│   └── web/                       # Next.js frontend
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx      # Root layout
│       │       ├── page.tsx        # Landing page
│       │       ├── login/          # Login page
│       │       └── register/       # Register page
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── package.json
├── docker/
│   ├── Dockerfile.api             # API Dockerfile
│   ├── Dockerfile.web             # Web Dockerfile
│   └── .dockerignore
├── packages/
│   └── shared/                    # Shared types & constants
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── docker-compose.yml             # Full stack orchestration
├── docker-compose.dev.yml         # Dev infrastructure only
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # Workspace config
├── tsconfig.base.json             # Shared TS config
├── .env.example                   # Environment template
├── .eslintrc.js                   # ESLint config
├── .prettierrc                    # Prettier config
└── README.md                      # This file
```

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

| Tool                      | Version    | Installation                                  |
| ------------------------- | ---------- | --------------------------------------------- |
| **Node.js**               | >= 18.17.0 | [nodejs.org](https://nodejs.org/)             |
| **pnpm**                  | >= 8.0.0   | `npm install -g pnpm`                         |
| **Docker**                | Latest     | [docker.com](https://www.docker.com/)         |
| **PostgreSQL** (optional) | 16         | [postgresql.org](https://www.postgresql.org/) |
| **Redis** (optional)      | 7          | [redis.io](https://redis.io/)                 |

---

## 📦 Installation Guide

### Quick Start (Local)

**1. Clone the repository**

```bash
git clone https://github.com/your-org/ethiobankshub.git
cd ethiobankshub
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your database credentials
```

**4. Start infrastructure services (PostgreSQL & Redis)**

```bash
docker compose -f docker-compose.dev.yml up -d
```

**5. Generate Prisma client & push schema**

```bash
pnpm db:generate
pnpm db:push
```

**6. Build shared types**

```bash
pnpm --filter @ethiobankshub/shared build
```

**7. Start development servers**

```bash
# Start both frontend and backend
pnpm dev

# Or start individually:
pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:3000
```

### Docker Setup

**Full-stack with Docker Compose:**

```bash
# Start all services (PostgreSQL, Redis, API, Web)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

**Development with hot-reload:**

```bash
docker compose up -d postgres redis
pnpm dev
```

---

## 📟 Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm dev:web`     | Start Next.js frontend             |
| `pnpm dev:api`     | Start NestJS backend               |
| `pnpm build`       | Build all packages                 |
| `pnpm lint`        | Run ESLint across all packages     |
| `pnpm format`      | Format code with Prettier          |
| `pnpm typecheck`   | Run TypeScript type checking       |
| `pnpm test`        | Run tests                          |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:migrate`  | Create & apply migrations          |
| `pnpm db:seed`     | Seed the database                  |
| `pnpm db:studio`   | Open Prisma Studio                 |
| `pnpm clean`       | Clean build artifacts              |

---

## 🔐 Environment Variables

See [`.env.example`](./.env.example) for all available variables and their defaults.

| Variable                 | Description                  | Default                                                           |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string | `postgresql://ethiobanks:ethiobanks@localhost:5432/ethiobankshub` |
| `REDIS_URL`              | Redis connection string      | `redis://localhost:6379`                                          |
| `API_PORT`               | NestJS server port           | `4000`                                                            |
| `API_PREFIX`             | API URL prefix               | `api/v1`                                                          |
| `NEXT_PUBLIC_API_URL`    | Public API URL for frontend  | `http://localhost:4000/api/v1`                                    |
| `JWT_SECRET`             | JWT signing secret           | _(change me)_                                                     |
| `JWT_EXPIRES_IN`         | Access token expiry          | `15m`                                                             |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry         | `7d`                                                              |
| `CORS_ORIGINS`           | Allowed CORS origins         | `http://localhost:3000`                                           |

---

## 📖 API Documentation

Once the API is running, Swagger/OpenAPI documentation is available at:

```
http://localhost:4000/docs
```

### Health Check

```bash
curl http://localhost:4000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "services": {
    "database": "healthy",
    "redis": "pending"
  }
}
```

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feat/my-feature`
3. **Commit** your changes: `git commit -m 'feat: add awesome feature'`
4. **Push** to the branch: `git push origin feat/my-feature`
5. Open a **Pull Request**

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — A new feature
- `fix:` — A bug fix
- `chore:` — Maintenance tasks
- `refactor:` — Code restructuring
- `docs:` — Documentation changes
- `test:` — Adding or updating tests
- `style:` — Formatting changes (no logic change)

---

## 📄 License

[MIT](LICENSE) © EthioBanksHub

---

<div align="center">
  <sub>Built with ❤️ for the Ethiopian banking ecosystem</sub>
</div>
