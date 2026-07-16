# HerSphere - AI-Powered Career Success Platform for Women

HerSphere is a launch-ready career companion web application for women candidates, recruiters, and administrators. It combines jobs, internships, resume intelligence, eligibility scoring, skill-gap detection, learning roadmaps, company review intelligence, applicant ranking, notifications, and platform governance in one product.

This package is intentionally dependency-light: no package install is required for the runnable version. It uses Node.js built-ins for the backend, frontend dev server, security, and tests, plus a production PostgreSQL schema for real deployment planning.

## Features

- Candidate registration, login, forgot password flow, email verification API, profile completion, resume analysis, job and internship search, filters, bookmarks, applications, application tracking, notifications, company reviews, career dashboard, profile strength, readiness scores, AI recommendations, learning roadmap, settings, light mode, and dark mode.
- Recruiter registration, company verification workflow, recruiter dashboard, post/edit/delete listings, manage applicants, AI candidate ranking, shortlisting, interview scheduling API, company analytics, and recruitment metrics.
- Admin dashboard, user management, company verification, recruiter approval API, review moderation, analytics, reports, audit logs, and platform monitoring metrics.
- Practical AI modules for resume extraction, eligibility analysis, skill gaps, learning recommendations, career readiness, smart job recommendations, company review summaries, trust score, spam detection, and candidate ranking.
- Security controls: password hashing, signed tokens, role-based access, input validation, CSRF checks, origin checks, security headers, rate limiting, audit logs, and SQL-injection-safe production schema design.

## Technology Stack

- Frontend: Vanilla ES modules, accessible HTML, responsive CSS, dark/light themes.
- Backend: Node.js 22 HTTP API with clean route, security, domain, and infrastructure layers.
- Database: PostgreSQL 16 production schema with local JSON store for instant demo runs.
- Authentication: PBKDF2 password hashing, HMAC signed JWT-style tokens, CSRF tokens, role-based authorization.
- AI: Deterministic JavaScript AI modules for auditable career intelligence without external API keys.
- Deployment: Docker, Docker Compose, Nginx config, production env example.
- Testing: Node built-in test runner with unit, integration, API, and UI smoke tests.

## Folder Structure

```text
hersphere-platform/
  apps/
    backend/
    frontend/
  packages/
    ai/
  database/
    migrations/
    seeds/
    er-diagram.mmd
  deployment/
  docs/
  scripts/
  tests/
  .env.example
  package.json
```

## Quick Start

Demo accounts:

- Candidate: `candidate@hersphere.test` / `Password123!`
- Recruiter: `recruiter@hersphere.test` / `Password123!`
- Admin: `admin@hersphere.test` / `Password123!`

### Windows

```powershell
cd hersphere-platform
copy .env.example .env
npm.cmd run reset:data
npm.cmd run dev
```

If you are using Command Prompt instead of PowerShell, `npm run dev` also works.

### Linux

```bash
cd hersphere-platform
cp .env.example .env
npm run reset:data
npm run dev
```

### macOS

```bash
cd hersphere-platform
cp .env.example .env
npm run reset:data
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

## Configuration

Copy `.env.example` to `.env` and adjust values:

```env
PORT=4000
FRONTEND_PORT=5173
JWT_SECRET=change-this-to-a-strong-64-character-secret-before-production
CSRF_SECRET=change-this-to-a-different-strong-secret-before-production
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000
DATA_FILE=apps/backend/data/store.json
DATABASE_URL=postgres://hersphere:hersphere@localhost:5432/hersphere
```

## Database Setup

The local demo runs on a JSON file store so it starts immediately. The production-ready normalized PostgreSQL schema is in `database/migrations/001_initial_schema.sql`.

Run PostgreSQL with Docker:

```bash
docker compose -f deployment/docker-compose.yml up -d postgres
psql "postgres://hersphere:hersphere@localhost:5432/hersphere" -f database/migrations/001_initial_schema.sql
psql "postgres://hersphere:hersphere@localhost:5432/hersphere" -f database/seeds/001_demo_seed.sql
```

## Running Locally

Start both frontend and backend:

```bash
npm run dev
```

Start only backend:

```bash
npm run start:backend
```

Start only frontend:

```bash
npm run start:frontend
```

Reset local demo data:

```bash
npm run reset:data
```

## Tests and Verification

Run all tests:

```bash
npm test
```

Run full verification:

```bash
npm run verify
```

On Windows PowerShell, use `npm.cmd test` and `npm.cmd run verify` if script execution policy blocks `npm`.

Verification performs backend syntax checks, frontend syntax checks, frontend build, and all tests.

## Production Build

```bash
npm run build
```

The frontend build is written to `apps/frontend/dist`.

## Docker Deployment

```bash
docker compose -f deployment/docker-compose.yml up --build
```

Before production, replace secrets in `deployment/docker-compose.yml` or provide a production `.env`.

## Documentation

- `docs/ARCHITECTURE.md`: system, software, database, API, and AI architecture.
- `docs/API.md`: endpoint guide and request examples.
- `docs/INSTALLATION.md`: setup commands for Windows, Linux, and macOS.
- `docs/DEVELOPER_GUIDE.md`: folder structure and contribution workflow.
- `docs/DEPLOYMENT.md`: production deployment checklist.
- `docs/TESTING.md`: test strategy and commands.
- `docs/USER_MANUAL.md`: candidate, recruiter, and admin workflows.

## Troubleshooting

- Port already in use: change `PORT` or `FRONTEND_PORT` in `.env`.
- Login fails after editing data: run `npm run reset:data`.
- CSRF error on API calls: fetch `/api/security/csrf` and send the value in `X-CSRF-Token` for POST, PUT, PATCH, and DELETE requests.
- Production secret error: set strong `JWT_SECRET` and `CSRF_SECRET` when `NODE_ENV=production`.
- PostgreSQL connection issue: confirm Docker is running and `DATABASE_URL` matches the database container.

## Launch Notes

The included app is a complete runnable product package. For a real public launch, connect the API to PostgreSQL persistence, add transactional email for verification and password reset delivery, attach object storage for resumes, configure HTTPS, and replace demo domains with production domains.
