---
created: 2025-10-02T03:02:00Z
last_updated: 2025-10-02T03:36:10Z
version: 1.1
author: Claude Code PM System
---

# Project Structure

## Directory Organization

### Root Level
```
stratixV2/
├── app/                    # Next.js App Router (main application)
├── components/             # Reusable UI components
├── lib/                    # Core libraries and utilities
├── public/                 # Static assets
├── docs/                   # Project documentation
├── @scripts/               # Deployment and automation scripts
├── .claude/                # Claude Code configuration and context
├── db/                     # Database schemas and migrations
└── [config files]          # Various configuration files
```

## App Directory (`/app`)

**Route Structure:** Next.js 15 App Router with nested layouts

### Main Routes
- `/` - Landing/home page
- `/dashboard/` - Main dashboard
- `/analytics/` - Analytics and reporting
- `/objectives/` - OKR objectives management
- `/initiatives/` - Strategic initiatives
- `/activities/` - Activity tracking
- `/team/` - Team management
- `/profile/` - User profile
- `/companies/` - Company management
- `/import/` - Data import functionality
- `/insights/` - Business insights

### Special Routes
- `/api/` - API routes and endpoints
  - `/api/company/` - Company settings and logo management
  - `/api/cron/` - Scheduled jobs (cleanup, reminders)
  - `/api/invitations/` - Invitation management endpoints
  - `/api/webhooks/` - Webhook handlers (Brevo, etc.)
- `/handler/` - Stack Auth handlers
- `/setup/` - Initial setup and onboarding
- `/invite/` - Invitation system
- `/onboarding/` - User onboarding flow
- `/pending-approval/` - Approval workflows
- `/tools/` - Utility tools
  - `/tools/admin/` - Admin panel and settings

### Core Files
- `layout.tsx` - Root layout with AuthProvider
- `page.tsx` - Home page
- `error.tsx` - Error boundary
- `loading.tsx` - Loading state
- `globals.css` - Global styles with CSS variables

## Components Directory (`/components`)

### Organization by Feature
```
components/
├── admin/          # Admin panel components
│   └── invitations/ # Invitation management UI
│       ├── InvitationController.tsx
│       ├── InvitationForm.tsx
│       ├── InvitationStats.tsx
│       └── InvitationsTable.tsx
├── ai/             # AI-related components
├── areas/          # Area management UI
├── charts/         # Chart and visualization components
├── dashboard/      # Dashboard-specific components
├── import/         # Import workflow components
├── navigation/     # Navigation and menu components
├── okr/            # OKR-specific components
├── providers/      # React context providers
│   └── company-theme-provider.tsx # Company theming
└── ui/             # Base UI components (Shadcn/ui)
```

### UI Components Pattern
- **Base Components:** `/components/ui/` - Shadcn/ui primitives
- **Composite Components:** Feature-specific directories
- **Layout Components:** Navigation, sidebars, headers
- **Form Components:** Input wrappers, validation displays

## Library Directory (`/lib`)

### Core Modules
```
lib/
├── ai/             # AI integration utilities
├── cache/          # Caching mechanisms
├── database/       # Database clients and RLS
│   ├── rls-client.ts
│   └── test-rls-client.ts
├── okr/            # OKR business logic
├── organization/   # Organization management
├── services/       # Business services layer
│   ├── brevo/      # Email service integration
│   │   ├── client.ts        # Brevo API client
│   │   ├── email-sender.ts  # Email sending utilities
│   │   ├── templates.ts     # Email templates
│   │   └── index.ts         # Public API
│   └── import-service-v2.ts # Data import service
├── access.ts       # Access control
├── admin.ts        # Admin utilities
├── auth.ts         # Authentication helpers
├── setup.ts        # Setup utilities
├── stack-auth-*.ts # Stack Auth integration
└── utils.ts        # General utilities
```

### Key Libraries
- **Database:** RLS-enabled PostgreSQL client
- **Authentication:** Stack Auth integration and utilities
- **Services:** Business logic and data operations
- **OKR:** OKR-specific business rules
- **AI:** AI integration and processing

## Database Directory (`/db`)

**Contains:**
- Drizzle ORM schemas
- Migration files
- Database utilities
- Schema definitions (okr-schema, etc.)

## Documentation (`/docs`)

**Key Documents:**
- `EPIC_REAL_DATA_INFRASTRUCTURE_SUMMARY.md` - Infrastructure documentation
- `INVITATION_SYSTEM_SETUP.md` - Invitation system guide
- `STACK_AUTH_SETUP.md` - Auth setup instructions
- `WHITELIST_PRE_APPROVAL_SYSTEM.md` - Approval system documentation
- `performance-benchmark-results.md` - Performance metrics
- `rls-verification.md` - RLS security verification
- `security-audit-report.md` - Security audit findings

**Root Level Documentation:**
- `BREVO_CONFIGURATION_GUIDE.md` - Brevo email service setup
- `INVITATION_SYSTEM_SUMMARY.md` - Invitation system overview

## Scripts Directory (`/@scripts` and `/scripts`)

**Purpose:** Deployment, migration, and automation scripts

**Testing Scripts (`/scripts`):**
- `test-brevo.ts` - Brevo email integration testing
- `test-send-invitation.ts` - Invitation email testing

## File Naming Conventions

### TypeScript/React Files
- **Components:** PascalCase (e.g., `UserProfile.tsx`)
- **Utilities:** kebab-case (e.g., `auth-helpers.ts`)
- **Hooks:** use-prefix (e.g., `use-user.ts`)
- **Types:** kebab-case with .types suffix (e.g., `okr.types.ts`)
- **API Routes:** lowercase (e.g., `route.ts`)

### Directory Naming
- **Feature directories:** lowercase (e.g., `dashboard/`, `objectives/`)
- **Component groups:** lowercase (e.g., `ui/`, `charts/`)
- **Private scripts:** @-prefix (e.g., `@scripts/`)

## Module Organization

### Import Patterns
- **Absolute imports:** `@/` prefix for root-level imports
- **Relative imports:** Within same feature directory
- **Barrel exports:** `index.ts` files for public API

### Code Colocation
- Components colocated with related logic
- Tests alongside implementation files
- Types near usage when specific to module
- Shared types in `/lib/types/`

## Build Artifacts

**Generated Directories (Ignored in Git):**
- `.next/` - Next.js build output
- `node_modules/` - Dependencies
- `.vercel/` - Vercel deployment config

## Configuration Files

- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `.env.local` - Environment variables (not in git)
- `.gitignore` - Git ignore patterns
- `.prettierrc` - Code formatting rules
- `.eslintrc.json` - Linting rules
