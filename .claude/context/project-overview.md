---
created: 2025-10-02T03:39:52Z
last_updated: 2025-10-02T03:39:52Z
version: 1.0
author: Claude Code PM System
---

# Project Overview

## Executive Summary

StratixV2 is a production-ready, multi-tenant SaaS platform for strategic planning and OKR management. Built with Next.js 15, TypeScript, and NeonDB PostgreSQL, it provides organizations with tools to define objectives, track key results, manage initiatives, and analyze progress in real-time.

## Current State

### Application Status
- **Environment**: Production deployment on Vercel
- **Database**: NeonDB PostgreSQL 17.5 with Row Level Security
- **Authentication**: Stack Auth with NeonAuth integration
- **Email Service**: Brevo for transactional emails and invitations

### Key Capabilities (Production)

#### 1. Strategic Planning
- **OKR Hierarchy**: Company → Team → Individual objectives
- **Key Results**: Measurable outcomes with progress tracking
- **Initiatives**: Strategic projects aligned to objectives
- **Activities**: Granular task tracking and time logging

#### 2. Multi-Tenant Operations
- **Company Isolation**: RLS-enforced data separation
- **Custom Branding**: Company logos and color schemes
- **Team Management**: Role-based access control
- **Whitelist System**: Pre-approved email domains for invitations

#### 3. User Management
- **Email Invitations**: Brevo-powered invitation workflow
- **Onboarding Flow**: Guided user setup and profile completion
- **Access Control**: Company admin, manager, member, and viewer roles
- **Profile Management**: User preferences and settings

#### 4. Data Management
- **Import System**: CSV/XLSX bulk data import with templates
- **Export Functionality**: Data extraction for analysis
- **Relationship Mapping**: Automatic linking of imported entities
- **Validation**: Schema validation and error reporting

#### 5. Analytics & Insights
- **Real-Time Dashboards**: Key metrics and progress indicators
- **Chart Visualizations**: Recharts-based data visualization
- **Progress Tracking**: Objective and key result completion rates
- **Team Performance**: Activity and contribution analytics

#### 6. Communication
- **Email Notifications**: Invitation, approval, and reminder emails
- **Webhook Integration**: Brevo event tracking
- **Template System**: Customizable email templates
- **Event Logging**: Email delivery and engagement tracking

## Technical Architecture

### Frontend
- **Framework**: Next.js 15.3.3 with App Router
- **UI Library**: React 18.3.1 with Server Components
- **Styling**: Tailwind CSS 4.x with Shadcn/ui components
- **State Management**: React Server Components + Server Actions
- **Forms**: React Hook Form with Zod validation

### Backend
- **Database**: NeonDB PostgreSQL 17.5 (serverless)
- **ORM**: Drizzle ORM 0.44.5 with type-safe queries
- **Authentication**: Stack Auth (@stackframe/stack) 2.8.41
- **Email**: Brevo REST API (no npm package)
- **Caching**: ioredis 5.8.0 for Redis integration

### Infrastructure
- **Hosting**: Vercel with Edge runtime
- **Database Connections**: Pooled and direct connections
- **Security**: Row Level Security at PostgreSQL level
- **Deployment**: Automatic deployments from Git

### Development
- **Language**: TypeScript 5.x (strict mode)
- **Build Tool**: Turbopack for development
- **Testing**: Playwright 1.55.1 for E2E tests
- **Code Quality**: ESLint + Prettier

## Feature Breakdown

### Core Modules

#### Objectives Module (`/objectives`)
- Create and edit objectives
- Define key results with targets
- Track progress with visual indicators
- Link to initiatives and activities
- Filter by status, owner, time period

#### Initiatives Module (`/initiatives`)
- Strategic initiative management
- Objective alignment tracking
- Owner assignment and dates
- Dependency mapping
- Progress monitoring

#### Activities Module (`/activities`)
- Activity logging and tracking
- Initiative linkage
- Time and effort recording
- Activity history and search
- Team contribution views

#### Dashboard Module (`/dashboard`)
- Executive summary view
- Key metrics display
- Recent activity feed
- Quick action cards
- Progress visualizations

#### Analytics Module (`/analytics`)
- Detailed reporting
- Chart visualizations
- Trend analysis
- Custom date ranges
- Export capabilities

#### Team Module (`/team`)
- Team member directory
- Role management
- Activity contributions
- Performance metrics
- User profiles

