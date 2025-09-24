---
created: 2025-09-24T00:43:39Z
last_updated: 2025-09-24T00:43:39Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Layout

```
stratixV2/
├── .claude/                 # Claude Code PM system files
├── app/                     # Next.js App Router pages and routes
├── components/              # React components organized by domain
├── lib/                     # Utility libraries and configurations
├── public/                  # Static assets
├── scripts/                 # Database and migration scripts
├── .env.local              # Local environment variables
├── .gitignore              # Git ignore configuration
├── CLAUDE.md               # Project instructions
├── README.md               # Project documentation (Claude Code PM)
├── package.json            # Node.js dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── next.config.js          # Next.js configuration
```

## Application Structure (Next.js App Router)

### App Directory (`/app/`)
```
app/
├── activities/             # Activity management pages
├── analytics/              # Analytics and reporting pages
├── api/                    # API routes
│   ├── objectives/         # Objectives API endpoints
│   └── profiles/           # Profile API endpoints
├── auth/                   # Authentication pages
├── companies/              # Company management pages
├── dashboard/              # Main dashboard page
├── import/                 # Data import functionality
├── initiatives/            # Strategic initiatives pages
├── insights/               # Business insights pages
├── objectives/             # OKR objectives management
├── profile/                # User profile pages
├── team/                   # Team management pages
├── globals.css             # Global styles
├── layout.tsx              # Root layout with providers
└── page.tsx                # Home/landing page
```

## Component Architecture (`/components/`)

### Component Organization
```
components/
├── ai/                     # AI-related components
├── auth/                   # Authentication components
├── charts/                 # Chart components (Recharts)
├── dashboard/              # Dashboard-specific components
├── import/                 # Import functionality components
├── layout/                 # Layout and navigation components
├── okr/                    # OKR-specific forms and displays
├── ui/                     # Shadcn/ui base components
└── theme-provider.tsx      # Theme switching provider
```

### UI Component System
- **Base Components**: Shadcn/ui built on Radix UI primitives
- **Design System**: Consistent styling with CSS variables
- **Accessibility**: Full ARIA compliance via Radix UI
- **Theming**: Dark/light mode support

## Library Structure (`/lib/`)

### Core Libraries
```
lib/
├── actions/                # Server actions for database operations
├── ai/                     # AI integration utilities
├── config/                 # Configuration files
├── database/               # Database client and services
├── hooks/                  # Custom React hooks
├── neon-auth/              # NeonAuth integration
├── supabase/               # Legacy Supabase integration (deprecated)
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
└── utils.ts                # Shadcn utils (cn function)
```

### Key Architectural Components
- **Database Layer**: PostgreSQL via NeonDB with service layer abstraction
- **Authentication**: Stack Auth integration replacing legacy Supabase
- **Type Safety**: Comprehensive TypeScript definitions
- **Server Actions**: Next.js server actions for database operations

## Data Flow Architecture

### Authentication Flow
1. Stack Auth handles user authentication
2. `AuthProvider` manages global auth state
3. `use-auth` hook provides auth context to components
4. Server middleware validates auth on protected routes

### Database Flow
1. PostgreSQL database hosted on NeonDB
2. `database/client.ts` - Database connection management
3. `database/services.ts` - Service layer with business logic
4. Server actions in `/lib/actions/` for data operations
5. API routes in `/app/api/` for external interfaces

## Migration Status

### Current State
- **Database**: Migrated from Supabase to PostgreSQL/NeonDB
- **Authentication**: Migrated from Supabase Auth to Stack Auth
- **UI Components**: Updated to use new database services
- **API Routes**: Converted to use PostgreSQL directly

### Legacy Components (Being Phased Out)
- `/lib/supabase/` - Legacy Supabase configuration
- `*-broken.tsx` files - Backup versions during migration

## File Naming Conventions

### Component Files
- **PascalCase** for component files (`ActivityForm.tsx`)
- **kebab-case** for page files (`activity-form.tsx`)
- **camelCase** for utility files (`fileImport.ts`)

### Directory Structure
- **Domain-based organization** - Components grouped by feature area
- **Shared components** in `/components/ui/`
- **Page components** in `/app/[route]/page.tsx`
- **Layout components** in respective `/app/[route]/layout.tsx`

## Development Scripts

### Available Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - Code linting
- `npm run db:init` - Initialize database
- `npm run db:migrate` - Run database migrations
- `npm run remove-supabase` - Clean up legacy Supabase references

## Dependencies Architecture

### Core Framework
- **Next.js 14.2.16** - React framework with App Router
- **TypeScript** - Static type checking
- **Tailwind CSS** - Utility-first styling

### Database & Auth
- **PostgreSQL** via NeonDB - Primary database
- **@stackframe/stack** - Authentication provider
- **pg** - PostgreSQL client library

### UI & Styling
- **Radix UI** - Accessible component primitives
- **Shadcn/ui** - Component library built on Radix
- **Tailwind CSS** - Utility styling system
- **Lucide React** - Icon library
- **next-themes** - Theme switching

### Data Handling
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **Papa Parse** - CSV parsing
- **xlsx** - Excel file processing
- **date-fns** - Date utilities

### Development Tools
- **ESLint** - Code linting
- **tsx** - TypeScript execution for scripts
- **PostCSS** - CSS processing