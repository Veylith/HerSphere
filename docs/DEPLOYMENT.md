# Deployment Guide

## Production Checklist

- Set `NODE_ENV=production`.
- Replace `JWT_SECRET` and `CSRF_SECRET` with strong unique secrets.
- Use PostgreSQL 16+ and run `database/migrations/001_initial_schema.sql`.
- Store resumes and uploaded assets in object storage, not the local JSON store.
- Put the frontend and API behind HTTPS.
- Configure `CORS_ORIGINS` to the exact production domain.
- Keep rate limiting enabled.
- Enable database backups and audit-log retention.

## Docker Compose

```bash
docker compose -f deployment/docker-compose.yml up --build
```

Services:

- `postgres`: PostgreSQL 16 with migration scripts mounted.
- `backend`: HerSphere API on port `4000`.
- `frontend`: static frontend server on port `5173`.

## Manual Production Run

```bash
cp deployment/production.env.example .env
npm run build
NODE_ENV=production npm run start:backend
```

In production, serve `apps/frontend/dist` from Nginx or a static host and proxy `/api` to the backend.

## Nginx

`deployment/nginx.conf` includes a static frontend and API proxy pattern. Update server name, TLS certificates, and upstream host before production.
