# Product Overview

**StratixV2** - Multi-tenant SaaS for strategic planning and OKR management

## Core Value
- Strategic alignment: company → team → individual objectives
- Progress tracking with real-time analytics
- Multi-tenant with company data isolation
- Collaborative planning with RBAC

## Target Users
- **Strategic Leaders:** C-suite setting direction
- **Team Managers:** Tactical execution
- **Contributors:** Initiative execution
- **Viewers:** Read-only access

## Key Features

### OKR Management
Hierarchical objectives with measurable key results, linked initiatives, progress tracking with RLS-secured queries

### Initiatives & Activities
Strategic projects aligned to objectives, activity logging, time tracking

### Team Collaboration
Email invitations (ai-innovation.site), company branding, RBAC, whitelist pre-approval

### Analytics
Real-time dashboards with RLS context, progress visualization, team performance metrics

### Data Import/Export
CSV/XLSX templates, bulk upload with validation, relationship mapping

### Company Profile Management
Complete company settings with tabbed interface:
- Company information editing
- Logo and branding customization
- Team member management
- Invitation system administration
- Custom domain support

## Technical Capabilities
- **Email:** Transactional via Brevo with webhooks, custom domain support
- **Security:** Row Level Security (RLS) at PostgreSQL level, session context isolation, JWT auth via Stack, complete company data isolation
- **Performance:** Edge deployment, connection pooling, SSR, RLS-optimized queries
- **API:** Standardized 401 error responses, consistent auth patterns

## Current State (Production)
- **Database:** NeonDB PostgreSQL 17.5 with RLS
- **Auth:** Stack Auth with NeonAuth
- **Deployment:** Vercel Edge runtime
- **Email:** Brevo transactional service

## Tech Stack
- Next.js 15.3 (App Router, RSC, Server Actions)
- React 18.3, TypeScript 5, Tailwind 4
- Drizzle ORM 0.44 + PostgreSQL
- Shadcn/ui + Radix UI components
- Recharts, TanStack Table

## Roadmap
- **Current:** Mobile responsiveness, advanced analytics
- **Near-term:** AI insights, automation workflows
- **Long-term:** Mobile apps, integration marketplace, predictive analytics

## Competitive Edge
- Database-first security (RLS at PostgreSQL)
- True multi-tenancy with custom branding
- Modern tech stack (Next.js 15, Edge runtime)
- Flexible import with relationship mapping
