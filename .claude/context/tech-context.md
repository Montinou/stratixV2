---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-27T05:59:12Z
version: 2.0
author: Claude Code PM System
---

# Technical Context

## Technology Stack Overview for 3 PRDs Implementation

### Core Framework & AI Infrastructure
- **Next.js**: 14.2.16 (React-based full-stack framework with AI-ready App Router)
- **React**: ^18 with React DOM for AI-enhanced components
- **TypeScript**: ^5 (Strict mode enabled for AI type safety)
- **Vercel AI Gateway**: Primary AI infrastructure with unified client
- **Gemini 2.0 Flash**: Cost-effective AI model for OKR generation and insights

### Database & Authentication Stack (Enhanced for 3 PRDs)
- **Database**: NeonDB PostgreSQL 17.5 (Serverless PostgreSQL with AI extensions)
- **Database Client**: `pg` 8.16.3 (Direct PostgreSQL driver)
- **Authentication**: NeonAuth via `@stackframe/stack` 2.8.39
- **🆕 AI Data Management**: Extended schema for AI interactions, caching, and cost tracking
- **🆕 Onboarding Persistence**: Session and wizard progress tables
- **🆕 Invitation System**: Event sourcing for Brevo integration
- **Connection Management**: SSL with connection pooling for AI workloads

### AI & Smart Features Stack
- **Vercel AI Gateway**: `ai` package (latest) - Unified AI client
- **OpenAI Integration**: `@ai-sdk/openai` (latest) - Via AI Gateway
- **Gemini 2.0 Flash**: Primary model via gateway for cost optimization
- **Smart Caching**: Intelligent caching layer for cost control
- **Rate Limiting**: Per-user and per-organization AI usage controls
- **Cost Tracking**: Real-time AI usage and cost monitoring

### UI & Styling Framework (AI-Enhanced)
- **Styling**: Tailwind CSS 4.1.9 with PostCSS
- **Component System**: Shadcn/ui built on Radix UI primitives
- **🆕 AI Components**: Floating chat, smart forms, suggestion cards
- **🆕 Wizard Components**: 3-step onboarding with progressive enhancement
- **🆕 Invitation UI**: Brevo-integrated invitation management
- **Icons**: Lucide React ^0.454.0 with AI-specific additions
- **Theme Management**: next-themes ^0.4.6

### Data Handling & Validation (Extended)
- **Forms**: React Hook Form ^7.60.0 with AI-enhanced validation
- **Validation**: Zod 3.25.67 with @hookform/resolvers ^3.10.0
- **🆕 AI State Management**: Custom hooks for AI interactions
- **🆕 Wizard State**: Zustand for onboarding progress
- **Data Processing**: Papa Parse (CSV), XLSX (Excel), Date-fns
- **Charts**: Recharts (latest) for AI insights visualization

### Email & Communication Stack (New for Brevo Integration)
- **Email Service**: Brevo API for transactional emails
- **Email Templates**: Programmatic template management
- **Webhook Processing**: Event tracking for email delivery
- **Queue System**: Batch processing with rate limiting
- **JWT Security**: Token-based invitation validation

## Dependency Catalog (Updated for AI Implementation)

### Core AI Dependencies (New)
```json
{
  "@ai-sdk/openai": "latest",
  "ai": "latest",
  "@vercel/ai": "latest"
}
```

### Enhanced Production Dependencies
```json
{
  "@stackframe/stack": "^2.8.39",
  "@vercel/analytics": "latest",
  "next": "14.2.16",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5",
  "zustand": "^4.0.0", // Added for wizard state management
  "swr": "^2.0.0", // Added for AI cache management
  "jsonwebtoken": "^9.0.0", // Added for invitation tokens
  "@types/jsonwebtoken": "^9.0.0"
}
```

### AI Infrastructure Libraries
- **AI Gateway Client**: Unified client for all AI operations
- **Prompt Management**: Industry-specific prompt templates
- **Cache Layer**: Intelligent caching with TTL management
- **Rate Limiting**: Token bucket algorithm for cost control
- **Response Streaming**: Real-time AI response display

## Development Environment (Enhanced for AI)

### Enhanced NPM Scripts
```bash
# Core Development
npm run dev                    # Next.js development server with AI endpoints
npm run build                  # Production build with AI optimizations
npm run start                  # Start production server with AI services
npm run lint                   # ESLint with AI code patterns

# AI Development & Testing
npm run ai:test                # Test AI Gateway connectivity (planned)
npm run ai:cost-check          # Monitor AI usage costs (planned)
npm run ai:cache-clear         # Clear AI response cache (planned)

# Database Operations (Enhanced for AI schema)
npm run migrate                # Execute database migrations (including AI tables)
npm run migrate:with-seed      # Run migrations with AI sample data
npm run migrate:ai-schema      # Deploy AI-specific schema extensions (planned)

# Onboarding & Wizard
npm run onboarding:test        # Test wizard functionality (planned)
npm run onboarding:reset       # Reset onboarding sessions (planned)

# Invitation System
npm run invitations:test       # Test Brevo integration (planned)
npm run invitations:cleanup    # Clean expired invitations (planned)

# Brevo Integration
npm run brevo:test             # Test Brevo API connectivity (planned)
npm run brevo:templates        # Sync email templates (planned)
```

