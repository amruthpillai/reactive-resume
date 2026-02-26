# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reactive Resume is a free, open-source resume builder built with TanStack Start (React 19 + Vite 8), using ORPC for type-safe RPC APIs, Drizzle ORM with PostgreSQL, Nitro as the server runtime, and Better Auth for authentication. It is a PWA with 47 supported locales and 13 resume templates.

## Development Commands

```bash
# Start development server (runs on port 3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting and formatting (uses Biome)
pnpm lint

# Type checking (uses tsgo)
pnpm typecheck

# Database operations
pnpm db:generate    # Generate migration files
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema changes directly
pnpm db:studio      # Open Drizzle Studio

# Extract i18n strings for translation
pnpm lingui:extract

# Find unused exports / dead code
dotenvx run -- pnpm knip
```

**There is no test framework configured.** No unit, integration, or E2E tests exist in the codebase.

## Local Development Setup

1. Copy `.env.example` to `.env` and configure environment variables
2. Start required services: `docker compose -f compose.dev.yml up -d`
   - PostgreSQL (port 5432)
   - Browserless/Chromium for PDF generation (port 4000)
   - SeaweedFS for S3-compatible storage (port 8333)
   - Mailpit for email testing (ports 1025, 8025)
   - Adminer for DB management (port 8080)
3. Run `pnpm dev`

Database migrations run automatically on server startup via the Nitro plugin at `plugins/1.migrate.ts`.

## Architecture

### Directory Structure

- `src/routes/` - TanStack Router file-based routing
- `src/integrations/` - External service integrations (auth, database, ORPC, AI, email, import)
- `src/integrations/orpc/router/` - oRPC server routers (procedure definitions)
- `src/integrations/orpc/services/` - oRPC server services (business logic)
- `src/integrations/orpc/dto/` - Data transfer objects
- `src/integrations/orpc/context.ts` - Auth and request context setup
- `src/components/` - React components organized by feature
- `src/components/ui/` - Shadcn UI components (Radix + Phosphor icons)
- `src/schema/` - Zod schemas for validation
- `src/hooks/` - Custom React hooks
- `plugins/` - Nitro server plugins (auto-migration on startup)
- `migrations/` - Drizzle database migrations
- `locales/` - i18n translation files (managed by Lingui)
- `docs/` - Documentation (Mintlify)

### Key Integrations (`src/integrations/`)

- **auth/** - Better Auth configuration (session-based + API key via `x-api-key` header)
- **drizzle/** - Database schema and client (PostgreSQL)
- **orpc/** - Type-safe RPC router with procedures for ai, auth, flags, printer, resume, statistics, storage
- **query/** - TanStack Query client configuration
- **ai/** - AI provider integrations (OpenAI, Anthropic, Google Gemini, Ollama)
- **email/** - Nodemailer integration (falls back to console logging if SMTP is not configured)
- **import/** - Resume file parsing/import

### ORPC Procedure Types

Three procedure types exist in `src/integrations/orpc/context.ts`:
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authenticated user (session or API key)
- `serverOnlyProcedure` - Server-side calls only

Procedures follow this pattern:
```ts
const handler = protectedProcedure
  .route({ method: "GET", path: "/resumes/{id}", tags: ["Resumes"], ... })
  .input(schema)
  .output(schema)
  .handler(async ({ context, input }) => { ... })
```

### Resume Data Model

The resume schema is defined in `src/schema/resume/data.ts`. Key concepts:
- **ResumeData** - Complete resume data including basics, sections, customSections, metadata
- **Sections** - Built-in sections (profiles, experience, education, skills, etc.)
- **CustomSections** - User-created sections that follow one of the built-in section types
- **Metadata** - Template, layout, typography, design settings, custom CSS

### Resume Templates

13 templates in `src/components/resume/templates/` (Pokemon-themed names):
azurill, bronzor, chikorita, ditgar, ditto, gengar, glalie, kakuna, lapras, leafish, onyx, pikachu, rhyhorn

Shared rendering components live in `src/components/resume/shared/`.

### Database Schema

Defined in `src/integrations/drizzle/schema.ts`:
- `user`, `session`, `account`, `verification`, `twoFactor`, `passkey`, `apikey` - Better Auth tables
- `resume` - Stores Resume Data as JSONB (defined in `src/schema/resume/data.ts`)
- `resumeStatistics` - Views/Download tracking

### Routing

Uses TanStack Router with file-based routing. Key routes:
- `/_home/` - Public landing pages
- `/auth/` - Authentication flows
- `/dashboard/` - User dashboard and resume management
- `/builder/$resumeId/` - Resume editor
- `/printer/$resumeId/` - PDF rendering endpoint
- `/api/` - Public API endpoints
- `/mcp/` - MCP server endpoint for LLM integration

Routes use `createFileRoute()` with `beforeLoad()` for auth guards and `loader()` for server-side data fetching.

### MCP Server

An MCP (Model Context Protocol) server is available at `/mcp/` for LLM-based resume interaction. It requires an `x-api-key` header for authentication. Configuration is in `src/routes/mcp/` with helper modules for resources, prompts, and tools.

### State Management

- **Zustand** - Client-side state (resume editor state in `src/components/resume/store/`)
- **Zundo** - Undo/redo history for resume edits (built on Zustand)
- **TanStack Query** - Server state and caching (configured via ORPC integration)

### Global Providers

Defined in `src/routes/__root.tsx`:
- I18nProvider (Lingui), ThemeProvider, MotionConfig, IconContext (Phosphor Icons)
- ConfirmDialogProvider, PromptDialogProvider, DialogManager, CommandPalette, Toaster

## Code Style

- Uses **Biome** for linting and formatting (`biome.json`)
- Tab indentation, double quotes, 120 character line width
- Imports are auto-organized; unused imports are errors
- a11y rules are disabled
- Path alias: `@/` maps to `src/`
- Tailwind CSS v4 with sorted class names (enforced by Biome's `useSortedClasses`)
- Uses `cn()` utility (from `@/utils/style`) for conditional class names
- Uses `cva()` for component variants
- Shadcn UI components in `src/components/ui/` (Radix UI + Phosphor icons, zinc base color)
- i18n strings use Lingui macros: `<Trans>`, `t`, `msg`
- TypeScript strict mode enabled; `noUnusedLocals` and `noUnusedParameters` enforced

## Environment Variables

Key variables (see `.env.example` for full list):
- `APP_URL` - Application URL
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Secret for authentication
- `PRINTER_ENDPOINT` - WebSocket endpoint for PDF printer service
- `PRINTER_APP_URL` - Internal URL for printer to reach the app (important for Docker)
- `S3_*` - S3-compatible storage configuration (falls back to local `/data` filesystem)
- `SMTP_*` - Email configuration (falls back to console logging)
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth (optional)
- `GITHUB_CLIENT_ID/SECRET` - GitHub OAuth (optional)
- `OAUTH_*` - Custom OAuth provider (optional)
- `FLAG_DEBUG_PRINTER` - Debug PDF printing endpoint
- `FLAG_DISABLE_SIGNUPS` - Block new account registration
- `FLAG_DISABLE_EMAIL_AUTH` - Disable email/password login
- `FLAG_DISABLE_IMAGE_PROCESSING` - Disable image processing

## Build & Deployment

- **Build output**: `.output/` directory (Nitro server bundle)
- **Production start**: `node .output/server/index.mjs`
- **Docker**: Multi-stage Dockerfile with Node 24-slim base
- **Health check**: `GET /api/health`
- **PWA**: Configured via vite-plugin-pwa with auto-update, standalone display, dark theme
