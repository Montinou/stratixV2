# Issue #63: Cost Management & Rate Limiting System - Parallel Work Streams Analysis

## Overview
Analysis of GitHub Issue #63 for implementing comprehensive cost tracking and rate limiting infrastructure to control AI service expenses. This breaks down the system into parallel work streams optimized for multi-agent development.

## Issue Summary
- **Title**: Cost Management & Rate Limiting System
- **Status**: Open
- **Effort**: M (2-3 days, 16-24 hours)
- **Parallel**: Yes (uses separate infrastructure from AI client and database)
- **GitHub URL**: https://github.com/Montinou/stratixV2/issues/63

## Current Infrastructure Context

### Existing Authentication System
- **Stack Auth**: Fully integrated with user authentication
- **User Roles**: corporativo, gerente, empleado with hierarchical permissions
- **Multi-tenancy**: Company-based isolation with `tenantId` support
- **Session Management**: Server-side authentication with middleware

### Existing AI Infrastructure
- **AI Gateway**: Vercel AI Gateway with budget-focused models (gpt-4o-mini, claude-3-haiku)
- **Current AI Endpoints**: `/api/ai/suggestions/route.ts` and `/api/ai/smart-suggestions/route.ts`
- **Cost Optimization**: Already using budget models (gpt-4o-mini as primary)

### Database Schema
- **NeonDB**: PostgreSQL with Drizzle ORM
- **RLS Policies**: Role-based access control implemented
- **Multi-tenancy**: Tenant isolation across all tables

## Parallel Work Streams Breakdown

### Stream A: Rate Limiting Core Infrastructure
**Agent Type**: `backend-architect`
**Priority**: High (Foundation for all other streams)

#### Scope & Responsibilities
- Implement token bucket algorithm for rate limiting
- Create Redis integration for distributed rate limiting
- Build per-user and per-organization rate limits
- Implement middleware integration layer

#### Files to Create/Modify
```
/lib/ai/rate-limiter.ts                    # Core rate limiting logic
/lib/ai/rate-limit-storage.ts              # Redis/cache abstraction
/lib/ai/rate-limit-middleware.ts           # Next.js middleware integration
/lib/types/rate-limiting.ts                # Type definitions
```

#### Integration Points
- **Auth Integration**: Use existing `useAuth()` hook and user profiles
- **User Tiers**: Integrate with existing `userRoleEnum` (corporativo/gerente/empleado)
- **Multi-tenancy**: Respect existing `tenantId` isolation

#### Key Features
```typescript
interface RateLimits {
  empleado: 5,      // 5 requests/minute
  gerente: 20,      // 20 requests/minute
  corporativo: 100  // 100 requests/minute
}

interface OrgLimits {
  daily_budget_cents: number,
  monthly_budget_cents: number,
  emergency_stop_threshold: number // 90% of budget
}
```

#### Dependencies
- Redis service configuration
- Integration with existing authentication middleware

---

### Stream B: Cost Tracking & Budget Management
**Agent Type**: `data-analytics-specialist`
**Priority**: High (Parallel with Stream A)

#### Scope & Responsibilities
- Real-time cost calculation based on token usage
- Budget tracking per user and organization
- Historical cost analysis and reporting
- Database schema for cost tracking

#### Files to Create/Modify
```
/lib/ai/cost-tracker.ts                    # Cost calculation logic
/lib/ai/budget-manager.ts                  # Budget control system
/lib/database/schema-cost-tracking.ts      # Database tables for costs
/app/api/ai/usage/route.ts                 # Usage analytics endpoint
/lib/types/cost-tracking.ts               # Type definitions
```