### Build Configuration (AI-Optimized)
- **Pre-build Hook**: AI schema validation before builds
- **TypeScript**: Strict mode with AI type definitions
- **ESLint**: Next.js configuration with AI code patterns
- **AI Optimizations**: Code splitting for AI components
- **Progressive Enhancement**: AI features as optional enhancements

## Database Architecture (Extended for 3 PRDs)

### NeonDB Configuration (AI-Enhanced)
- **Engine**: PostgreSQL 17.5 with AI-optimized schema
- **Connection**: Direct via `pg` client with AI workload optimization
- **🆕 AI Tables**: Interactions, caching, and cost tracking
- **🆕 Onboarding Tables**: Session persistence and wizard progress
- **🆕 Invitation Tables**: Event sourcing for Brevo integration
- **Pooling**: Enhanced connection pooling for AI workloads
- **Migration System**: Automated with AI schema management

### Database Service Layer (Enhanced)
- **AI Data Services**: Custom services for AI interaction management
- **Onboarding Services**: Wizard state and progress management
- **Invitation Services**: Brevo integration with event tracking
- **Cost Tracking**: Real-time AI usage monitoring
- **Cache Management**: Smart cache invalidation and TTL

### Schema Extensions for 3 PRDs
```sql
-- AI Infrastructure
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    type VARCHAR(50), -- 'template', 'chat', 'insights'
    request_data JSONB,
    response_data JSONB,
    cost_cents INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_cache (
    id UUID PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE,
    response_data JSONB,
    hit_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Onboarding System
CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    current_step INTEGER DEFAULT 1,
    form_data JSONB,
    ai_suggestions JSONB,
    completion_percentage FLOAT DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invitation System with Event Sourcing
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
    brevo_message_id VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invitation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced'
    brevo_event_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_interactions_user_type ON ai_interactions(user_id, type);
CREATE INDEX idx_ai_interactions_cost ON ai_interactions(cost_cents) WHERE cost_cents > 0;
CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX idx_onboarding_user_active ON onboarding_sessions(user_id) WHERE completed_at IS NULL;
CREATE INDEX idx_invitations_org_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_expires ON invitations(expires_at) WHERE status IN ('pending', 'sent');
CREATE INDEX idx_invitation_events_type ON invitation_events(invitation_id, event_type);
```

## AI Integration Architecture

### Vercel AI Gateway Client
- **Unified Interface**: Single client for all AI operations
- **Model Abstraction**: Easy switching between AI models
- **Cost Optimization**: Intelligent routing to most cost-effective models
- **Error Handling**: Graceful degradation when AI unavailable
- **Streaming Support**: Real-time response streaming

### AI Service Layer
```typescript
// lib/ai/gateway-client.ts - Unified AI Gateway client
interface AIGatewayClient {
  generateOKRTemplate(industry: string, size: string): Promise<OKRTemplate>;
  chatCompletion(messages: ChatMessage[]): Promise<ChatResponse>;
  generateInsights(data: OKRData): Promise<InsightResponse>;
  validateInput(input: string, context: string): Promise<ValidationResponse>;
}

// lib/ai/prompt-manager.ts - Industry-specific prompts
interface PromptManager {
  getOKRPrompt(industry: string): string;
  getChatSystemPrompt(): string;
  getInsightPrompt(dataType: string): string;
}

// lib/ai/cache-layer.ts - Smart caching for cost control
interface CacheLayer {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, response: any, ttl: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getStats(): Promise<CacheStats>;
}
```

### Cost Management System
- **Usage Tracking**: Real-time monitoring of AI API calls
- **Budget Controls**: Per-user and per-organization limits
- **Cache Optimization**: Aggressive caching to minimize costs
- **Rate Limiting**: Token bucket algorithm for cost control
- **Cost Analytics**: Detailed cost breakdown and trends

## Authentication System (Enhanced for Invitations)

### NeonAuth (Stack Auth) Extensions
- **Invitation Flow**: Seamless integration with Stack Auth registration
- **Token-Based Access**: JWT tokens for invitation validation
- **Role Management**: Enhanced role assignment during invitation acceptance
- **Session Enhancement**: Extended session data for onboarding state
- **Security Audit**: Enhanced logging for invitation-related auth events

