# Technology Stack

## Core
- **Language:** TypeScript 5 (strict mode)
- **Runtime:** Node.js 20+
- **Framework:** Next.js 15.3.3 (App Router, RSC, Server Actions, Edge)
- **UI:** React 18.3.1, Tailwind CSS 4, Shadcn/ui
- **Database:** NeonDB PostgreSQL 17.5, Drizzle ORM 0.44.5
- **Auth:** Stack Auth (@stackframe/stack) 2.8.41
- **Email:** Brevo REST API

## UI Components
- Radix UI v1 primitives (Dialog, Dropdown, Popover, etc.)
- Lucide React v0.513 icons
- Sonner v2.0.5 toasts
- Recharts v2.15 charts
- TanStack Table v8.21

## Data & Forms
- React Hook Form v7.57 + Zod v3.25
- Date-fns v3.6
- XLSX v0.18.5, PapaParse v5.5.3
- ioredis v5.8 (caching)

## Development
- Playwright v1.55.1 (E2E tests)
- Prettier v3.5.3, ESLint
- tsx v4.19.4, dotenv v16.5

## Deployment
- **Platform:** Vercel (Edge + Serverless)
- **Required Env:**
  - `DATABASE_URL` (pooled)
  - `DATABASE_URL_UNPOOLED` (RLS)
  - `NEON_PROJECT_ID`
  - `NEXT_PUBLIC_STACK_PROJECT_ID`
  - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
  - `STACK_SECRET_SERVER_KEY`
  - `BREVO_API_KEY`

## Key Dependencies
Total: 45 production, 12 dev

**Critical Path:**
Next.js 15 → React 18 → TypeScript 5 → NeonDB + Drizzle → Stack Auth → Tailwind + Shadcn

## Constraints
- Node.js ≥20.0.0
- Next.js 15.x App Router required
- PostgreSQL with RLS
- Vercel Edge runtime