#### Database Schema Extensions
```sql
-- New tables to add to schema.ts
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  tenant_id UUID NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  model VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  request_duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  tenant_id UUID NOT NULL,
  daily_limit_cents INTEGER NOT NULL,
  monthly_limit_cents INTEGER NOT NULL,
  emergency_threshold_percent INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  tenant_id UUID NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'threshold', 'emergency', 'daily_limit'
  threshold_percent INTEGER,
  triggered_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### Integration Points
- **Existing Schema**: Extend with foreign keys to `users`, `companies`, `tenantId`
- **Auth System**: Use existing role-based access for budget viewing/editing
- **RLS Policies**: Apply tenant isolation to all new tables

---

### Stream C: Circuit Breaker & Alert System
**Agent Type**: `devops-deployment-specialist`
**Priority**: Medium (Depends on Streams A & B)

#### Scope & Responsibilities
- Emergency circuit breaker for cost protection
- Alert system for budget thresholds
- Graceful degradation when limits reached
- Notification system integration

#### Files to Create/Modify
```
/lib/ai/circuit-breaker.ts                # Circuit breaker implementation
/lib/ai/alert-system.ts                   # Budget alert logic
/lib/ai/notifications.ts                  # Email/notification service
/app/api/ai/alerts/route.ts               # Alert management endpoint
```

#### Features
- **Emergency Stop**: Automatic shutdown at 90% budget threshold
- **Graceful Degradation**: Fallback to cached responses or simplified responses
- **Alert Channels**: Email notifications for budget approaching
- **Recovery Logic**: Automatic re-enablement based on budget reset

#### Integration Points
- **Email Service**: Configure with existing notification infrastructure
- **Admin Interface**: Integrate with existing admin endpoints pattern
- **Monitoring**: Hook into existing performance monitoring

---

### Stream D: Middleware Integration & User Experience
**Agent Type**: `ui-ux-designer` + `integration-specialist`
**Priority**: Medium (Depends on all other streams)

#### Scope & Responsibilities
- Integrate rate limiting with existing AI endpoints
- Create admin interface for cost monitoring
- User-facing usage analytics
- Middleware integration with Next.js API routes

#### Files to Create/Modify
```
/middleware.ts                             # Extend existing middleware
/app/api/ai/*/route.ts                     # Modify existing AI endpoints
/components/admin/cost-dashboard.tsx       # Admin cost monitoring UI
/components/usage/usage-analytics.tsx      # User usage display
/app/admin/cost-management/page.tsx        # Admin cost management page
```

#### UI Components Needed
- **Usage Dashboard**: Show current usage vs limits for users
- **Admin Cost Panel**: Real-time cost monitoring for corporativo users
- **Budget Configuration**: UI for setting organization limits
- **Alert Management**: Interface for managing cost alerts

#### Integration Points
- **Existing AI Endpoints**: Wrap with rate limiting middleware
- **Admin Pages**: Follow existing admin route pattern (`/app/api/admin/*`)
- **Auth Protection**: Use existing `stackServerApp.getUser()` pattern
- **UI Framework**: Follow existing Shadcn/ui component patterns

---

## Integration Strategy

### Authentication Flow Integration
```typescript
// Enhanced middleware pattern
export async function aiRateLimitMiddleware(request: NextRequest) {
  const user = await stackServerApp.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get user profile for role-based limits
  const profile = await getUserProfile(user.id)
  const rateLimit = await checkRateLimit(user.id, profile.roleType, profile.tenantId)

  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: "Rate limit exceeded",
      resetTime: rateLimit.resetTime
    }, { status: 429 })
  }

  return NextResponse.next()
}
```

### Cost Tracking Integration
```typescript
// Wrap existing AI calls
export async function trackAIUsage(userId: string, companyId: string, usage: AIUsage) {
  const cost = calculateCost(usage.inputTokens, usage.outputTokens, usage.model)

  await logUsage({
    userId,
    companyId,
    tenantId: profile.tenantId,
    cost: cost.cents,
    ...usage
  })

  await checkBudgetLimits(companyId, cost.cents)
}
```

### Budget Enforcement
```typescript
// Budget checking before AI calls
export async function enforcebudgetLimits(companyId: string, estimatedCost: number) {
  const budget = await getBudgetStatus(companyId)

  if (budget.used + estimatedCost > budget.daily_limit) {
    throw new BudgetExceededException("Daily budget would be exceeded")
  }

  if (budget.used >= budget.emergency_threshold) {
    throw new EmergencyStopException("Emergency budget threshold reached")
  }
}
```

## Dependencies & Coordination

### Cross-Stream Dependencies
1. **Stream A → Stream B**: Rate limiter needs cost tracking for budget-based limits
2. **Stream A → Stream D**: Middleware integration requires core rate limiting
3. **Stream B → Stream C**: Alert system needs cost tracking data
4. **Stream C → Stream D**: UI needs alert system integration

### External Dependencies
- **Redis Service**: Required for distributed rate limiting (Stream A)
- **Email Service**: Required for budget alerts (Stream C)
- **Environment Variables**: AI Gateway API keys, Redis connection, etc.

### Agent Communication Requirements
- **Shared Context**: All agents need access to existing auth patterns and database schema
- **Integration Points**: Regular sync on API contract definitions and database changes
- **Testing Coordination**: End-to-end testing requires all streams integrated

## Budget Enforcement Mechanisms

### Per-User Rate Limits (Requests/Minute)
```typescript
const USER_RATE_LIMITS = {
  empleado: 5,      // Basic tier
  gerente: 20,      // Management tier
  corporativo: 100  // Admin tier
} as const
```

### Per-Organization Budget Limits
```typescript
interface OrganizationBudget {
  daily_limit_cents: number      // e.g., 500 cents = $5/day
  monthly_limit_cents: number    // e.g., 10000 cents = $100/month
  emergency_threshold: 0.9       // Emergency stop at 90%
  warning_threshold: 0.8         // Warning at 80%
}
```

### Cost Calculation Integration
- **Token-based Pricing**: Real-time cost calculation using model pricing
- **Provider Integration**: Support multiple AI providers with different pricing
- **Cost Optimization**: Automatic model selection based on budget constraints

## Implementation Timeline

### Phase 1 (Parallel): Foundation (Days 1-2)
- **Stream A**: Core rate limiting infrastructure
- **Stream B**: Cost tracking database schema and basic logging

### Phase 2 (Sequential): Integration (Day 2-3)
- **Stream C**: Circuit breaker and alert system
- **Stream D**: Middleware integration and basic UI

### Phase 3 (Final): Polish (Day 3)
- **All Streams**: End-to-end testing and UI refinement
- **Integration Testing**: Full system validation

## Success Metrics

### Functional Requirements
- ✅ Rate limiting prevents abuse across all user tiers
- ✅ Cost tracking accurately calculates expenses in real-time
- ✅ Budget alerts trigger before limits are exceeded
- ✅ Emergency circuit breaker activates when needed
- ✅ System handles high load without cost spikes

### Performance Requirements
- ✅ Rate limiting adds <50ms latency to API calls
- ✅ Cost tracking completes within 100ms of AI call completion
- ✅ Budget checks complete within 50ms
- ✅ System supports 1000+ concurrent users with rate limiting

### Integration Requirements
- ✅ Seamless integration with existing Stack Auth system
- ✅ Respects existing multi-tenancy and RLS policies
- ✅ Compatible with existing AI Gateway setup
- ✅ Admin interface accessible to corporativo users only
- ✅ Usage analytics available to all authenticated users

---

## Conclusion

This analysis breaks down Issue #63 into four parallel work streams that can be developed simultaneously while maintaining clear integration points. The design leverages existing authentication, database, and AI infrastructure while adding robust cost management capabilities.

**Key Success Factors:**
1. **Leverage Existing Infrastructure**: Build on Stack Auth, NeonDB, and AI Gateway
2. **Maintain Multi-tenancy**: Respect existing tenant isolation patterns
3. **Cost-Effective Design**: Use efficient algorithms and budget-conscious models
4. **Graceful Degradation**: Ensure system remains functional when limits are reached
5. **Real-time Monitoring**: Provide immediate feedback on usage and costs

The parallel work stream approach ensures efficient development while maintaining system reliability and cost control.