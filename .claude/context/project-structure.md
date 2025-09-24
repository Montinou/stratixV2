---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-24T05:32:18Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Layout

```
stratixV2/
├── .claude/                    # Claude Code PM system
│   ├── agents/                 # Task-oriented agents (design, engineering, product, testing)
│   ├── commands/               # Command definitions
│   ├── context/               # Project context files (this directory)
│   ├── epics/                 # Epic management workspace
│   ├── prds/                  # Product Requirements Documents
│   └── scripts/pm/            # Project management automation
├── @scripts/                  # Deployment and migration automation
│   ├── deploy/               # Deployment automation toolkit  
│   ├── init/                 # Database initialization scripts
│   ├── migrations/           # Database migration files
│   ├── rollback/            # Rollback scripts
│   └── validation/          # Schema and data validation
├── app/                      # Next.js App Router
│   ├── activities/          # Activity management pages
│   ├── initiatives/         # Strategic initiatives pages
│   ├── objectives/          # OKR objectives pages
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with AuthProvider
│   └── page.tsx             # Home page
├── components/              # React components (Shadcn/UI architecture)
│   ├── ai/                  # AI-related components (insights, suggestions)
│   ├── charts/             # Chart components (Recharts)
│   ├── import/             # Data import functionality
│   ├── layout/             # Layout components (sidebar, dashboard-layout)
│   ├── okr/                # OKR-specific components (cards, progress bars)
│   └── ui/                 # Shadcn/ui base components
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
│   ├── ai/                  # AI functionality (insights, suggestions)
│   ├── types/              # TypeScript type definitions
│   └── utils.ts            # Shadcn utility functions (cn)
├── public/                  # Static assets and placeholders
├── scripts/                 # Legacy SQL migration scripts
├── stack/                   # NeonAuth (Stack) configuration
│   ├── client.ts           # Client-side auth
│   └── server.ts           # Server-side auth
├── styles/                  # Additional CSS styles
├── docs/                    # Project documentation
├── install/                 # Installation scripts for CCPM
├── components.json          # Shadcn/ui configuration
├── middleware.ts            # Next.js middleware for auth
├── next.config.mjs          # Next.js configuration
├── package.json             # Dependencies and npm scripts
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vercel.json              # Vercel deployment configuration
```

## Architecture Patterns

### Next.js App Router Structure
- **App Directory**: Uses Next.js 14.2.16 App Router pattern
- **Route Groups**: Organized by feature (activities, initiatives, objectives)
- **Loading States**: Loading.tsx files for better UX
- **Layouts**: Hierarchical layout system with shared components

### Component System (Shadcn/UI)
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **Component Variants**: Class Variance Authority (CVA) for consistent styling
- **Icon System**: Lucide React icons throughout
- **Theme System**: Next-themes with CSS variable-based theming

### Database Architecture
- **Direct PostgreSQL**: NeonDB with `pg` client (no ORM)
- **Migration System**: Versioned SQL migrations in `@scripts/migrations/`
- **Service Layer**: Database services in `lib/` with server actions
- **Type Safety**: TypeScript types for all database entities

### Authentication Flow
- **NeonAuth (Stack)**: Modern authentication system
- **Middleware**: Auth validation at Next.js middleware level
- **Client/Server**: Separate auth clients for different contexts
- **Session Management**: Database-backed sessions

## Key Directories Deep Dive

### `/app/` - Next.js Application
```
app/
├── activities/              # Activity tracking and management
├── initiatives/             # Strategic initiative pages  
├── objectives/              # OKR objectives management
├── globals.css              # Global Tailwind styles
├── layout.tsx               # Root layout with providers
└── page.tsx                 # Homepage/dashboard
```

### `/components/` - UI Component Library
```
components/
├── ai/                      # AI-powered components
│   ├── insights-card.tsx    # Analytics insights
│   ├── smart-input.tsx      # AI-enhanced input fields
│   └── suggestion-panel.tsx # Smart suggestions
├── charts/                  # Data visualization
│   ├── completion-rate-chart.tsx
│   ├── progress-overview-chart.tsx
│   └── [5 more chart components]
├── import/                  # File import functionality
├── layout/                  # Layout components
│   ├── dashboard-layout.tsx # Main dashboard wrapper
│   └── sidebar.tsx         # Navigation sidebar  
├── okr/                     # OKR-specific UI
│   ├── objective-card.tsx   # Objective display cards
│   ├── progress-bar.tsx     # Progress visualization
│   └── status-badge.tsx     # Status indicators
└── ui/                      # Base Shadcn/ui components
    ├── button.tsx           # Button variants
    ├── card.tsx            # Card component
    ├── dialog.tsx          # Modal dialogs
    └── [15+ base components]
```

