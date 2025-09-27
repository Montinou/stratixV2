---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-27T05:59:12Z
version: 2.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Layout

```
stratixV2/
├── .claude/                    # Claude Code PM system for 3 PRDs implementation
│   ├── agents/                 # Task-oriented agents (design, engineering, product, testing)
│   ├── commands/               # Command definitions
│   ├── context/               # Project context files (current focus)
│   ├── epics/                 # Epic management workspace
│   │   ├── motor-ai-completo/          # AI foundation epic
│   │   ├── frontend-onboarding-ai/     # UI wizard epic
│   │   └── sistema-invitaciones-brevo/ # Invitation system epic
│   ├── prds/                  # Product Requirements Documents
│   │   ├── motor-ai-completo.md        # AI engine PRD
│   │   ├── frontend-onboarding-ai.md   # Frontend wizard PRD
│   │   ├── sistema-invitaciones-brevo.md # Brevo invitations PRD
│   │   └── onboarding-org-creation.md  # [SPLIT] Historical reference
│   └── scripts/pm/            # Project management automation
├── @scripts/                  # Deployment and migration automation
│   ├── deploy/               # Deployment automation toolkit
│   ├── init/                 # Database initialization scripts
│   ├── migrations/           # Database migration files
│   ├── rollback/            # Rollback scripts
│   └── validation/          # Schema and data validation
├── app/                      # Next.js App Router (AI-enhanced)
│   ├── api/                  # API Routes (21 endpoints + AI endpoints)
│   │   ├── ai/              # 🆕 AI Gateway endpoints (planned)
│   │   │   ├── generate-okr/    # OKR template generation
│   │   │   ├── chat/            # Conversational assistant
│   │   │   ├── insights/        # Analytics insights
│   │   │   └── status/          # AI health & cost tracking
│   │   ├── onboarding/      # 🆕 Onboarding wizard endpoints (planned)
│   │   │   ├── start/           # Initialize wizard session
│   │   │   ├── progress/        # Save step progress
│   │   │   ├── complete/        # Finalize onboarding
│   │   │   └── ai/              # AI integration for wizard
│   │   ├── invitations/     # 🆕 Brevo invitation system (planned)
│   │   │   ├── send/            # Send new invitations
│   │   │   ├── bulk/            # Bulk operations
│   │   │   ├── accept/          # Invitation acceptance
│   │   │   └── stats/           # Analytics
│   │   └── [existing endpoints] # Current API structure
│   ├── onboarding/          # 🆕 AI-powered onboarding pages (planned)
│   │   ├── wizard/              # 3-step wizard interface
│   │   └── complete/            # Success confirmation
│   ├── invitations/         # 🆕 Invitation landing pages (planned)
│   │   └── [token]/             # Public acceptance pages
│   ├── activities/          # Activity management pages
│   ├── initiatives/         # Strategic initiatives pages
│   ├── objectives/          # OKR objectives pages
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with AuthProvider
│   └── page.tsx             # Home page
├── components/              # React components (Shadcn/UI + AI components)
│   ├── ai/                  # 🆕 AI-related components (expanded)
│   │   ├── floating-chat.tsx        # Persistent AI chat widget
│   │   ├── smart-form-field.tsx     # AI-enhanced form fields
│   │   ├── suggestion-card.tsx      # OKR suggestions display
│   │   ├── loading-state.tsx        # AI response loading
│   │   ├── insights-card.tsx        # Analytics insights
│   │   └── tooltip.tsx              # Contextual AI help
│   ├── onboarding/          # 🆕 Onboarding wizard components (planned)
│   │   ├── wizard-container.tsx     # Main wizard wrapper
│   │   ├── wizard-step.tsx          # Generic step component
│   │   ├── welcome-step.tsx         # Hero + value proposition
│   │   ├── company-info-step.tsx    # Company configuration
│   │   ├── organization-step.tsx    # Department structure
│   │   ├── okr-setup-step.tsx       # First OKR creation
│   │   └── completion-step.tsx      # Success page
│   ├── invitations/         # 🆕 Invitation management (planned)
│   │   ├── invitation-form.tsx      # Multi-email form
│   │   ├── invitation-dashboard.tsx # Management interface
│   │   ├── invitation-card.tsx      # Individual invitation
│   │   ├── bulk-actions.tsx         # Bulk operations
│   │   ├── invitation-details.tsx   # Public invitation view
│   │   └── accept-button.tsx        # CTA for joining
│   ├── charts/             # Chart components (Recharts)
│   ├── import/             # Data import functionality
│   ├── layout/             # Layout components (sidebar, dashboard-layout)
│   ├── okr/                # OKR-specific components (cards, progress bars)
│   └── ui/                 # Shadcn/ui base components
├── lib/                     # Utility libraries
│   ├── ai/                  # 🆕 AI functionality (expanded for 3 PRDs)
│   │   ├── gateway-client.ts        # Vercel AI Gateway client
│   │   ├── prompt-manager.ts        # Industry-specific prompts
│   │   ├── cache-layer.ts           # Smart caching system
│   │   ├── rate-limiter.ts          # Cost control
│   │   ├── insights.ts              # Analytics insights
│   │   └── suggestions.ts           # Smart suggestions
│   ├── services/           # 🆕 Business services (expanded)
│   │   ├── brevo/                   # Brevo integration
│   │   │   ├── client.ts            # Brevo API client
│   │   │   ├── template-manager.ts  # Email templates
│   │   │   ├── webhook-handler.ts   # Event processing
│   │   │   └── email-queue.ts       # Batch processing
│   │   ├── onboarding/              # Onboarding services
│   │   │   ├── wizard-service.ts    # Wizard state management
│   │   │   └── ai-integration.ts    # AI assistance service
│   │   ├── session-management.ts    # Advanced session management
│   │   └── sync-logging.ts          # Comprehensive logging
│   ├── database/           # Database layer
│   │   ├── client.ts       # PostgreSQL client
│   │   ├── queries/        # Query repositories
│   │   └── services/       # Business logic services
│   ├── hooks/              # Custom React hooks
│   │   ├── use-ai.tsx              # 🆕 AI interaction hook
│   │   ├── use-onboarding.tsx      # 🆕 Wizard state hook
│   │   └── use-auth.tsx            # Authentication hook
│   ├── types/              # TypeScript definitions
│   │   ├── ai.ts                   # 🆕 AI-related types
│   │   ├── onboarding.ts           # 🆕 Wizard types
│   │   ├── invitations.ts          # 🆕 Invitation types
│   │   ├── import.ts               # Import functionality types
│   │   └── okr.ts                  # OKR domain types
│   └── utils.ts            # Shadcn utility functions (cn)
├── stack/                   # NeonAuth (Stack) configuration
│   ├── client.ts           # Client-side auth
│   └── server.ts           # Server-side auth
├── public/                  # Static assets and placeholders
├── scripts/                 # Legacy SQL migration scripts
├── styles/                  # Additional CSS styles
├── docs/                    # Project documentation
│   └── AI_GATEWAY_IMPLEMENTATION_GUIDE.md # 🆕 AI implementation patterns
├── install/                 # Installation scripts for CCPM
├── components.json          # Shadcn/ui configuration
├── middleware.ts            # Next.js middleware for auth
├── next.config.mjs          # Next.js configuration
├── package.json             # Dependencies and npm scripts
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vercel.json              # Vercel deployment configuration
```

