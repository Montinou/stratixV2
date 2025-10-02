---
created: 2025-10-02T03:02:00Z
last_updated: 2025-10-02T03:36:10Z
version: 1.1
author: Claude Code PM System
---

# Technology Context

## Language & Runtime

**Primary Language:** TypeScript 5.x
- Strict mode enabled
- Type safety enforced throughout
- Full ES2022+ feature support

**Runtime:** Node.js 20+
- Modern JavaScript features
- Native ESM support
- Optimal performance

## Frontend Stack

### Framework
- **Next.js 15.3.3**
  - App Router architecture
  - React Server Components
  - Server Actions support
  - Turbopack for development
  - Edge runtime capabilities

### UI Framework
- **React 18.3.1**
  - Concurrent features
  - Automatic batching
  - Transitions API
  - Server Components

### Styling
- **Tailwind CSS 4.x**
  - Utility-first approach
  - CSS variables for theming
  - PostCSS processing
  - JIT compiler

- **Tailwind Plugins:**
  - `tw-animate-css` v1.3.4 - Animation utilities
  - `prettier-plugin-tailwindcss` v0.6.12 - Auto-formatting

### Component Libraries
- **Shadcn/ui** - Component collection built on:
  - Radix UI primitives (v1.x)
  - Class Variance Authority (CVA) v0.7.1
  - Tailwind Merge v3.3.0
  - Lucide React v0.513.0 (icons)

### UI Components (Radix UI)
- Accordion, AlertDialog, AspectRatio
- Avatar, Checkbox, Collapsible
- ContextMenu, Dialog, DropdownMenu
- HoverCard, Label, Menubar
- NavigationMenu, Popover, Progress
- RadioGroup, ScrollArea, Select
- Separator, Slider, Slot
- Switch, Tabs, Toggle
- ToggleGroup, Tooltip

### Additional UI
- **Vaul v1.1.2** - Drawer component
- **Sonner v2.0.5** - Toast notifications
- **CMDK v1.1.1** - Command menu
- **Input OTP v1.4.2** - OTP input
- **Embla Carousel v8.6.0** - Carousel component
- **React Resizable Panels v3.0.2** - Resizable layouts

## Backend & Data

### Database
- **NeonDB** (PostgreSQL 17.5)
  - Serverless PostgreSQL
  - Connection pooling
  - SSL connections required
  - Row Level Security (RLS) enabled

- **@neondatabase/serverless v1.0.1** - Serverless driver
- **pg v8.16.3** - PostgreSQL client
- **Drizzle ORM v0.44.5** - Type-safe ORM
- **Drizzle Kit v0.31.1** - Migration tool

### Authentication
- **Stack Auth (@stackframe/stack) v2.8.41**
  - NeonAuth integration
  - JWT-based sessions
  - SSR support
  - OAuth providers

### API & Data Fetching
- **Next.js API Routes** - Server endpoints
- **React Server Components** - Data fetching
- **Server Actions** - Mutations

### Email Services
- **Brevo (Sendinblue)** - Transactional email service
  - API-based email sending
  - Template management
  - Webhook support for email events
  - No npm package required (REST API)

## AI Integration

- **Vercel AI SDK v4.0.58** - Core AI utilities
- **@ai-sdk/anthropic v1.0.11** - Claude integration
- **@ai-sdk/openai v1.0.22** - OpenAI integration

## Data Visualization

- **Recharts v2.15.3** - Chart library
- **TanStack Table v8.21.3** - Data tables
- **Date-fns v3.6.0** - Date formatting

## Forms & Validation

- **React Hook Form v7.57.0** - Form management
- **Zod v3.25.57** - Schema validation
- **@hookform/resolvers v5.0.1** - Validation integration

## File Processing

- **XLSX v0.18.5** - Excel file handling
- **PapaParse v5.5.3** - CSV parsing
- **React Dropzone v14.3.8** - File uploads

## Caching & Performance

- **ioredis v5.8.0** - Redis client for caching
- **Next.js Image Optimization** - Automatic image optimization
- **Edge Runtime** - Global edge deployment

## Development Tools

### Build Tools
- **TypeScript Compiler** - Type checking
- **ESLint** - Code linting (ignored in builds currently)
- **Prettier v3.5.3** - Code formatting

### Testing
- **Playwright v1.55.1** - E2E testing
- **@faker-js/faker v10.0.0** - Test data generation

### Development
- **tsx v4.19.4** - TypeScript execution
- **dotenv v16.5.0** - Environment variables
- **Turbopack** - Fast bundler (dev mode)

## Deployment

### Platform
- **Vercel** - Primary deployment platform
  - Edge functions
  - Serverless functions
  - Automatic deployments
  - Preview deployments

### Environment Variables
**Required:**
- `DATABASE_URL` - NeonDB pooled connection
- `DATABASE_URL_UNPOOLED` - Direct connection for RLS
- `NEON_PROJECT_ID` - NeonDB project identifier
- `NEXT_PUBLIC_STACK_PROJECT_ID` - Stack Auth project
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Stack public key
- `STACK_SECRET_SERVER_KEY` - Stack secret key
- `VERCEL_TOKEN` - Vercel CLI token

**Optional (Email Services):**
- `BREVO_API_KEY` - Brevo transactional email API key

## Utilities & Helpers

- **clsx v2.1.1** - Conditional classnames
- **class-variance-authority v0.7.1** - Component variants
- **tailwind-merge v3.3.0** - Tailwind class merging
- **next-themes v0.4.6** - Theme management

## Type Definitions

- `@types/node` - Node.js types
- `@types/react` - React types
- `@types/react-dom` - React DOM types
- `@types/papaparse` - PapaParse types
- `@types/pg` - PostgreSQL types

## Package Manager

**npm** - Used for dependency management
- Lock file: `package-lock.json`
- Scripts for dev, build, deploy

## Key Dependencies Summary

**Total Dependencies:** 45 production packages
**Total Dev Dependencies:** 12 packages

### Critical Path
1. Next.js 15 (Framework)
2. React 18 (UI Library)
3. TypeScript 5 (Language)
4. NeonDB + Drizzle (Database)
5. Stack Auth (Authentication)
6. Tailwind + Shadcn (UI/Styling)
7. Vercel AI SDK (AI Features)

## Version Constraints

- **Node.js:** >=20.0.0
- **npm:** Latest stable
- **Next.js:** 15.x (App Router required)
- **React:** 18.x
- **TypeScript:** 5.x
