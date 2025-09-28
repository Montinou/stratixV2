---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-27T23:11:47Z
version: 2.3
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
│   ├── api/                  # API Routes (Enhanced with AI & Onboarding)
│   │   ├── ai/              # ✅ AI Gateway endpoints (IMPLEMENTED)
│   │   │   ├── analytics/       # AI analytics & insights
│   │   │   ├── cache/           # AI cache management
│   │   │   ├── metrics/         # Performance metrics
│   │   │   ├── smart-suggestions/ # Smart OKR suggestions
│   │   │   ├── suggestions/     # Core suggestions API
│   │   │   └── status/          # AI health & cost tracking
│   │   ├── onboarding/      # ✅ Onboarding wizard endpoints (IMPLEMENTED)
│   │   │   ├── start/           # Initialize wizard session
│   │   │   ├── progress/        # Save step progress
│   │   │   ├── complete/        # Finalize onboarding
│   │   │   ├── organization/    # Organization setup
│   │   │   ├── industries/      # Industry selection
│   │   │   ├── session/[id]/    # Session management
│   │   │   └── ai/              # AI integration for wizard
│   │   │       ├── suggest/     # AI suggestions
│   │   │       ├── validate/    # AI validation
│   │   │       └── complete/    # AI completion
│   │   ├── admin/           # Enhanced admin endpoints
│   │   │   ├── audit/           # Audit logging
│   │   │   ├── dashboard/       # Admin dashboard
│   │   │   └── redis-health/    # Redis health check
│   │   └── [existing endpoints] # Current API structure
│   ├── onboarding/          # ✅ AI-powered onboarding pages (IMPLEMENTED)
│   │   ├── layout.tsx           # Onboarding layout wrapper
│   │   ├── page.tsx             # Welcome step
│   │   ├── welcome/             # Welcome step page
│   │   ├── organization/        # Organization setup step
│   │   ├── company/             # Company information step
│   │   └── complete/            # Success confirmation
│   ├── activities/          # Activity management pages
│   ├── initiatives/         # Strategic initiatives pages
│   ├── objectives/          # OKR objectives pages
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with AuthProvider
│   └── page.tsx             # Home page
├── components/              # React components (Shadcn/UI + AI components)
│   ├── ai/                  # ✅ AI-related components (IMPLEMENTED)
│   │   ├── AIIntegrationDemo.tsx    # AI feature demonstration
│   │   ├── AISuggestionCard.tsx     # AI suggestions display
│   │   ├── AITooltip.tsx            # Contextual AI help
│   │   ├── BusinessModelSelector.tsx # Business model selection
│   │   ├── ChatMessage.tsx          # Chat message component
│   │   ├── CompanyTypeSelector.tsx  # Company type selection
│   │   ├── ConversationUI.tsx       # Conversation interface
│   │   ├── DepartmentBuilder.tsx    # Department structure builder
│   │   ├── FloatingAIChat.tsx       # Persistent AI chat widget
│   │   ├── GoalSuggestionEngine.tsx # OKR goal suggestions
│   │   ├── ImprovementSuggestions.tsx # Performance improvements
│   │   ├── IndustrySelector.tsx     # Industry selection
│   │   ├── OKREditor.tsx            # OKR editing interface
│   │   ├── PerformanceIndicatorBuilder.tsx # KPI builder
│   │   ├── RoleDefinitionTool.tsx   # Role definition interface
│   │   ├── SmartFormField.tsx       # AI-enhanced form fields
│   │   ├── TeamStructureWizard.tsx  # Team structure setup
│   │   ├── ValidationFeedback.tsx   # AI validation feedback
│   │   └── floating-chat.tsx        # Legacy floating chat
│   ├── onboarding/          # ✅ Onboarding wizard components (IMPLEMENTED)
│   │   ├── AccessibilityEnhancements.tsx # A11y features
│   │   ├── AccessibilityProvider.tsx # A11y context
│   │   ├── AccessibilityTestPanel.tsx # A11y testing
│   │   ├── CompanyInfoStep.tsx      # Company information step
│   │   ├── CompletionStep.tsx       # Success page
│   │   ├── ErrorBoundary.tsx        # Error handling
│   │   ├── OrganizationStep.tsx     # Organization setup
│   │   ├── ProgressIndicator.tsx    # Progress visualization
│   │   ├── WelcomeStep.tsx          # Welcome + value proposition
│   │   ├── WizardContainer.tsx      # Main wizard wrapper
│   │   ├── WizardNavigation.tsx     # Navigation controls
│   │   ├── WizardStep.tsx           # Generic step component
│   │   ├── animated-forms.tsx       # Form animations
│   │   ├── skeletons.tsx            # Loading skeletons
│   │   ├── step-transitions.tsx     # Step transitions
│   │   ├── animations/              # Animation library
│   │   ├── examples/                # Component examples
│   │   └── README.md                # Component documentation
│   ├── charts/             # Chart components (Recharts)
│   ├── import/             # Data import functionality
│   ├── layout/             # Layout components (sidebar, dashboard-layout)
│   ├── okr/                # OKR-specific components (cards, progress bars)
│   └── ui/                 # Shadcn/ui base components
│       ├── accordion.tsx            # New accordion component
│       ├── form.tsx                 # Enhanced form component
│       ├── radio-group.tsx          # Radio group component
│       └── tooltip.tsx              # Enhanced tooltip component
├── lib/                     # Utility libraries
│   ├── ai/                  # ✅ AI functionality (IMPLEMENTED - Expanded)
│   │   ├── ab-testing.ts            # A/B testing for AI responses
│   │   ├── alerting-system.ts       # Cost and performance alerts
│   │   ├── analytics-engine.ts      # AI analytics processing
│   │   ├── benchmarking.ts          # Performance benchmarking
│   │   ├── benchmarking-db.ts       # Database benchmarking
│   │   ├── cache-layer.ts           # Smart caching system
│   │   ├── cache-optimization.ts    # Advanced cache optimization
│   │   ├── conversation-manager.ts  # Chat session management
│   │   ├── conversation-manager-db.ts # Database conversation persistence
│   │   ├── conversation-manager-redis.ts # Redis conversation management
│   │   ├── dashboard-data-layer.ts  # Dashboard data aggregation
│   │   ├── performance-analytics.ts # Performance tracking
│   │   ├── performance-analytics-db.ts # Database performance analytics
│   │   ├── performance-monitor.ts   # Real-time performance monitoring
│   │   ├── quality-metrics.ts       # AI quality assessment
│   │   ├── rate-limiter.ts          # Cost control
│   │   ├── rate-limiter-db.ts       # Database rate limiting
│   │   ├── rate-limiter-redis.ts    # Redis rate limiting
│   │   └── streaming-handler.ts     # AI response streaming
│   ├── services/           # ✅ Business services (IMPLEMENTED - Expanded)
│   │   ├── ai-client.ts             # AI client service
│   │   ├── onboarding-service.ts    # Onboarding business logic
│   │   ├── organization-service.ts  # Organization management
│   │   ├── session-service.ts       # Session management
│   │   └── smart-validation.ts      # AI-powered validation
│   ├── redis/              # ✅ Redis integration (NEW)
│   │   ├── cache-manager.ts         # Redis cache management
│   │   ├── client.ts                # Redis client setup
│   │   ├── rate-limiter.ts          # Redis rate limiting
│   │   └── test-integration.ts      # Redis testing utilities
│   ├── performance/        # ✅ Performance services (NEW)
│   │   ├── unified-benchmarking-service.ts # Unified benchmarking
│   │   ├── unified-dashboard-service.ts # Dashboard performance
│   │   ├── unified-performance-service.ts # Performance management
│   │   └── unified-quality-service.ts # Quality management
│   ├── database/           # Database layer
│   │   ├── client.ts       # PostgreSQL client
│   │   ├── queries/        # Query repositories
│   │   └── services/       # Business logic services
│   ├── hooks/              # Custom React hooks
│   │   ├── use-ai.tsx              # ✅ AI interaction hook (IMPLEMENTED)
│   │   ├── use-onboarding-form.ts  # ✅ Onboarding form management (IMPLEMENTED)
│   │   ├── use-smart-form.tsx      # ✅ Smart form validation (IMPLEMENTED)
│   │   └── use-auth.tsx            # Authentication hook
│   ├── stores/             # ✅ State management (NEW)
│   │   ├── ai-store.ts             # AI state management
│   │   └── onboarding-store.ts     # Onboarding state
│   ├── types/              # TypeScript definitions
│   │   ├── onboarding.ts           # ✅ Onboarding types (IMPLEMENTED)
│   │   ├── smart-forms.ts          # ✅ Smart form types (IMPLEMENTED)
│   │   ├── import.ts               # Import functionality types
│   │   └── okr.ts                  # OKR domain types
│   ├── forms/              # ✅ Form utilities (NEW)
│   │   └── form-utils.ts           # Form validation and utilities
│   ├── config/             # ✅ Configuration (NEW)
│   │   └── onboarding-config.ts    # Onboarding configuration
│   ├── database/           # Enhanced database layer
│   │   ├── client.ts               # PostgreSQL client
│   │   ├── schema.ts               # Enhanced schema with AI & onboarding
│   │   ├── services.ts             # Business logic services
│   │   ├── onboarding-queries.ts   # Onboarding-specific queries
│   │   └── onboarding-types.ts     # Onboarding database types
│   ├── middleware/         # ✅ Middleware (NEW)
│   │   ├── onboarding-middleware.ts # Onboarding request handling
│   │   └── onboarding-security.ts  # Security middleware
│   ├── validation/         # ✅ Validation (NEW)
│   │   ├── environment.ts          # Environment validation
│   │   └── onboarding-schemas.ts   # Onboarding validation schemas
│   ├── validations/        # ✅ Form validations (NEW)
│   │   └── onboarding-schemas.ts   # Form validation schemas
│   └── utils/              # ✅ Enhanced utilities (NEW)
│       ├── accessibility-testing.ts # A11y testing utilities
│       └── color-contrast.ts       # Color contrast validation
│   └── utils.ts            # Shadcn utility functions (cn)
├── stack/                   # NeonAuth (Stack) configuration
│   ├── client.ts           # Client-side auth
│   └── server.ts           # Server-side auth
├── tests/                   # ✅ Testing infrastructure (NEW)
│   ├── accessibility/              # Accessibility testing
│   │   └── onboarding-a11y.test.tsx
│   ├── components/                 # Component testing
│   │   └── onboarding/
│   │       ├── ProgressIndicator.test.tsx
│   │       └── WizardContainer.test.tsx
│   ├── integration/                # Integration testing
│   │   └── onboarding-flow.test.tsx
│   ├── performance/                # Performance testing
│   │   └── shadcn-performance.test.tsx
│   ├── utils/                      # Testing utilities
│   │   ├── onboarding-test-utils.tsx
│   │   └── test-utils.tsx
│   └── setup.ts                    # Jest setup
├── stories/                 # ✅ Storybook documentation (NEW)
│   └── onboarding/
│       ├── ProgressIndicator.stories.tsx
│       └── WizardContainer.stories.tsx
├── .storybook/             # ✅ Storybook configuration (NEW)
│   ├── main.ts                     # Storybook config
│   ├── preview.ts                  # Preview config
│   └── theme.ts                    # Theme configuration
├── docs/                   # ✅ Enhanced documentation (EXPANDED)
│   ├── accessibility-testing-guide.md # A11y testing guide
│   ├── components/                # Component documentation
│   │   └── shadcn-extensions.md   # Extended component docs
│   ├── patterns/                  # Design patterns
│   │   ├── accessibility-patterns.md # A11y patterns
│   │   └── animation-patterns.md  # Animation patterns
│   ├── AI_GATEWAY_IMPLEMENTATION_GUIDE.md # AI implementation patterns
│   └── NEON_STACK_AUTH_SETUP.md   # NeonAuth setup guide
├── scripts/                # ✅ Enhanced scripts (EXPANDED)
│   ├── test-redis.js              # Redis testing script
│   ├── validate-accessibility.js  # A11y validation
│   └── validate-theme-contrast.js # Color contrast validation
├── public/                 # Static assets and placeholders
├── styles/                 # Additional CSS styles
├── install/                # Installation scripts for CCPM
├── components.json          # Shadcn/ui configuration
├── middleware.ts            # Next.js middleware for auth
├── next.config.mjs          # Next.js configuration
├── jest.config.js           # ✅ Jest configuration (NEW)
├── lighthouse.config.js     # ✅ Lighthouse performance config (NEW)
├── package.json             # Enhanced dependencies and npm scripts
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.js       # ✅ Enhanced Tailwind CSS configuration
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

