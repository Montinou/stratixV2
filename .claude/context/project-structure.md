---
created: 2025-10-01T09:07:54Z
last_updated: 2025-10-01T11:14:27Z
version: 1.1
author: Claude Code PM System
---

# Project Structure

## Directory Organization

### Root Structure
```
stratixV2/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                    # Libraries and utilities
├── db/                     # Database schemas
├── drizzle/               # Database migrations
├── public/                # Static assets
├── .claude/               # Claude Code configuration
├── .github/               # GitHub workflows
└── node_modules/          # Dependencies
```

### App Directory (`/app`)
Application pages using Next.js 15 App Router:

```
app/
├── api/                    # API routes
│   ├── activities/         # Activity CRUD endpoints
│   ├── areas/             # Areas management
│   ├── import/            # CSV/XLSX import endpoints
│   ├── initiatives/       # Initiative endpoints
│   ├── invitations/       # User invitation system
│   ├── objectives/        # Objective endpoints
│   └── onboarding/        # Onboarding flow
├── handler/               # Stack Auth handlers
├── invite/                # Invitation pages
├── onboarding/            # Onboarding pages
├── pending-approval/      # Approval workflow
├── setup/                 # Setup wizard
├── tools/                 # Admin tools
├── error.tsx              # Error boundary
├── layout.tsx             # Root layout with providers
├── loading.tsx            # Loading state
└── page.tsx               # Landing/home page
```

### Components Directory (`/components`)
Reusable UI components organized by domain:

```
components/
├── admin/                 # Admin-specific components
├── ai/                    # AI integration components
├── areas/                 # Areas management UI
│   ├── area-form.tsx      # Area creation/edit form
│   └── areas-page-client.tsx  # Areas listing page
├── charts/                # Chart components (Recharts)
├── dashboard/             # Dashboard widgets
├── import/                # Import UI components
├── navigation/            # Navigation components
├── okr/                   # OKR-specific components
├── providers/             # React context providers
└── ui/                    # Base Shadcn/ui components
    ├── button.tsx
    ├── dialog.tsx
    ├── form.tsx
    └── [50+ shadcn components]
```

### Library Directory (`/lib`)
Core application logic and utilities:

```
lib/
├── ai/                    # AI integration utilities
├── cache/                 # Caching utilities (Redis)
├── database/              # Database utilities
├── okr/                   # OKR business logic
├── organization/          # Organization management
├── services/              # Business services
├── access.ts              # Access control
├── admin.ts               # Admin utilities
├── auth.ts                # Authentication helpers
├── setup.ts               # Setup utilities
├── stack-auth-bypass.ts   # Auth bypass for migrations
├── stack-auth-utils.ts    # Stack Auth utilities
├── stack-auth.ts          # Stack Auth configuration
└── utils.ts               # General utilities
```

### Database Directory (`/db`)
Database schemas and configuration:

```
db/
├── okr-schema.ts          # OKR system schema (objectives, initiatives, activities, areas)
└── neon_auth_schema.ts    # NeonAuth user sync schema
```

## File Naming Patterns

### Components
- **Page Components**: `[feature]-page-client.tsx` (client components)
- **Form Components**: `[feature]-form.tsx`
- **Layout Components**: `layout.tsx`
- **UI Components**: `[component-name].tsx` (kebab-case)

### API Routes
- **CRUD Routes**: `app/api/[resource]/route.ts`
- **Actions**: `app/api/[resource]/[action]/route.ts`

### Type Definitions
- **Schemas**: `[feature]-schema.ts`
- **Types**: `types.ts` or `[feature]-types.ts`

## Module Organization

### API Layer
- RESTful endpoints in `app/api/`
- Route handlers follow Next.js conventions
- Middleware for authentication and validation

### Component Layer
- Domain-specific components in named folders
- Shared UI components in `components/ui/`
- Providers in `components/providers/`

### Service Layer
- Business logic in `lib/services/`
- Database operations in `lib/database/`
- Authentication in `lib/auth.ts` and `lib/stack-auth*.ts`

### Data Layer
- Drizzle ORM schemas in `db/schema.ts`
- Type-safe database operations
- Row Level Security policies in PostgreSQL

## Key Directories

### Configuration
- `.claude/` - Claude Code configuration and context
- `.github/` - GitHub Actions workflows
- `drizzle/` - Database migration files

### Development
- `node_modules/` - NPM dependencies
- `.next/` - Next.js build output (gitignored)

### Static Assets
- `public/` - Public static files
- `app/globals.css` - Global styles
- `app/favicon.ico` - Application favicon

## Import Patterns

### Path Aliases
TypeScript configured with `@/*` alias pointing to root:
```typescript
import { Button } from "@/components/ui/button"
import { db } from "@/lib/database/client"
import { stackServerApp } from "@/lib/stack-auth"
```

### Module Resolution
- Uses `bundler` module resolution (tsconfig.json)
- Supports ES modules
- TypeScript strict mode enabled

## Update History
- 2025-10-01T11:14:27Z: Updated database schema references to reflect okr-schema.ts structure
