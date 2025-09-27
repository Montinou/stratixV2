---
name: sistema-invitaciones-brevo
status: backlog
created: 2025-09-27T05:57:20Z
progress: 0%
prd: .claude/prds/sistema-invitaciones-brevo.md
github: [Will be updated when synced to GitHub]
---

# Epic: Sistema de Invitaciones con Brevo

## Overview

Implementación de sistema completo de invitaciones organizacionales usando Brevo para envío confiable de emails. Aprovecha variables de entorno existentes de Brevo y se integra con la infraestructura actual de Stack Auth y PostgreSQL. Incluye gestión de estados, tracking automático, recordatorios programados y landing pages personalizadas para aceptación.

## Architecture Decisions

### Email Infrastructure Strategy
- **Leverage Existing Brevo Setup**: Usa variables BREVO_API_KEY, BREVO_SENDER_EMAIL ya configuradas
- **Transactional API Approach**: Brevo Transactional API vs. SMTP para mejor tracking
- **Template-Based System**: Templates en Brevo con variables dinámicas
- **Webhook Integration**: Tracking de eventos (entrega, apertura, clicks) via webhooks
- **Queue-Based Processing**: Async processing para envío masivo sin bloqueos

### Database Design Strategy
- **Extend Current Schema**: Minimal additions to existing PostgreSQL structure
- **Event Sourcing Pattern**: Separate table for invitation events tracking
- **JWT Token Security**: Secure, expiring tokens for invitation links
- **Indexing Strategy**: Optimized queries for dashboard and search functionality

### Integration Strategy
- **Stack Auth Integration**: Seamless flow from invitation to user registration
- **API-First Design**: RESTful endpoints for frontend consumption
- **Cron-Based Automation**: Vercel cron jobs for reminders and expiration
- **Feature Flag Ready**: Gradual rollout with existing feature flag system

## Technical Approach

### Backend Services

#### Database Schema Extensions (`/lib/database/`)
```sql
-- Extend existing schema with minimal additions
CREATE TYPE invitation_status_enum AS ENUM (
    'pending', 'sent', 'viewed', 'accepted', 'expired', 'cancelled'
);

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    department VARCHAR(100),
    personal_message TEXT,
    status invitation_status_enum DEFAULT 'pending',
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT future_expiration CHECK (expires_at > created_at)
);

CREATE TABLE invitation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Optimized indexes for performance
CREATE INDEX idx_invitations_org_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_expires ON invitations(expires_at) WHERE status IN ('pending', 'sent');
```

#### API Endpoints (`/app/api/invitations/`)
```typescript
// Core invitation management
POST   /api/invitations/send              // Send new invitations
GET    /api/invitations                   // List org invitations (paginated)
PUT    /api/invitations/[id]/resend       // Resend specific invitation
DELETE /api/invitations/[id]              // Cancel invitation
POST   /api/invitations/bulk/resend       // Bulk resend operations

// Invitation acceptance flow
GET    /api/invitations/accept/[token]    // Validate and show invitation details
POST   /api/invitations/accept/[token]    // Accept invitation and create user

// Webhook endpoints
POST   /api/webhooks/brevo                // Handle Brevo delivery events

// Analytics and management
GET    /api/invitations/stats             // Invitation statistics
POST   /api/invitations/export            // Export invitation data
```

#### Brevo Integration Service (`/lib/services/brevo/`)
```typescript
// Centralized Brevo client with error handling
- brevo-client.ts              // API client with retry logic
- template-manager.ts          // Template creation and management
- webhook-handler.ts           // Process delivery/tracking events
- email-queue.ts               // Batch processing and rate limiting
```

### Frontend Components

#### Admin Interface (`/components/invitations/`)
```typescript
// Invitation management interface
- InvitationForm.tsx           // Multi-email invitation form
- InvitationDashboard.tsx      // List with filters and search
- InvitationCard.tsx           // Individual invitation display
- BulkActions.tsx              // Bulk operations (resend, cancel)
- InvitationStats.tsx          // Analytics and metrics display

// Leveraging existing shadcn/ui components
- Form, Input, Textarea        // Form elements
- Table, Badge, Button         // Data display and actions
- Dialog, AlertDialog          // Confirmations and modals
- Select, Checkbox             // Role and department selection
```

#### Invitation Landing Page (`/app/invitations/`)
```typescript
// Public invitation acceptance pages
- [token]/page.tsx             // Invitation details and acceptance
- [token]/expired/page.tsx     // Expired invitation handling
- [token]/accepted/page.tsx    // Success confirmation page

// Components for invitation flow
- InvitationDetails.tsx        // Organization info and role display
- AcceptButton.tsx             // CTA for joining organization
- ExpiredNotice.tsx            // Handle expired invitations
```

### Infrastructure

#### Brevo Configuration
```typescript
// Environment variables (already configured)
BREVO_API_KEY=xkeysib-[key]
BREVO_SENDER_EMAIL=noreply@stratix.com
BREVO_SENDER_NAME=Stratix OKR Platform

// Brevo template setup (programmatic creation)
- Template IDs for invitation types
- Webhook endpoints configuration
- Domain verification for deliverability
```