#### Admin Module (`/tools/admin`)
- Company settings
- Logo and theme customization
- Invitation management
- User approval workflows
- System configuration

### Support Features

#### Import System (`/import`)
- Template download (CSV/XLSX)
- File upload and validation
- Relationship mapping
- Error reporting
- Bulk data processing

#### Profile Management (`/profile`)
- User information
- Preferences and settings
- Notification controls
- Security options

#### Setup Flow (`/setup`)
- Initial company configuration
- First objective creation
- Team invitation
- Guided onboarding

#### Invitation System (`/invite`, `/pending-approval`)
- Email-based invitations
- Token validation
- Pre-approval for whitelisted domains
- Approval workflows for non-whitelisted

## Data Model

### Core Entities
- **Companies**: Top-level tenants with settings
- **Users**: Authenticated users with profiles
- **Objectives**: Strategic goals with hierarchy
- **Key Results**: Measurable outcomes
- **Initiatives**: Strategic projects
- **Activities**: Granular tasks and work logs
- **Invitations**: Email invitation records
- **Areas**: Organizational units/departments

### Relationships
- Companies have many Users, Objectives, Areas
- Objectives have many Key Results, Initiatives
- Initiatives have many Activities
- Users belong to Companies
- All entities isolated by company_id (RLS)

## Security Model

### Row Level Security
- All queries filtered by company_id automatically
- PostgreSQL policies enforce data isolation
- No client-side filtering required
- Policies tested and verified

### Authentication
- JWT-based sessions via Stack Auth
- Secure cookie-based session storage
- Server-side session validation
- Automatic token refresh

### Authorization
- Role-based access control
- Company admin permissions
- Feature-level access checks
- API route protection

## API Structure

### Public API Routes
- `/api/company/settings` - Company configuration
- `/api/company/logo` - Logo upload and management
- `/api/invitations/*` - Invitation CRUD operations
- `/api/webhooks/brevo` - Email event webhooks
- `/api/cron/*` - Scheduled maintenance jobs

### Authentication Routes
- `/handler/*` - Stack Auth handlers
- Session management
- OAuth integrations

## Deployment

### Environments
- **Production**: stratix-v2.vercel.app
- **Preview**: Automatic preview deployments for PRs
- **Development**: Local development server (port 3001)

### Configuration
- Environment variables managed in Vercel
- Secrets stored securely
- Database connection strings
- API keys for third-party services

### Monitoring
- Vercel deployment logs
- Database performance metrics
- Email delivery tracking
- Error tracking and reporting

## Documentation

### Technical Documentation
- `BREVO_CONFIGURATION_GUIDE.md` - Email service setup
- `INVITATION_SYSTEM_SUMMARY.md` - Invitation workflow
- `STACK_AUTH_SETUP.md` - Authentication configuration
- `WHITELIST_PRE_APPROVAL_SYSTEM.md` - Approval system
- `performance-benchmark-results.md` - Performance metrics
- `rls-verification.md` - Security verification
- `security-audit-report.md` - Security audit findings

### Code Documentation
- Inline TypeScript documentation
- Component prop documentation
- API route specifications
- Database schema comments

## Recent Major Changes

### Brevo Email Integration (Latest)
- Transactional email sending
- Template management
- Webhook event processing
- Email delivery tracking

### Invitation System
- Email-based user provisioning
- Whitelist pre-approval
- Admin approval workflows
- Token-based invitation acceptance

### Company Theming
- Custom logo upload
- Company color scheme
- Branded email templates
- Personalized user experience

### Import System Improvements
- Case-insensitive relationship matching
- Company ID field mapping
- Enhanced validation
- Better error reporting

## Known Limitations

### Current Constraints
- TypeScript/ESLint errors bypassed in builds (technical debt)
- Mobile responsiveness partially complete
- Email delivery dependent on Brevo availability
- NeonDB connection limits on free tier

### Planned Improvements
- Complete mobile optimization
- Advanced analytics features
- AI-powered insights
- Third-party integrations
- Native mobile apps

## Performance Characteristics

### Response Times
- API routes: < 200ms (p95)
- Page loads: < 1s (Server-rendered)
- Database queries: < 50ms (pooled connections)

### Scalability
- Serverless architecture (auto-scaling)
- Connection pooling (up to 100 connections)
- Edge deployment (global CDN)
- Efficient database queries

### Reliability
- Database-first design (email non-blocking)
- Graceful degradation for third-party services
- Error handling and recovery
- Automated health checks