### `/@scripts/` - DevOps & Migration
```
@scripts/
├── deploy/                  # Deployment automation
│   ├── pre-build-migration.sh     # Pre-build checks & migration
│   └── rollback-migration.sh      # Multi-level rollback system
├── init/                    # Database setup
│   ├── 001_initial_schema.sql     # Core schema
│   └── 004_seed_sample_data.sql   # Sample data
├── migrations/              # Versioned migrations
│   ├── 002_add_multitenant_support.sql
│   ├── 003_add_ai_suggestions.sql
│   └── 004_add_memory_system_neondb.sql
├── rollback/               # Rollback scripts
└── validation/             # Health & validation checks
    ├── validate_data.sql
    └── validate_schema.sql
```

### `/.claude/` - Project Management System
```
.claude/
├── agents/                  # Specialized development agents
│   ├── design/             # UI/UX design agents
│   ├── engineering/        # Development agents  
│   ├── product/            # Product management agents
│   ├── project-management/ # PM coordination agents
│   └── testing/           # QA and testing agents
├── context/                # Project context files
├── epics/                  # Epic management workspace
├── prds/                   # Product Requirements Documents
└── scripts/pm/             # Project management automation
```

### `/lib/` - Utilities & Services
```
lib/
├── ai/                     # AI functionality
│   ├── insights.ts        # Analytics insights generation
│   └── suggestions.ts     # Smart suggestions engine
├── types/                 # TypeScript definitions
│   ├── import.ts         # Import functionality types
│   └── okr.ts           # OKR domain types
└── utils.ts              # Shadcn utility functions
```

## File Naming Conventions

### Components
- **React Components**: PascalCase with descriptive names (`ObjectiveCard`, `ProgressBar`)
- **UI Components**: Kebab-case file names, PascalCase exports (`button.tsx` → `Button`)
- **Page Components**: Lowercase matching routes (`page.tsx`, `loading.tsx`)

### Scripts & Configuration
- **Migration Scripts**: Numbered with descriptive names (`001_initial_schema.sql`)
- **Shell Scripts**: Kebab-case with clear purpose (`run_migration_neondb.sh`)
- **Config Files**: Standard naming conventions (`next.config.mjs`, `tailwind.config.ts`)

### Data & Types
- **Type Definitions**: Domain-based organization (`okr.ts`, `import.ts`)
- **Service Files**: Functional naming (`insights.ts`, `suggestions.ts`)

## Integration Points

### Database Integration
- **Primary Database**: NeonDB PostgreSQL 17.5
- **Connection**: Direct `pg` client with connection pooling
- **Migration**: Automated pre-build migration system
- **Validation**: Comprehensive schema and data validation

### Authentication Integration
- **Auth Provider**: NeonAuth (Stack Auth system)
- **Session Management**: Database-backed sessions
- **Middleware**: Next.js middleware for route protection
- **Client Types**: Separate client/server auth configurations

### Deployment Integration  
- **Platform**: Vercel with specialized configuration
- **Build Process**: Pre-build migration automation
- **Health Checks**: Automated deployment validation
- **Rollback**: Multi-level rollback system (auto/manual/emergency)

### Development Integration
- **Project Management**: Claude Code PM system
- **Version Control**: Git with GitHub for issue tracking
- **AI Assistance**: Specialized agents for different development tasks

## Development Patterns

### TypeScript Usage
- **Strict Mode**: Full TypeScript strict mode enabled
- **Type Definitions**: Comprehensive type coverage for all domains
- **Build Process**: Type checking integrated into build pipeline

### Styling Approach
- **Primary**: Tailwind CSS utility-first approach
- **Components**: Shadcn/ui component system with Radix UI primitives
- **Theme**: CSS variables for consistent theming
- **Responsive**: Mobile-first responsive design patterns

### State Management
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NeonAuth state management
- **Local State**: React hooks for component state
- **Server State**: Server actions for data mutations

## Security & Performance

### Security Measures
- **Authentication**: Modern auth system with NeonAuth
- **Database**: Parameterized queries, no SQL injection vectors
- **Environment**: Secure environment variable management
- **Middleware**: Request validation and auth checks

### Performance Optimizations
- **Database**: Connection pooling and query optimization
- **Frontend**: Next.js App Router with built-in optimizations
- **Images**: Next.js Image component for optimization
- **Bundle**: Code splitting and tree shaking

---

**Last Updated**: 2025-09-24T05:32:18Z  
**Key Insight**: Modern OKR application with comprehensive migration from Supabase to NeonDB, featuring automated deployment and specialized AI development agents