### Security Features (Enhanced)
- **Invitation Security**: Secure token generation with expiration
- **AI Access Control**: Per-user AI feature access controls
- **Data Privacy**: GDPR-compliant AI interaction logging
- **Session Management**: Enhanced session tracking for wizard state
- **Audit Trail**: Comprehensive logging for compliance

## Performance & Optimization (AI-Enhanced)

### Frontend Performance (AI-Optimized)
- **Progressive Loading**: AI components loaded on demand
- **Response Streaming**: Real-time AI response display
- **Smart Caching**: Client-side caching for AI suggestions
- **Code Splitting**: AI features separated into chunks
- **Lazy Loading**: Wizard steps loaded progressively

### Backend Performance (AI & Email Optimized)
- **AI Response Caching**: Intelligent caching with TTL
- **Database Optimization**: Indexes for AI and invitation queries
- **Connection Pooling**: Optimized for AI workload patterns
- **Queue System**: Async processing for email and AI operations
- **Rate Limiting**: Prevents API cost overruns

### Deployment Performance (Enhanced)
- **AI Gateway Edge**: Leverages Vercel edge functions
- **Brevo Integration**: Reliable email delivery with webhooks
- **Cache Warming**: Pre-populate common AI responses
- **Health Monitoring**: Enhanced monitoring for AI services
- **Cost Alerting**: Real-time cost monitoring and alerts

## Development Tools & Workflow (AI-Enhanced)

### Code Quality (Extended)
- **AI Type Safety**: Comprehensive TypeScript for AI interactions
- **Prompt Validation**: Testing framework for AI prompts
- **Cost Testing**: Simulated AI calls for development
- **Email Testing**: Brevo sandbox integration for development

### Development Workflow (Enhanced)
- **AI Development**: Local AI Gateway proxy for development
- **Wizard Testing**: Specialized testing for onboarding flows
- **Email Testing**: Brevo test mode for invitation flows
- **Performance Profiling**: AI response time monitoring

### Component Development (AI-Focused)
- **AI Component Library**: Specialized components for AI interactions
- **Wizard Components**: Reusable onboarding flow components
- **Invitation Components**: Brevo-integrated UI components
- **Testing Framework**: Comprehensive testing for AI features

## Integration Architecture (3 PRDs Focus)

### Motor AI Completo Integration
- **Gateway Client**: Unified interface to Vercel AI Gateway
- **Cost Management**: Aggressive caching and rate limiting
- **Model Selection**: Intelligent routing to cost-effective models
- **Response Streaming**: Real-time AI interaction feedback

### Frontend Onboarding AI Integration
- **Progressive Enhancement**: Works without AI, enhanced with AI
- **Wizard State**: Persistent session and progress tracking
- **AI Assistance**: Contextual help throughout onboarding
- **Spanish Localization**: Native Spanish AI interactions

### Sistema Invitaciones Brevo Integration
- **Email Automation**: Reliable transactional email delivery
- **Event Tracking**: Comprehensive delivery and engagement tracking
- **Webhook Processing**: Real-time email event processing
- **Queue Management**: Batch processing for large invitation volumes

## Environment Configuration (Enhanced)

### Core Environment Variables (AI-Extended)
```bash
# AI Configuration
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
AI_MODEL_PRIMARY=gemini-2.0-flash
AI_CACHE_TTL=3600
AI_RATE_LIMIT_PER_USER=100
AI_COST_ALERT_THRESHOLD=50

# Brevo Integration
BREVO_API_KEY=xkeysib-your_brevo_key
BREVO_SENDER_EMAIL=noreply@stratix.com
BREVO_SENDER_NAME=Stratix OKR Platform
BREVO_WEBHOOK_SECRET=your_webhook_secret

# Database (Enhanced)
DATABASE_URL=postgresql://user:pass@host/db
DATABASE_URL_UNPOOLED=postgresql://user:pass@host/db
AI_DATABASE_POOL_SIZE=20
INVITATION_CLEANUP_INTERVAL=86400

# Authentication (Extended)
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_key
STACK_SECRET_SERVER_KEY=your_stack_secret
JWT_SECRET=your_jwt_secret_for_invitations

# Feature Flags
FEATURE_AI_ENABLED=true
FEATURE_ONBOARDING_WIZARD=true
FEATURE_BREVO_INVITATIONS=true
```

### Security & Compliance (Enhanced)
- **AI Data Privacy**: GDPR-compliant AI interaction logging
- **Invitation Security**: Secure token generation and validation
- **Cost Controls**: Automated budget enforcement
- **Audit Logging**: Comprehensive logging for compliance
- **Data Retention**: Configurable retention policies for AI data

---

**Last Updated**: 2025-09-27T05:59:12Z
**Version**: 2.0 - Complete technical stack for AI-powered onboarding with 3 PRDs
**Key Focus**: Vercel AI Gateway + Gemini 2.0 Flash foundation with Brevo integration and enhanced PostgreSQL schema