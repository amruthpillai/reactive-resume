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

## Semantic CSS flag matrix

Run the ordinary suite with both Semantic CSS rollout flags disabled:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=false FLAG_SEMANTIC_CSS_DEFAULT=false \
	pnpm exec playwright test --grep-invert "@semantic-css"
```

Run opt-in conversion, editing, conflict, last-valid, and visual acceptance. With authoring enabled, the Playwright
configuration automatically uses one worker so deterministic heavy browser preflight and visual checks do not compete
for the fixed production five-second deadline:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=false \
	pnpm exec playwright test \
	tests/e2e/specs/semantic-css/legacy-conversion.spec.ts \
	tests/e2e/specs/semantic-css/invalid-last-valid.spec.ts \
	tests/e2e/specs/semantic-css/portable-stylesheet.spec.ts \
	tests/e2e/specs/semantic-css/revision-conflict.spec.ts \
	tests/e2e/specs/semantic-css/template-visual.spec.ts
```

Verify the default-on state for newly created resumes:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=true \
	pnpm exec playwright test tests/e2e/specs/semantic-css/default-mode.spec.ts
```

Verify dormant authoring and persisted semantic rendering:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=false FLAG_SEMANTIC_CSS_DEFAULT=false \
	pnpm exec playwright test \
	tests/e2e/specs/semantic-css/dormant-mode.spec.ts \
	tests/e2e/specs/semantic-css/flag-off-semantic.spec.ts
```

Linux/Chromium visual baselines are updated intentionally with:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=false \
	pnpm exec playwright test tests/e2e/specs/semantic-css/template-visual.spec.ts \
	--project=chromium --update-snapshots
```

## Coverage

- Email/password auth smoke.
- Dashboard sample resume creation.
- Builder basics edit and autosave persistence.
- JSON export/import.
- Public sharing for anonymous visitors.
- Semantic CSS rollout states, legacy conversion, last-valid recovery, portability, revision conflicts, and all-template
  visual regression.

PDF, DOCX, OAuth, passkeys, 2FA, password reset, and AI flows are intentionally outside the initial PR gate.
