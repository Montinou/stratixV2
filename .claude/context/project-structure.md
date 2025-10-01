---
created: 2025-09-29T04:50:25Z
last_updated: 2025-09-29T04:50:25Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Overview

```
stratixV2/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md              # Project-specific instructions
│   ├── context/               # Project context documentation
│   ├── epics/                 # Epic planning and tracking
│   └── prds/                  # Product requirement documents
├── app/                       # Next.js App Router structure
│   ├── api/                   # API routes
│   │   ├── invitations/       # Invitation system endpoints
│   │   └── onboarding/        # Onboarding flow endpoints
│   ├── setup/                 # Setup and initialization pages
│   ├── tools/                 # Internal tools and admin pages
│   ├── handler/               # Stack Auth handler routes
│   ├── onboarding/            # Onboarding UI pages
│   │   └── create/            # Organization creation page
│   ├── invite/                # Invitation acceptance pages
│   ├── pending-approval/      # Pending approval page
│   ├── favicon.ico           # Application favicon
│   ├── globals.css           # Global CSS styles
│   ├── layout.tsx            # Root layout component
│   ├── loading.tsx           # Global loading component
│   └── page.tsx              # Homepage component
├── components/               # React components
│   ├── admin/               # Admin panel components
│   ├── navigation/          # Navigation components
│   ├── okr/                # OKR (Objectives & Key Results) components
│   ├── providers/          # React context providers
│   └── ui/                 # shadcn/ui component library
├── lib/                     # Utility libraries and configurations
│   ├── ai/                 # AI integration utilities
│   ├── cache/              # Caching utilities (Redis)
│   ├── okr/                # OKR business logic
│   ├── organization/       # Organization and multi-tenant services
│   ├── access.ts           # Access control utilities
│   ├── admin.ts            # Admin functionality
│   ├── auth.ts             # Authentication utilities (enhanced for multi-tenant)
│   ├── setup.ts            # Setup utilities
│   └── utils.ts            # General utilities
├── db/                      # Database configuration
│   └── okr-schema.ts       # Enhanced schema with tenant support
├── config/                  # Application configuration files
├── drizzle/                # Database migrations and schema
│   ├── 0004_add_tenant_id.sql        # Multi-tenant migration
│   ├── 0005_rls_policies.sql         # RLS policies
│   └── 0006_onboarding_invitations.sql  # Onboarding tables
├── scripts/                # Utility scripts
│   └── migrate-existing-data.ts  # Data migration script
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
├── stack/                  # Stack Auth configuration
│   ├── client.tsx          # Client-side Stack Auth
│   └── server.tsx          # Server-side Stack Auth
├── middleware.ts           # Next.js middleware
├── next.config.ts          # Next.js configuration
└── docs/                   # Project documentation
```

## Application Architecture

### App Router Structure (`app/`)
- **Nested routing**: Using Next.js 15 App Router pattern
- **Layout hierarchy**: Root layout with nested page-specific layouts
- **Route organization**:
  - `/setup` - Initial application setup
  - `/tools` - Internal administrative tools
  - `/handler` - Stack Auth authentication handlers

### Component Organization (`components/`)

**UI Components (`ui/`):**
- Built with shadcn/ui and Radix UI primitives
- Consistent design system components
- Fully typed with TypeScript
- Customizable through Tailwind CSS

**Feature Components:**
- `admin/` - Administrative interface components
- `okr/` - Objectives and Key Results management
- `navigation/` - Site navigation and menu components
- `providers/` - React Context providers for state management

### Library Structure (`lib/`)

**Core Utilities:**
- `auth.ts` - Stack Auth integration and utilities
- `access.ts` - Role-based access control (RBAC)
- `admin.ts` - Admin panel functionality
- `utils.ts` - General utility functions

**Feature Libraries:**
- `ai/` - AI integration and utilities
- `okr/` - Business logic for OKR management
- `cache/` - Redis caching implementation

### Database Structure (`drizzle/`)
- Migration files for database schema evolution
- Drizzle ORM configuration
- Schema definitions and relationships

## File Naming Conventions

### Components
- **React Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Page Components**: lowercase (e.g., `page.tsx`, `layout.tsx`)
- **Hook files**: camelCase with 'use' prefix (e.g., `useAuth.ts`)

### Utilities and Libraries
- **Utility files**: kebab-case (e.g., `user-utils.ts`)
- **Configuration**: kebab-case (e.g., `auth-config.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`)

## Import Patterns

**Absolute Imports**: Configured with TypeScript path mapping
```typescript
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
```

**Barrel Exports**: Used for component groups
```typescript
// components/okr/index.ts
export { ObjectiveCard } from './ObjectiveCard'
export { KeyResultForm } from './KeyResultForm'
```

## Asset Organization

**Static Assets** (`public/`):
- Images, icons, and other static resources
- Logo and branding assets
- Documentation images

**Styles**:
- Global styles in `app/globals.css`
- Component-specific styles via Tailwind CSS classes
- CSS variables for theming in global stylesheet

## Configuration Files

- `next.config.ts` - Next.js configuration with TypeScript
- `drizzle.config.ts` - Database ORM configuration
- `tsconfig.json` - TypeScript compiler options
- `components.json` - shadcn/ui component configuration
- `.env.development.local` - Local environment variables

This structure supports a scalable internal tools application with clear separation of concerns, modern React patterns, and enterprise-grade authentication and database integration.