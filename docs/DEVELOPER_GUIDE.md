# Developer Guide

## Folder Structure

```text
hersphere-platform/
  apps/
    backend/          Node API, auth, routes, local data store
    frontend/         Browser app, route renderers, styles, dev server
  packages/
    ai/               Resume, eligibility, gaps, readiness, reviews, ranking
  database/
    migrations/       PostgreSQL production schema
    seeds/            Demo seed data
    er-diagram.mmd    Mermaid ER diagram
  deployment/         Docker, Compose, Nginx, production env example
  docs/               Architecture, API, install, testing, deployment, user guide
  scripts/            Dev, build, reset, test, verify helpers
  tests/              Unit, integration, and UI smoke tests
```

## Development Flow

1. Copy `.env.example` to `.env`.
2. Run `npm run reset:data` to restore seed data.
3. Run `npm run dev`.
4. Edit route handlers in `apps/backend/src/http/routes.js`.
5. Edit UI renderers in `apps/frontend/src/app.js`.
6. Edit AI behavior in `packages/ai/src`.
7. Run `npm run verify` before packaging.

## Coding Principles

- Keep AI modules pure and deterministic where possible.
- Keep role checks close to routes.
- Keep security controls centralized in `apps/backend/src/security`.
- Add tests for every new workflow that changes API or AI behavior.
- Keep frontend text escaped with the `e()` helper before injecting into HTML.

## Adding a New API Route

1. Add the route in `registerRoutes`.
2. Validate required fields with `requireFields`.
3. Sanitize user input with `cleanString` or `cleanList`.
4. Add `auth` and `roles` route options when needed.
5. Return JSON with `sendJson`.
6. Add an integration test under `tests/integration`.

## Adding a New Page

1. Add route metadata to `apps/frontend/src/routes.js`.
2. Add a renderer in `apps/frontend/src/app.js`.
3. Route it from `handleRoute`.
4. Add UI smoke coverage in `tests/ui/frontend.test.js`.