### `/app/api/` - API Routes (✅ IMPLEMENTED - Updated Sep 2025)
```
app/api/
├── ai/                      # ✅ AI Gateway integration (IMPLEMENTED)
│   ├── analytics/           # AI analytics & insights
│   ├── cache/               # AI cache management
│   ├── metrics/             # Performance metrics
│   ├── smart-suggestions/   # Smart OKR suggestions
│   ├── suggestions/         # Core suggestions API
│   └── status/              # Health check and cost tracking
├── onboarding/              # ✅ Wizard backend (IMPLEMENTED)
│   ├── start/               # Initialize wizard session
│   ├── progress/            # Save step progress
│   ├── complete/            # Finalize onboarding
│   ├── organization/        # Organization creation
│   ├── industries/          # Available industries
│   ├── session/[id]/        # Session management
│   └── ai/                  # AI integration endpoints
│       ├── suggest/         # Get AI suggestions
│       ├── validate/        # Validate input with AI
│       └── complete/        # AI auto-completion
├── admin/                   # ✅ Enhanced admin endpoints (IMPLEMENTED)
│   ├── audit/               # Audit logging
│   ├── dashboard/           # Admin dashboard
│   └── redis-health/        # Redis health monitoring
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

### `/lib/` - Utility Libraries & Services (RECENTLY EXPANDED - Major AI Implementation)
```
lib/
├── ai/                      # ✅ AI functionality (IMPLEMENTED)
│   ├── analytics-engine.ts  # ✅ Analytics processing engine
│   ├── benchmarking.ts      # ✅ Performance benchmarking system
│   ├── benchmarking-db.ts   # ✅ Database benchmarking operations
│   ├── conversation-manager.ts # ✅ Chat session management
│   ├── conversation-manager-db.ts # ✅ Chat persistence layer
│   ├── cache-layer.ts       # ✅ Intelligent caching for cost control
│   ├── rate-limiter.ts      # ✅ Per-user and per-org throttling
│   ├── rate-limiter-db.ts   # ✅ Rate limiting database operations
│   ├── performance-analytics.ts # ✅ Performance tracking and metrics
│   ├── performance-analytics-db.ts # ✅ Performance data persistence
│   ├── quality-metrics.ts   # ✅ Quality assessment system
│   ├── ab-testing.ts        # ✅ A/B testing framework for AI responses
│   ├── alerting-system.ts   # ✅ Alerting for cost and performance thresholds
│   └── dashboard-data-layer.ts # ✅ Dashboard data aggregation layer
├── performance/             # ✅ NEW: Unified performance services
│   ├── unified-benchmarking-service.ts # ✅ Unified benchmarking interface
│   ├── unified-dashboard-service.ts    # ✅ Dashboard service layer
│   ├── unified-performance-service.ts  # ✅ Performance management
│   └── unified-quality-service.ts      # ✅ Quality metrics interface
├── redis/                   # ✅ IMPLEMENTED: Redis integration for caching
│   ├── cache-manager.ts     # ✅ Cache management service
│   ├── client.ts           # ✅ Redis client configuration
│   └── test-integration.ts # ✅ Redis integration tests
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