## Architecture Patterns for 3 PRDs Implementation

### Next.js App Router Structure (AI-Enhanced)
- **App Directory**: Uses Next.js 14.2.16 App Router with AI integration
- **AI Route Groups**: New routes for onboarding wizard and AI endpoints
- **Progressive Enhancement**: All routes work without AI, enhanced with AI
- **Spanish-First Routing**: All routes designed for Spanish content

### Component System Evolution (Shadcn/UI + AI)
- **Base UI Components**: Existing Radix UI primitives with Tailwind CSS
- **AI-Enhanced Components**: New components with integrated AI assistance
- **Wizard Components**: Specialized onboarding flow components
- **Invitation Components**: Brevo-integrated invitation management
- **Icon System**: Lucide React icons with AI-specific additions

### Database Architecture Extensions
- **Core PostgreSQL**: Existing NeonDB structure
- **AI Extensions**: New tables for AI interactions and caching
- **Onboarding Tables**: Session and progress tracking
- **Invitation Tables**: Brevo integration with event sourcing
- **Service Layer**: Enhanced with AI and invitation services

## Key Directories Deep Dive

### `/app/api/` - API Routes (Extended for 3 PRDs)
```
app/api/
├── ai/                      # 🆕 AI Gateway integration
│   ├── generate-okr/        # OKR template generation with Gemini 2.0 Flash
│   ├── chat/                # Conversational assistant
│   ├── insights/            # Analytics and recommendations
│   └── status/              # Health check and cost tracking
├── onboarding/              # 🆕 Wizard backend
│   ├── start/               # Initialize wizard session
│   ├── progress/            # Save step progress
│   ├── complete/            # Finalize onboarding
│   ├── ai/                  # AI integration endpoints
│   │   ├── suggest/         # Get AI suggestions
│   │   ├── validate/        # Validate input with AI
│   │   └── complete/        # AI auto-completion
│   ├── industries/          # Available industries
│   └── organization/        # Create organization
├── invitations/             # 🆕 Brevo invitation system
│   ├── send/                # Send new invitations
│   ├── bulk/                # Bulk operations
│   │   └── resend/          # Bulk resend
│   ├── accept/              # Invitation acceptance flow
│   │   └── [token]/         # Token-based acceptance
│   ├── stats/               # Invitation analytics
│   ├── export/              # Export invitation data
│   └── [id]/                # Individual invitation management
├── webhooks/                # 🆕 External integrations
│   └── brevo/               # Brevo delivery events
├── cron/                    # 🆕 Background automation
│   ├── invitation-reminders/ # Send reminders
│   ├── expire-invitations/   # Mark expired
│   └── cleanup-events/       # Archive old events
└── [existing endpoints]/     # Current API structure
```

