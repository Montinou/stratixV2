---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-24T05:32:18Z
version: 1.0
author: Claude Code PM System
---

# Technical Context

## Technology Stack Overview

### Core Framework & Runtime
- **Next.js**: 14.2.16 (React-based full-stack framework)
- **React**: ^18 with React DOM
- **TypeScript**: ^5 (Strict mode enabled)
- **Node.js**: Supported versions 18+ (inferred from stack)

### Database & Authentication Stack
- **Database**: NeonDB PostgreSQL 17.5 (Serverless PostgreSQL)
- **Database Client**: `pg` 8.16.3 (Direct PostgreSQL driver)
- **Authentication**: NeonAuth via `@stackframe/stack` 2.8.39
- **Connection Management**: SSL with connection pooling

### UI & Styling Framework
- **Styling**: Tailwind CSS 4.1.9 with PostCSS
- **Component System**: Shadcn/ui built on Radix UI primitives
- **Icons**: Lucide React ^0.454.0
- **Theme Management**: next-themes ^0.4.6

### Data Handling & Validation
- **Forms**: React Hook Form ^7.60.0
- **Validation**: Zod 3.25.67 with @hookform/resolvers ^3.10.0
- **Data Processing**: Papa Parse (CSV), XLSX (Excel), Date-fns
- **Charts**: Recharts (latest)

## Dependency Catalog

### Production Dependencies (85 total)
```json
{
  "@ai-sdk/openai": "latest",
  "@stackframe/stack": "^2.8.39",
  "@vercel/analytics": "latest",
  "ai": "latest",
  "next": "14.2.16",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5",
  // ... 77 more dependencies
}
```

### UI Component Library (Radix UI)
- **Dialog System**: @radix-ui/react-dialog, alert-dialog
- **Navigation**: @radix-ui/react-navigation-menu, dropdown-menu
- **Input Components**: @radix-ui/react-select, checkbox, radio-group
- **Layout**: @radix-ui/react-separator, scroll-area, tabs
- **Feedback**: @radix-ui/react-toast, popover, tooltip
- **Version Range**: 1.1.x to 2.2.x (latest stable)

### Development Dependencies
- **Linting**: ESLint ^8.57.1 with eslint-config-next ^15.5.3
- **Build Tools**: PostCSS ^8.5, Autoprefixer ^10.4.20
- **Tailwind Ecosystem**: tailwindcss ^4.1.9, tailwind-merge ^2.5.5
- **Development Tools**: neonctl ^2.15.0, tw-animate-css 1.3.3

### Utility Libraries
- **Class Management**: class-variance-authority ^0.7.1, clsx ^2.1.1
- **Data Processing**: lodash (latest), @types/lodash ^4.17.20
- **Styling Utilities**: tailwind-merge ^2.5.5, tailwindcss-animate ^1.0.7

## Development Environment

### Available NPM Scripts
```bash
# Core Development
npm run dev                    # Next.js development server (port 3000)
npm run build                  # Production build with pre-build migration
npm run start                  # Start production server
npm run lint                   # ESLint code quality check

# Database Operations (NeonDB)
npm run migrate                # Execute database migrations
npm run migrate:with-seed      # Run migrations with seed data
npm run migrate:validate       # Validate current migration state
npm run migrate:test-connection # Test database connectivity

# Deployment & Health Checks
npm run deploy:health-check    # Pre-deployment health validation
npm run deploy:check-migration # Check if migration is needed

# Rollback & Recovery System
npm run rollback               # Automated rollback system
npm run rollback:manual        # Manual rollback process
npm run rollback:emergency     # Emergency rollback protocol
npm run rollback:backup        # Create database backup
npm run rollback:state         # Check rollback system state

# Neon Branch Management
npm run neon:cleanup           # Clean up Neon branches
npm run neon:branch            # Create/manage Neon branches
```

### Build Configuration
- **Pre-build Hook**: Automated migration execution before builds
- **TypeScript**: Strict mode with ES6 target
- **ESLint**: Next.js configuration with build error ignoring
- **Image Optimization**: Disabled for compatibility
- **Path Aliases**: `@/*` maps to project root

## Database Architecture

### NeonDB Configuration
- **Engine**: PostgreSQL 17.5 (Latest serverless PostgreSQL)
- **Connection**: Direct via `pg` client with SSL
- **Pooling**: Connection pooling for performance
- **Migration System**: Automated with validation and rollback
- **Environment**: Production-ready with Vercel integration

### Database Services Layer
- **Client Management**: Custom PostgreSQL service layer
- **Server Actions**: Next.js 14 server actions for mutations
- **Type Safety**: TypeScript types for all database entities
- **Connection Health**: Automated health checks and monitoring

