---
created: 2025-10-01T09:07:54Z
last_updated: 2025-10-01T11:14:27Z
version: 1.1
author: Claude Code PM System
---

# Project Overview

## High-Level Summary

**StratixV2** is a modern, full-stack OKR management platform built with Next.js 15, TypeScript, NeonDB (PostgreSQL), and Stack Auth. It enables organizations to align strategy with execution through a three-tiered objective hierarchy (Objectives → Initiatives → Activities), with AI-powered insights and role-based analytics.

## Feature Catalog

### 1. Authentication & Authorization ✅

**Status**: Complete
**Components**:
- Stack Auth integration with NeonAuth
- Email-based authentication
- Server-side session management
- Role-based access control (RBAC)
- Invitation system

**Roles**:
- **Corporate**: Full access, strategic overview
- **Manager**: Team management, initiative creation
- **Employee**: Activity tracking, limited visibility

**Features**:
- Login/Logout flows
- Password reset
- Email verification
- Session persistence
- Protected routes via middleware

### 2. OKR Management System ✅

**Status**: Complete
**Hierarchy**:

```
Objectives (Company/Department Level)
    ↓ contains
Initiatives (Team/Project Level)
    ↓ contains
Activities (Individual Task Level)
```

**CRUD Operations**:
- Create objectives with title, description, target dates
- Assign owners and responsible parties
- Track status (planning, in-progress, completed, cancelled)
- Update progress percentages
- Add notes and updates
- Delete with cascade protection

**Key Features**:
- Parent-child relationships
- Automatic progress roll-up
- Status management
- Due date tracking
- Owner assignment

### 3. Areas & Teams Management ✅

**Status**: Complete
**Purpose**: Organize objectives by organizational units

**Features**:
- Create organizational areas (departments, teams)
- Assign area leaders
- Associate objectives with areas
- Team member management
- Cross-functional collaboration support

**Components**:
- `components/areas/area-form.tsx` - Area creation/editing
- `components/areas/areas-page-client.tsx` - Area listing
- `app/api/areas/route.ts` - Area API endpoints

### 4. Analytics Dashboard ✅

**Status**: Complete
**Location**: `/dashboard` (implied, needs verification)

**Metrics Displayed**:
- Total objectives count
- Completion rates by status
- Progress trends over time
- Team performance comparison
- Individual contributions

**Visualizations**:
- Bar charts (objective status)
- Line charts (progress trends)
- Pie charts (completion distribution)
- Tables (detailed listings)

**Filtering**:
- By time period
- By role (automatic based on user)
- By area/team
- By status

**Technology**: Recharts library for charts

### 5. Import System ✅

**Status**: Complete
**Location**: `/import`, `app/api/import/`

**Supported Formats**:
- CSV files (Comma-separated values)
- XLSX files (Excel spreadsheets)

**Process Flow**:
1. Upload file via drag-and-drop or file picker
2. Parse file (papaparse for CSV, xlsx for Excel)
3. Validate data against schema (Zod)
4. Preview data with error highlighting
5. Confirm import
6. Bulk insert into database
7. Show success/error report

**Validation Rules**:
- Required fields check
- Data type validation
- Date format verification
- Reference integrity (foreign keys)
- Role-based permission check (Corporate and Manager only)
- Employee access restriction (enforced at API and UI level)

**Features**:
- Template download
- Error reporting with line numbers
- Partial import on errors
- Transaction rollback on failure
- Role-based UI restrictions

### 6. AI Integration ✅

**Status**: Partial (some features complete)
**Providers**:
- Anthropic Claude (primary)
- OpenAI GPT models (alternative)
- Vercel AI Gateway (routing)

**Active Features**:
- ✅ Organization description enhancement (onboarding)
- ✅ Text improvement API (`/api/ai/enhance-text`)

**Planned Features**:
- Daily insights based on user role
- OKR health analysis
- Performance predictions
- Suggested actions
- Natural language queries

**Current State**:
- SDKs installed (@ai-sdk/anthropic, @ai-sdk/openai)
- AI Gateway configured
- UI components ready (`components/ai/`)
- Text enhancement API operational
- Additional backend integrations pending

### 7. User Onboarding Flow ✅

**Status**: Complete
**Flow**:

```
Email Invitation → Domain Check → Signup → Pending Approval → Setup Wizard → Dashboard
```

**Steps**:
1. **Invitation**: Admin invites via email
2. **Signup**: User creates account with Stack Auth
3. **Domain Validation**: Email domain checked against whitelist
4. **Organization Creation**: Create company with AI-enhanced description
5. **Pending Approval**: Admin reviews and approves
6. **Role Assignment**: Admin assigns role (Corporate/Manager/Employee)
7. **Company Association**: User linked to company
8. **Setup Wizard**: Initial profile and preferences
9. **Dashboard Access**: Full access granted

**Components**:
- `app/invite/` - Invitation pages
- `app/onboarding/` - Onboarding wizard
- `app/pending-approval/` - Approval waiting page
- `app/setup/` - Setup wizard

### 8. Data Security ✅

**Status**: Complete
**Implementation**:

**Row Level Security (RLS)**:
- All queries scoped by `company_id`
- PostgreSQL policies enforce isolation
- No cross-company data leakage

