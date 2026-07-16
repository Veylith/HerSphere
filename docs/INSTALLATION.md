# Installation Guide

## Prerequisites

- Node.js 22.12 or newer
- Optional for production database: Docker Desktop or PostgreSQL 16+

No `npm install` is required for the packaged app because it uses Node built-ins only.

## Demo Accounts

- Candidate: `candidate@hersphere.test` / `Password123!`
- Recruiter: `recruiter@hersphere.test` / `Password123!`
- Admin: `admin@hersphere.test` / `Password123!`

## Windows

```powershell
cd hersphere-platform
copy .env.example .env
npm.cmd run reset:data
npm.cmd run dev
```

If you are using Command Prompt instead of PowerShell, `npm run dev` also works.

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

## Linux

```bash
cd hersphere-platform
cp .env.example .env
npm run reset:data
npm run dev
```

## macOS

```bash
cd hersphere-platform
cp .env.example .env
npm run reset:data
npm run dev
```

## Database Setup

For local demo mode, the app writes to `apps/backend/data/store.json`.

For PostgreSQL production schema:

```bash
docker compose -f deployment/docker-compose.yml up -d postgres
psql "postgres://hersphere:hersphere@localhost:5432/hersphere" -f database/migrations/001_initial_schema.sql
psql "postgres://hersphere:hersphere@localhost:5432/hersphere" -f database/seeds/001_demo_seed.sql
```

## Build

```bash
npm run build
```

On Windows PowerShell, use `npm.cmd run build` if `npm` is blocked by script execution policy.

The built frontend is written to `apps/frontend/dist`.

## Tests

```bash
npm test
npm run verify
```

On Windows PowerShell, use `npm.cmd test` and `npm.cmd run verify` if needed.
