# E2E Tests

Reactive Resume uses Playwright for PR-gated browser coverage of deterministic core flows.

## Local setup

Start PostgreSQL:

`sudo docker compose -f compose.dev.yml up -d postgres`

Generate local test secrets:

`export AUTH_SECRET=$(openssl rand -hex 32)`

`export ENCRYPTION_SECRET=$(openssl rand -hex 32)`

Run database migrations:

`APP_URL=http://localhost:3000 PORT=3000 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres FLAG_DISABLE_SIGNUPS=false FLAG_DISABLE_EMAIL_AUTH=false FLAG_DISABLE_API_RATE_LIMIT=true LOCAL_STORAGE_PATH=/workspace/data/e2e pnpm db:migrate`

Build the production app:

`APP_URL=http://localhost:3000 PORT=3000 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres FLAG_DISABLE_SIGNUPS=false FLAG_DISABLE_EMAIL_AUTH=false FLAG_DISABLE_API_RATE_LIMIT=true LOCAL_STORAGE_PATH=/workspace/data/e2e pnpm build`

Run tests:

`APP_URL=http://localhost:3000 PORT=3000 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres FLAG_DISABLE_SIGNUPS=false FLAG_DISABLE_EMAIL_AUTH=false FLAG_DISABLE_API_RATE_LIMIT=true LOCAL_STORAGE_PATH=/workspace/data/e2e pnpm test:e2e`

## Coverage

- Email/password auth smoke.
- Dashboard resume lifecycle: create, rename, duplicate, delete.
- Builder section editing, autosave/navigation, and locking.
- JSON export/import.
- Public sharing for anonymous visitors.

Visual regression, PDF/DOCX rasterization parity, thumbnail resolution, and import-fixture reproduction are
intentionally outside the PR gate to keep it fast; the opt-in geometry, offline-font, and root-resume suites stay
behind their environment flags.
