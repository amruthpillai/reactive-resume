# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reactive Resume is a free, open-source resume builder built with TanStack Start (React 19 + Vite), using ORPC for type-safe RPC APIs, Drizzle ORM with PostgreSQL, and Better Auth for authentication.

## Development Commands

```bash
# Start development server (runs on port 3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting (uses Biome)
pnpm lint

# Type checking
pnpm typecheck

# Database operations
pnpm db:generate    # Generate migration files
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema changes directly
pnpm db:studio      # Open Drizzle Studio

# Extract i18n strings for translation
pnpm lingui:extract

# Find unused exports
pnpm knip
```

## Local Development Setup

1. Copy `.env.example` to `.env` and configure environment variables
2. Start required services: `docker compose -f compose.dev.yml up -d`
   - PostgreSQL (port 5432)
   - Browserless/Chromium for PDF generation (port 4000)
   - SeaweedFS for S3-compatible storage (port 8333)
   - Mailpit for email testing (ports 1025, 8025)
   - Adminer for DB management (port 8080)
3. Run `pnpm dev`

## Architecture

### Directory Structure

- `src/routes/` - TanStack Router file-based routing
- `src/integrations/` - External service integrations (auth, database, ORPC, AI, email)
- `src/integrations/orpc/router` - oRPC server routers
- `src/integrations/orpc/services` - oRPC server services
- `src/components/` - React components organized by feature
- `src/schema/` - Zod schemas for validation
- `plugins/` - Nitro server plugins (eg. auto-migration on startup)
- `migrations/` - Drizzle database migrations
- `locales/` - i18n translation files (managed by Lingui)

### Key Integrations (`src/integrations/`)

- **auth/** - Better Auth configuration and client
- **drizzle/** - Database schema and client (PostgreSQL)
- **orpc/** - Type-safe RPC router with procedures for ai, auth, flags, printer, resume, statistics, storage
- **query/** - TanStack Query client configuration
- **ai/** - AI provider integrations (OpenAI, Anthropic, Google Gemini, Ollama)

### Resume Data Model

The resume schema is defined in `src/schema/resume/data.ts`. Key concepts:
- **ResumeData** - Complete resume data including basics, sections, customSections, metadata
- **Sections** - Built-in sections (profiles, experience, education, skills, etc.)
- **CustomSections** - User-created sections that follow one of the built-in section types
- **Metadata** - Template, layout, typography, design settings, custom CSS

### Resume Templates

Templates are React components in `src/components/resume/templates/`. Each template (azurill, bronzor, chikorita, etc.) renders the resume data with different visual styles. Templates use shared components from `src/components/resume/shared/`.

### Database Schema

Defined in `src/integrations/drizzle/schema.ts`:
- `user`, `session`, `account`, `verification`, `twoFactor`, `passkey`, `apikey` - Better Auth tables
- `resume` - Stores Resume Data as JSONB (defined in `src/schema/resume/data.ts`)
- `resumeStatistics` - Views/Download for Resume Tracking

### Routing

Uses TanStack Router with file-based routing. Key routes:
- `/_home/` - Public landing pages
- `/auth/` - Authentication flows
- `/dashboard/` - User dashboard and resume management
- `/builder/$resumeId/` - Resume editor
- `/printer/$resumeId/` - PDF rendering endpoint
- `/api/` - Public API endpoints

### State Management

- **Zustand** - Client-side state (resume editor state in `src/components/resume/store/`)
- **TanStack Query** - Server state and caching (configured via ORPC integration)

## Code Style

- Uses Biome for linting and formatting
- Tab indentation, double quotes, 120 character line width
- Path alias: `@/` maps to `src/`
- Tailwind CSS v4 with sorted class names (enforced by Biome)
- Uses `cn()` utility for conditional class names

## Environment Variables

Key variables (see `.env.example` for full list):
- `APP_URL` - Application URL
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Secret for authentication
- `PRINTER_ENDPOINT` - WebSocket endpoint for PDF printer service
- `S3_*` - S3-compatible storage configuration
- `FLAG_*` - Feature flags