### Migration Infrastructure
- **Schema Migrations**: Versioned SQL in `@scripts/migrations/`
- **Initialization**: Database setup scripts in `@scripts/init/`
- **Validation**: Schema and data validation in `@scripts/validation/`
- **Rollback**: Comprehensive rollback scripts in `@scripts/rollback/`

## Authentication System

### NeonAuth (Stack Auth)
- **Provider**: `@stackframe/stack` modern authentication system
- **Session Management**: Database-backed sessions
- **Client Configuration**: Separate client/server auth clients
- **Middleware**: Next.js middleware for route protection
- **User Profiles**: Database-integrated user profile management

### Security Features
- **Session Storage**: Database-backed for scalability
- **Route Protection**: Middleware-based auth validation
- **Type Safety**: Full TypeScript support for auth flows
- **SSL Security**: Secure connections throughout

## Performance & Optimization

### Frontend Performance
- **Next.js 14**: App Router with React Server Components
- **Code Splitting**: Automatic bundle optimization
- **Image Optimization**: Next.js Image component (disabled for compatibility)
- **CSS Optimization**: Tailwind CSS with PostCSS processing
- **Bundle Analysis**: Integrated with Vercel Analytics

### Database Performance
- **Connection Pooling**: PostgreSQL connection optimization
- **Query Optimization**: Direct SQL queries for performance
- **SSL Connections**: Secure and optimized connections
- **Migration Performance**: Optimized migration execution

### Deployment Performance
- **Vercel Platform**: Edge deployment optimization
- **Pre-build Optimization**: Automated migration before builds
- **Health Monitoring**: Performance tracking during deployment
- **Caching**: Vercel edge caching and optimization

## Development Tools & Workflow

### Code Quality
- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Next.js configuration with custom rules
- **Zod Validation**: Runtime type validation
- **Import Resolution**: Path aliases and module resolution

### Development Workflow
- **Package Manager**: npm (standard Node.js)
- **Hot Reload**: Next.js development server
- **Type Checking**: Real-time TypeScript validation
- **Linting**: Automatic code quality checks

### Component Development
- **Shadcn/ui**: Component system with CLI support
- **Radix UI**: Accessible component primitives
- **Storybook**: None configured (could be added)
- **Testing**: No framework currently configured

## AI & Integration Features

### AI Integration
- **Vercel AI SDK**: `ai` package (latest)
- **OpenAI Integration**: `@ai-sdk/openai` (latest)
- **AI Components**: Custom components in `components/ai/`
- **Smart Features**: AI insights, suggestions, and smart input

### External Integrations
- **Vercel Analytics**: Performance and usage analytics
- **GitHub Integration**: Version control and issue tracking
- **Claude Code PM**: Project management and task orchestration
- **Neon Integration**: Direct database management

## Configuration Files

### Core Configuration
- `next.config.mjs` - Next.js configuration with build optimizations
- `tailwind.config.ts` - Tailwind CSS configuration with Shadcn/ui
- `tsconfig.json` - TypeScript strict mode configuration
- `components.json` - Shadcn/ui component configuration
- `postcss.config.mjs` - PostCSS with Tailwind processing

### Environment Configuration
- `vercel.json` - Vercel deployment and routing configuration
- `middleware.ts` - Next.js middleware for authentication
- `.env.local` - Local environment variables (not in repo)
- Package configuration optimized for production deployment

## Version Compatibility & Requirements

### Runtime Requirements
- **Node.js**: 18+ (required for Next.js 14 and React 18)
- **Browser Support**: Modern browsers with ES6+ support
- **SSL Support**: Required for NeonDB connections
- **Deployment**: Vercel platform optimized

### Compatibility Notes
- **Image Optimization**: Disabled for compatibility
- **Build Ignores**: TypeScript and ESLint errors ignored during builds
- **Dependency Versions**: Latest stable releases used throughout
- **Package Lock**: npm package-lock.json for dependency stability

## Security & Compliance

### Security Measures
- **Authentication**: Modern NeonAuth system with database sessions
- **Database Security**: SSL connections, connection pooling, parameterized queries
- **Environment Variables**: Secure environment management
- **Type Safety**: TypeScript throughout for reduced runtime errors

### Best Practices
- **Input Validation**: Zod validation for all user inputs
- **SQL Injection Prevention**: Parameterized queries with pg client
- **Session Security**: Database-backed session management
- **HTTPS Enforcement**: SSL connections required for all services

---

**Last Updated**: 2025-09-24T05:32:18Z  
**Version**: 1.0 - Complete technical stack documentation post-NeonDB migration  
**Key Change**: Migrated from Supabase to NeonDB + NeonAuth with comprehensive deployment automation