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
Hierarchical objectives with measurable key results, linked initiatives, progress tracking

### Initiatives & Activities
Strategic projects aligned to objectives, activity logging, time tracking

### Team Collaboration
Email invitations, company branding, RBAC, whitelist pre-approval

### Analytics
Real-time dashboards, progress visualization, team performance metrics

### Data Import/Export
CSV/XLSX templates, bulk upload with validation, relationship mapping

### Company Customization
Custom logos, color schemes, branded emails, personalized UX

## Technical Capabilities
- **Email:** Transactional via Brevo with webhooks
- **Security:** RLS at database level, JWT auth, company isolation
- **Performance:** Edge deployment, connection pooling, SSR

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