**Authentication**:
- JWT tokens from Stack Auth
- Secure session management
- HTTPS everywhere

**Input Validation**:
- Zod schemas on all API endpoints
- SQL injection prevention (ORM)
- XSS protection (React escaping)

**Access Control**:
- Role-based permissions
- Route protection middleware
- API endpoint authorization

## Current State

### Production-Ready Features ✅
- User authentication
- OKR CRUD operations
- Areas management
- Data import (CSV/XLSX)
- Row Level Security
- Role-based access
- Analytics dashboard (basic)

### In Development 🔄
- Advanced analytics
- AI insights generation
- Export functionality
- Notifications
- Comments/discussions

### Planned 📋
- Mobile apps
- External integrations (Slack, Teams)
- Public API
- Advanced reporting
- Custom dashboards

## Integration Points

### External Services
1. **NeonDB**: PostgreSQL database hosting
2. **Stack Auth**: Authentication provider
3. **Vercel**: Hosting and deployment
4. **Redis Cloud**: Caching layer
5. **Brevo**: Email delivery
6. **AI Providers**: Anthropic, OpenAI

### Internal Modules
1. **Database Layer**: `lib/database/`
2. **Auth Layer**: `lib/auth.ts`, `lib/stack-auth*.ts`
3. **Business Logic**: `lib/services/`, `lib/okr/`
4. **API Layer**: `app/api/`
5. **UI Components**: `components/`

## Data Model Summary

### Core Tables
```
companies
    ↓
users (via neon_auth.users_sync)
    ↓
areas (departments/teams)
    ↓
objectives
    ↓
initiatives
    ↓
activities
```

### Supporting Tables
- `whitelisted_domains` - Email domain whitelist
- `whitelisted_emails` - Individual email whitelist
- `blacklisted_emails` - Blocked emails
- `user_roles` - Role assignments
- `company_settings` - Company configurations

### Relationships
- **Many-to-One**: Objectives → Areas
- **Many-to-One**: Initiatives → Objectives
- **Many-to-One**: Activities → Initiatives
- **Many-to-One**: Users → Companies
- **Many-to-Many**: Users ↔ Areas (via join table)

## Technical Highlights

### Performance Optimizations
- Server-side rendering (SSR)
- Static generation where possible
- Database connection pooling
- Redis caching
- Optimized SQL queries with indexes

### Developer Experience
- TypeScript strict mode
- Type-safe database operations (Drizzle ORM)
- Hot module replacement (Turbopack)
- ESLint + Prettier
- Git hooks (future)

### Scalability
- Serverless architecture (Vercel)
- Database connection pooling (NeonDB)
- Horizontal scaling ready
- CDN for static assets

### Maintainability
- Component-based architecture
- Modular code organization
- Clear separation of concerns
- Comprehensive documentation (this file!)

## Known Limitations

### Current Constraints
1. **No Mobile Apps**: Web-only currently
2. **No Real-time Updates**: Requires page refresh
3. **Limited Export**: No Excel export yet
4. **No Integrations**: No third-party tool connections
5. **Basic AI**: AI features not fully implemented
6. **Manual Approval**: User approvals not automated

### Technical Debt
1. Some components need TypeScript improvements
2. Test coverage needs expansion
3. Error handling could be more robust
4. Some UI components need accessibility improvements
5. Documentation gaps in some modules

## Deployment Status

### Environments
- **Development**: Local (`localhost:3000`)
- **Preview**: Vercel preview deployments
- **Production**: `stratix-v2.vercel.app` (assumed)

### CI/CD
- Git push triggers Vercel deployment
- Automatic preview deployments on PRs
- Production deployment on main branch merge

### Monitoring
- Vercel Analytics (performance)
- Vercel Logs (errors, requests)
- NeonDB monitoring (query performance)

## Access & URLs

### Development
- Local: `http://localhost:3000`
- API: `http://localhost:3000/api/*`

### Production
- Web App: TBD
- API: Same domain `/api/*`

### Admin Tools
- Drizzle Studio: `npm run db:studio`
- Vercel Dashboard: vercel.com
- NeonDB Console: neon.tech
- Stack Auth Dashboard: stack-auth.com

## Quick Start Guide

### Prerequisites
- Node.js 20+
- npm or pnpm
- NeonDB account
- Stack Auth account

### Setup Steps
```bash
# 1. Clone repository
git clone [repository-url]
cd stratixV2

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Run database migrations
npm run migrate

# 5. Start development server
npm run dev
```

### First Login
1. Navigate to `http://localhost:3000`
2. Sign up with Stack Auth
3. Wait for admin approval (or approve yourself in DB)
4. Complete onboarding
5. Access dashboard

## Support & Resources

### Documentation
- README.md - Project readme
- This file - Comprehensive overview
- API docs - In progress
- Component Storybook - Future

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Stack Auth Docs](https://docs.stack-auth.com)
- [NeonDB Docs](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Shadcn/ui Docs](https://ui.shadcn.com)

## Update History
- 2025-10-01T11:14:27Z: Updated import system with employee restrictions, added AI description enhancement to onboarding flow, updated AI integration status