#### Cron Jobs (`/app/api/cron/`)
```typescript
// Automated background processes
GET /api/cron/invitation-reminders     // Send 3-day and 7-day reminders
GET /api/cron/expire-invitations       // Mark expired invitations
GET /api/cron/cleanup-events           // Archive old invitation events
```

#### Queue System
```typescript
// Using Vercel background functions for async processing
- Batch email sending to avoid API rate limits
- Retry mechanism for failed deliveries
- Dead letter queue for permanent failures
```

## Implementation Strategy

### Development Phases

#### Phase 1: Core Foundation (Week 1)
- Database schema and migrations
- Basic Brevo integration and API client
- Core API endpoints (send, list, cancel)
- Simple invitation form interface

#### Phase 2: Management Interface (Week 2)
- Dashboard with filtering and search
- Bulk operations and management tools
- Invitation status tracking and events
- Admin analytics and reporting

#### Phase 3: Acceptance Flow (Week 3)
- Public landing pages for invitations
- Token validation and security
- Integration with Stack Auth registration
- Email template design and testing

#### Phase 4: Automation & Polish (Week 4)
- Automated reminders and expiration
- Webhook processing for tracking
- Performance optimization and caching
- Comprehensive testing and documentation

### Risk Mitigation
- **Email Deliverability**: Test thoroughly with Brevo sandbox and real domains
- **Rate Limiting**: Implement queue system to respect Brevo API limits
- **Security**: JWT tokens with short expiration and proper validation
- **Performance**: Database indexing and pagination for large organizations

### Testing Approach
- **Unit Tests**: Jest for business logic and API endpoints
- **Integration Tests**: Brevo API mocking and webhook simulation
- **E2E Tests**: Playwright for complete invitation flow
- **Email Testing**: Brevo sandbox for template and delivery testing

## Task Breakdown Preview

High-level task categories (≤9 total tasks):

- [ ] **Database Schema & Migrations**: Create invitation and event tables with indexes
- [ ] **Brevo Integration Service**: API client, templates, and webhook handling
- [ ] **Core API Endpoints**: Send, list, manage, and accept invitation endpoints
- [ ] **Admin Invitation Interface**: Form, dashboard, and management components
- [ ] **Invitation Landing Pages**: Public acceptance flow and validation
- [ ] **Email Templates & Design**: Brevo templates with Spanish localization
- [ ] **Background Automation**: Cron jobs for reminders and cleanup
- [ ] **Analytics & Reporting**: Statistics dashboard and export functionality
- [ ] **Testing & Security Validation**: Comprehensive testing and security audit

## Dependencies

### External Dependencies
- **Brevo API**: Email sending and template management (99.9% SLA)
- **Brevo Webhooks**: Delivery tracking and event processing
- **Vercel Cron**: Background job execution for automation
- **JWT Library**: Token generation and validation

### Internal Dependencies
- **Stack Auth**: User registration integration (existing system)
- **Organization Management**: Current org/role structure
- **Database**: PostgreSQL with existing migration system
- **Design System**: shadcn/ui components for consistency

### Prerequisite Work
- Brevo account and API keys already configured
- Domain verification in Brevo for better deliverability
- Webhook endpoints registered with Brevo
- Database migration system operational

## Success Criteria (Technical)

### Performance Benchmarks
- **Email Delivery**: >99% successful delivery rate via Brevo
- **Send Performance**: <30 seconds for batch of 50 invitations
- **Dashboard Load**: <2 seconds for invitation list with 1000+ items
- **Acceptance Flow**: <3 seconds from click to registration page

### Quality Gates
- **Security Audit**: 100% of tokens properly validated and expired
- **Email Templates**: Responsive design tested on major email clients
- **Error Handling**: Graceful degradation for Brevo API failures
- **Data Integrity**: Zero invitation data loss or corruption

### Scalability Metrics
- **Organization Size**: Support for 1000+ member organizations
- **Concurrent Processing**: Handle 100 simultaneous invitation batches
- **Database Performance**: Sub-100ms queries with proper indexing
- **Memory Usage**: Efficient processing without memory leaks

### Acceptance Criteria
- Complete Spanish localization for all user-facing content
- Seamless integration with existing Stack Auth flow
- Admin can send, track, and manage invitations end-to-end
- Invited users can accept and join organization without friction

## Estimated Effort

### Overall Timeline
- **Total Duration**: 4 weeks
- **Team Size**: 1 full-stack developer
- **Total Hours**: ~160 hours (40 hours/week)

### Resource Requirements
- **Backend Development**: ~100 hours (database, API, integrations)
- **Frontend Development**: ~40 hours (admin interface, landing pages)
- **Testing & Documentation**: ~20 hours (comprehensive testing)

### Critical Path Items
1. **Brevo Integration** (blocks email functionality)
2. **Database Schema** (blocks all data operations)
3. **Core API Endpoints** (blocks frontend development)
4. **Stack Auth Integration** (blocks user registration flow)

### Dependencies Timeline
- **Week 1**: Database and Brevo foundation
- **Week 2**: Admin interface (depends on API completion)
- **Week 3**: Acceptance flow (depends on Stack Auth integration)
- **Week 4**: Automation and polish (depends on core functionality)

### Risk Buffer
- 25% buffer included for email integration complexity
- Brevo sandbox testing reduces production deployment risk
- Existing Stack Auth integration minimizes authentication risk
- Feature flags enable safe incremental rollout