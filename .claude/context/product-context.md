---
created: 2025-10-02T03:39:52Z
last_updated: 2025-10-02T03:39:52Z
version: 1.0
author: Claude Code PM System
---

# Product Context

## Product Overview

**StratixV2** is a multi-tenant SaaS platform for strategic planning and OKR (Objectives and Key Results) management, designed to help organizations align their teams and track progress toward strategic goals.

## Core Value Proposition

- **Strategic Alignment**: Connect company-wide objectives to individual team activities
- **Progress Tracking**: Real-time visibility into goal achievement across the organization
- **Multi-Tenant Architecture**: Isolated company data with shared infrastructure
- **Collaborative Planning**: Team-based OKR management with role-based access
- **Data-Driven Insights**: Analytics and reporting on strategic progress

## Target Users

### Primary Users
- **Strategic Leaders**: C-suite and executives setting organizational direction
- **Team Managers**: Department heads and team leads managing tactical execution
- **Individual Contributors**: Team members executing on initiatives and activities

### User Roles
- **Company Admin**: Full access to company settings, invitations, and configuration
- **Manager**: Can create and manage objectives, initiatives, and team assignments
- **Member**: Can view objectives and track assigned activities
- **Viewer**: Read-only access to dashboards and reports

## Key Features

### 1. OKR Management
- Create hierarchical objectives (company → team → individual)
- Define measurable key results with progress tracking
- Link initiatives and activities to objectives
- Track progress with visual indicators and charts

### 2. Strategic Initiatives
- Define strategic initiatives aligned to objectives
- Assign ownership and track execution
- Monitor dependencies and relationships
- Measure impact on key results

### 3. Activity Tracking
- Log work activities against initiatives
- Track time and effort allocation
- View activity history and contributions
- Filter and search activities

### 4. Team Collaboration
- Invite team members via email
- Company-specific branding and theming
- Role-based access control
- Whitelist-based pre-approval for invitations

### 5. Analytics & Reporting
- Real-time dashboards with key metrics
- Progress visualization with charts
- Objective completion tracking
- Team performance analytics

### 6. Data Import/Export
- Template-based CSV/XLSX import
- Bulk data upload with validation
- Export data for external analysis
- Import relationship mapping

### 7. Company Customization
- Custom logo upload
- Company-specific color schemes
- Branded invitation emails
- Personalized user experience

## Technical Capabilities

### Email Notifications
- Transactional emails via Brevo
- Template-based email system
- Invitation and approval workflows
- Webhook event tracking

### Security
- Row Level Security (RLS) at database level
- Company data isolation
- JWT-based authentication
- Secure session management

### Performance
- Edge deployment via Vercel
- PostgreSQL connection pooling
- Server-side rendering
- Optimized API responses

## User Workflows

### Onboarding Flow
1. Receive invitation email
2. Click invitation link
3. Complete user profile
4. Access company dashboard
5. Explore features via guided tour

### OKR Planning Flow
1. Define company objectives
2. Break down into team objectives
3. Create key results for measurement
4. Link initiatives to objectives
5. Assign activities to team members

### Progress Tracking Flow
1. Team members log activities
2. Update progress on key results
3. View dashboard for overall status
4. Generate reports for stakeholders
5. Adjust plans based on insights

## Product Roadmap

### Current State (MVP)
- Complete OKR hierarchy management
- Basic activity tracking
- Email invitation system
- Company theming
- Import/export functionality

### Near-Term Enhancements
- Advanced analytics dashboards
- AI-powered insights
- Mobile responsiveness improvements
- Enhanced notification system
- Automated reminder workflows

### Long-Term Vision
- Mobile native apps
- Integration marketplace
- Advanced reporting and BI
- Predictive analytics
- Goal recommendation engine

## Competitive Differentiation

- **Database-First Security**: RLS at PostgreSQL level, not application layer
- **True Multi-Tenancy**: Isolated company data with shared infrastructure
- **Modern Tech Stack**: Next.js 15, React Server Components, Edge runtime
- **Flexible Import**: Template-based bulk data import with relationship mapping
- **Custom Branding**: Company-specific theming and white-label capabilities

## Success Metrics

- User adoption rate per company
- Objective completion rate
- Active user engagement
- Time to value (onboarding to first objective)
- Feature utilization across modules