### `/components/` - UI Component Library (AI-Enhanced)
```
components/
├── ai/                      # AI-powered components (expanded)
│   ├── floating-chat.tsx    # Persistent AI assistant
│   ├── smart-form-field.tsx # AI-enhanced input fields
│   ├── suggestion-card.tsx  # OKR template suggestions
│   ├── loading-state.tsx    # AI response loading states
│   ├── tooltip.tsx          # Contextual AI help
│   ├── insights-card.tsx    # Analytics insights
│   └── conversation-ui.tsx  # Chat conversation display
├── onboarding/              # 🆕 Wizard interface
│   ├── wizard-container.tsx # Main wizard wrapper
│   ├── wizard-step.tsx      # Generic step component
│   ├── wizard-navigation.tsx # Previous/Next navigation
│   ├── progress-indicator.tsx # Visual progress bar
│   ├── welcome-step.tsx     # Hero + value proposition
│   ├── company-info-step.tsx # Company information form
│   ├── organization-step.tsx # Department structure builder
│   ├── okr-setup-step.tsx   # First OKR creation
│   ├── completion-step.tsx  # Success confirmation
│   ├── industry-selector.tsx # Visual industry picker
│   ├── department-builder.tsx # Drag-and-drop org structure
│   └── okr-editor.tsx       # Conversational OKR creation
├── invitations/             # 🆕 Invitation management
│   ├── invitation-form.tsx  # Multi-email invitation form
│   ├── invitation-dashboard.tsx # Management interface
│   ├── invitation-card.tsx  # Individual invitation display
│   ├── bulk-actions.tsx     # Bulk operations UI
│   ├── invitation-stats.tsx # Analytics display
│   ├── invitation-details.tsx # Public invitation view
│   ├── accept-button.tsx    # CTA for joining organization
│   ├── expired-notice.tsx   # Handle expired invitations
│   └── success-confirmation.tsx # Acceptance success
├── charts/                  # Data visualization (existing)
├── import/                  # File import functionality (existing)
├── layout/                  # Layout components (existing)
├── okr/                     # OKR-specific UI (existing)
└── ui/                      # Base Shadcn/ui components (existing)
```

### `/lib/` - Utility Libraries & Services (Extended)
```
lib/
├── ai/                      # AI functionality (comprehensive)
│   ├── gateway-client.ts    # Vercel AI Gateway unified client
│   ├── prompt-manager.ts    # Industry-specific prompts
│   ├── cache-layer.ts       # Intelligent caching for cost control
│   ├── rate-limiter.ts      # Per-user and per-org throttling
│   ├── insights.ts          # Analytics insights generation
│   ├── suggestions.ts       # Smart suggestions engine
│   └── cost-tracker.ts      # AI usage and cost monitoring
├── services/                # Business services (expanded)
│   ├── brevo/               # Brevo integration services
│   │   ├── client.ts        # Brevo API client with retry
│   │   ├── template-manager.ts # Email template management
│   │   ├── webhook-handler.ts # Event processing
│   │   └── email-queue.ts   # Batch processing & rate limiting
│   ├── onboarding/          # Onboarding wizard services
│   │   ├── wizard-service.ts # Session and progress management
│   │   ├── ai-integration.ts # AI assistance coordination
│   │   └── completion-service.ts # Finalization logic
│   ├── session-management.ts # Advanced session management
│   └── sync-logging.ts      # Comprehensive logging system
├── database/                # Database layer (existing with extensions)
├── hooks/                   # Custom React hooks (extended)
│   ├── use-ai.tsx          # AI interaction and state management
│   ├── use-onboarding.tsx  # Wizard state and navigation
│   ├── use-invitations.tsx # Invitation management
│   └── use-auth.tsx        # Authentication hook (existing)
├── types/                   # TypeScript definitions (extended)
│   ├── ai.ts               # AI Gateway and response types
│   ├── onboarding.ts       # Wizard steps and session types
│   ├── invitations.ts      # Invitation and event types
│   ├── import.ts           # Import functionality types (existing)
│   └── okr.ts             # OKR domain types (existing)
└── utils.ts                # Shadcn utility functions (existing)
```

### Database Schema Extensions for 3 PRDs

#### AI Infrastructure Tables
```sql
-- AI interactions tracking and cost management
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    type VARCHAR(50), -- 'template', 'chat', 'insights'
    request_data JSONB,
    response_data JSONB,
    cost_cents INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart caching for AI responses
CREATE TABLE ai_cache (
    id UUID PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE,
    response_data JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Onboarding System Tables
```sql
-- Wizard session persistence
CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    current_step INTEGER DEFAULT 1,
    form_data JSONB,
    ai_suggestions JSONB,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Invitation System Tables
```sql
-- Comprehensive invitation management
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
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event sourcing for invitation tracking
CREATE TABLE invitation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Points for 3 PRDs

### AI Integration (Motor AI Completo)
- **Vercel AI Gateway**: Unified client for all AI functionality
- **Gemini 2.0 Flash**: Primary model for cost-effectiveness
- **Caching Layer**: Intelligent caching to minimize API costs
- **Rate Limiting**: Per-user and per-organization controls

### Frontend Integration (Onboarding AI)
- **Next.js 14**: App Router with React Server Components
- **shadcn/ui**: Consistent design system with AI enhancements
- **Progressive Enhancement**: Works without AI, enhanced with AI
- **Spanish Localization**: Native Spanish content throughout

### Backend Integration (Invitaciones Brevo)
- **Brevo API**: Transactional email service with existing credentials
- **PostgreSQL**: Event sourcing for invitation tracking
- **Stack Auth**: Seamless integration with current auth system
- **JWT Security**: Token-based invitation validation

## Development Patterns for Implementation

### TypeScript Usage (Extended)
- **AI Types**: Comprehensive typing for AI interactions
- **Wizard Types**: Type-safe wizard steps and navigation
- **Invitation Types**: Event sourcing type definitions
- **Service Types**: Business logic type safety

### State Management Approach
- **AI State**: React hooks for AI interactions (use-ai.tsx)
- **Wizard State**: Zustand for wizard progress (use-onboarding.tsx)
- **Form State**: React Hook Form with Zod validation
- **Server State**: SWR for AI suggestions and cache

### Security & Performance (Enhanced)
- **AI Cost Controls**: Aggressive caching and rate limiting
- **Invitation Security**: JWT tokens with expiration
- **Performance Optimization**: Connection pooling and indexing
- **Progressive Loading**: Code splitting for AI components

---

**Last Updated**: 2025-09-27T05:59:12Z
**Key Focus**: Project structure optimized for AI-powered onboarding with 3 PRDs implementation
**Phase**: Ready for epic decomposition and task breakdown