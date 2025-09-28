---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-27T23:11:47Z
version: 2.1
author: Claude Code PM System
---

# System Patterns & Architecture

## Design Patterns for 3 PRDs Implementation

### AI-First Architecture Patterns

#### Motor AI Completo Patterns
- **Gateway Pattern**: Unified AI Gateway client abstracts multiple AI providers
- **Caching Proxy Pattern**: Intelligent caching layer with TTL and cost optimization
- **Rate Limiting Pattern**: Token bucket algorithm for cost control and fair usage
- **Prompt Template Pattern**: Industry-specific prompt management with versioning
- **Circuit Breaker Pattern**: Graceful degradation when AI services unavailable

#### Progressive Enhancement Pattern (Frontend Onboarding)
- **Core Functionality**: Basic wizard works without AI
- **Enhanced Experience**: AI assistance layered on top
- **Feature Detection**: Runtime detection of AI availability
- **Graceful Fallback**: Seamless fallback to non-AI experience
- **Incremental Loading**: AI components loaded on demand

#### Event Sourcing Pattern (Invitation System)
- **Immutable Events**: All invitation state changes as events
- **Event Replay**: Reconstruct current state from event history
- **Audit Trail**: Complete history for compliance and debugging
- **Webhook Integration**: External events (Brevo) integrated into event stream
- **CQRS Implementation**: Separate read/write models for performance

### Component Architecture Patterns

#### AI-Enhanced Component Composition
```typescript
// Smart Component Pattern - AI-enhanced components
interface SmartComponent<T> {
  baseComponent: React.Component<T>;
  aiEnhancement?: AIEnhancement;
  fallbackBehavior: FallbackBehavior;
  progressiveEnhancement: boolean;
}

// Example: Smart Form Field
<SmartFormField
  type="text"
  name="company_name"
  aiSuggestions={true}
  placeholder="Nombre de tu empresa"
  validation={companyNameSchema}
  aiPrompt="suggest company names for {industry}"
  fallbackPlaceholder="Ingresa el nombre de tu empresa"
/>
```

#### Wizard State Management Pattern
```typescript
// Zustand store for wizard state
interface OnboardingState {
  currentStep: number;
  formData: Record<string, any>;
  aiSuggestions: Record<string, any>;
  progress: number;
  isAIEnabled: boolean;

  // Actions
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (step: string, data: any) => void;
  saveProgress: () => Promise<void>;
  loadSession: (userId: string) => Promise<void>;
}
```

#### Invitation Management Pattern
```typescript
// Event-driven invitation state
type InvitationEvent =
  | { type: 'CREATED'; payload: InvitationData }
  | { type: 'SENT'; payload: { messageId: string } }
  | { type: 'DELIVERED'; payload: BrevoEvent }
  | { type: 'VIEWED'; payload: { timestamp: Date } }
  | { type: 'ACCEPTED'; payload: { userId: string } }
  | { type: 'EXPIRED'; payload: { reason: string } };

// Event reducer pattern
function invitationReducer(state: InvitationState, event: InvitationEvent): InvitationState {
  switch (event.type) {
    case 'SENT':
      return { ...state, status: 'sent', sentAt: new Date(), messageId: event.payload.messageId };
    case 'VIEWED':
      return { ...state, status: 'viewed', viewedAt: event.payload.timestamp };
    // ... other cases
  }
}
```

### State Management Patterns

#### AI Interaction State Pattern
```typescript
// Custom hook for AI interactions
function useAI() {
  const [state, setState] = useState<AIState>({
    isLoading: false,
    response: null,
    error: null,
    cost: 0
  });

  const generateOKR = useCallback(async (industry: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check cache first
      const cached = await aiCache.get(`okr_${industry}`);
      if (cached) {
        setState(prev => ({ ...prev, response: cached, isLoading: false }));
        return cached;
      }

      // Generate with AI Gateway
      const response = await aiGateway.generateOKRTemplate(industry);

      // Cache the response
      await aiCache.set(`okr_${industry}`, response, AI_CACHE_TTL);

      setState(prev => ({
        ...prev,
        response,
        isLoading: false,
        cost: prev.cost + response.cost
      }));

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, error, isLoading: false }));
      throw error;
    }
  }, []);

  return { ...state, generateOKR };
}
```

#### Form State with AI Enhancement Pattern
```typescript
// React Hook Form with AI validation
function useSmartForm<T>(schema: ZodSchema<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onChange'
  });

  const { generateSuggestion, validateWithAI } = useAI();

  const enhanceField = useCallback(async (fieldName: string, context: any) => {
    if (!AI_ENABLED) return;

    const suggestion = await generateSuggestion(fieldName, context);

    // Update form with AI suggestion
    form.setValue(fieldName, suggestion.value);

    // Add visual indicator for AI assistance
    setFieldEnhancement(fieldName, suggestion);
  }, [form]);

  return { ...form, enhanceField };
}
```

### Data Flow Architecture (Enhanced)

#### AI-Enhanced Data Flow
```
User Input → Form Validation → AI Enhancement → Cache Check → AI Gateway → Response Caching → UI Update
     ↓              ↓               ↓              ↓            ↓              ↓           ↓
Spanish UX → Zod Schema → Smart Suggestions → Cost Control → Gemini 2.0 → Smart Cache → Progressive UI
     ↓              ↓               ↓              ↓            ↓              ↓           ↓
Auth Context → Field Validation → Context Aware → Rate Limit → Model Router → TTL Management → State Update
```

#### Onboarding Wizard Flow
```
Welcome Step → Company Info → Organization Setup → OKR Creation → Completion
    ↓              ↓              ↓                ↓              ↓
Value Prop → AI Industry → AI Department → AI Templates → Success + Redirect
    ↓              ↓              ↓                ↓              ↓
30 seconds → 2 minutes → 1 minute → 2 minutes → Immediate
    ↓              ↓              ↓                ↓              ↓
Pure UI → Form + AI → Visual Builder → Conversational → Auto-Login
```

#### Invitation System Flow
```
Invitation Form → Validation → Brevo Queue → Email Sending → Event Tracking → State Update
       ↓             ↓           ↓             ↓              ↓              ↓
Multi-email → Zod Schema → Batch Process → API Call → Webhook → Event Store
       ↓             ↓           ↓             ↓              ↓              ↓
Role Assignment → Domain Check → Rate Limit → Template → Delivery → UI Refresh
```

## Integration Patterns

### AI Gateway Integration Pattern
```typescript
// Unified AI client with provider abstraction
class AIGatewayClient {
  private providers: AIProvider[];
  private cache: CacheLayer;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;

  async generateResponse(prompt: string, context: AIContext): Promise<AIResponse> {
    // Check rate limits
    await this.rateLimiter.checkLimit(context.userId);

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, context);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Route to best provider based on cost and availability
    const provider = this.selectOptimalProvider(context);

    // Generate response
    const response = await provider.generate(prompt, context);

    // Track cost
    await this.costTracker.recordUsage(context.userId, response.cost);

    // Cache response
    await this.cache.set(cacheKey, response, this.calculateTTL(response));

    return response;
  }

  private selectOptimalProvider(context: AIContext): AIProvider {
    // Cost-based routing with fallbacks
    if (context.budget === 'economy') return this.providers.find(p => p.name === 'gemini-flash');
    if (context.complexity === 'high') return this.providers.find(p => p.name === 'gpt-4');
    return this.providers.find(p => p.name === 'gemini-2.0-flash'); // Default
  }
}
```

### Brevo Integration Pattern
```typescript
// Email service with event sourcing
class BrevoInvitationService {
  private brevoClient: BrevoClient;
  private eventStore: EventStore;
  private queueManager: QueueManager;

  async sendInvitation(invitation: InvitationData): Promise<void> {
    // Add to queue for batch processing
    await this.queueManager.enqueue('send_invitation', invitation);
  }

  async processBatch(invitations: InvitationData[]): Promise<void> {
    for (const invitation of invitations) {
      try {
        // Send via Brevo API
        const result = await this.brevoClient.sendTransactionalEmail({
          to: [{ email: invitation.email }],
          templateId: this.getTemplateId(invitation.role),
          params: this.buildTemplateParams(invitation)
        });

        // Record success event
        await this.eventStore.append(invitation.id, {
          type: 'SENT',
          payload: { messageId: result.messageId },
          timestamp: new Date()
        });

      } catch (error) {
        // Record failure event
        await this.eventStore.append(invitation.id, {
          type: 'SEND_FAILED',
          payload: { error: error.message },
          timestamp: new Date()
        });
      }
    }
  }

  async handleWebhook(event: BrevoWebhookEvent): Promise<void> {
    // Map Brevo event to our event format
    const invitationEvent = this.mapBrevoEvent(event);

    // Store in event stream
    await this.eventStore.append(event.messageId, invitationEvent);

    // Update invitation state
    await this.updateInvitationState(event.messageId, invitationEvent);
  }
}
```

### Progressive Enhancement Pattern
```typescript
// Progressive enhancement for AI features
function withAIEnhancement<T>(Component: React.ComponentType<T>) {
  return function EnhancedComponent(props: T & { aiEnabled?: boolean }) {
    const { aiEnabled = true, ...componentProps } = props;
    const [isAIAvailable, setIsAIAvailable] = useState(false);

    useEffect(() => {
      // Test AI availability
      if (aiEnabled && AI_GATEWAY_API_KEY) {
        aiGateway.healthCheck()
          .then(() => setIsAIAvailable(true))
          .catch(() => setIsAIAvailable(false));
      }
    }, [aiEnabled]);

    return (
      <AIContext.Provider value={{ available: isAIAvailable, enabled: aiEnabled }}>
        <Component {...componentProps as T} />
      </AIContext.Provider>
    );
  };
}

// Usage
const SmartOnboardingWizard = withAIEnhancement(OnboardingWizard);
```

## Performance Patterns

### Caching Strategies for AI

#### Multi-Layer Caching Pattern
```typescript
// L1: Browser cache (short-term, user-specific)
// L2: Redis cache (medium-term, shared)
// L3: Database cache (long-term, persistent)

class MultiLayerCache {
  private l1: Map<string, CachedResponse> = new Map();
  private l2: RedisClient;
  private l3: DatabaseCache;

  async get(key: string): Promise<CachedResponse | null> {
    // Check L1 first
    if (this.l1.has(key)) {
      return this.l1.get(key)!;
    }

    // Check L2
    const l2Result = await this.l2.get(key);
    if (l2Result) {
      this.l1.set(key, l2Result); // Promote to L1
      return l2Result;
    }

    // Check L3
    const l3Result = await this.l3.get(key);
    if (l3Result) {
      await this.l2.set(key, l3Result, 3600); // Promote to L2
      this.l1.set(key, l3Result); // Promote to L1
      return l3Result;
    }

    return null;
  }

  async set(key: string, value: CachedResponse, ttl: number): Promise<void> {
    this.l1.set(key, value);
    await this.l2.set(key, value, ttl);
    await this.l3.set(key, value, ttl * 24); // Longer TTL for L3
  }
}
```

#### Cost-Aware Caching Pattern
```typescript
// Cache decisions based on cost and usage patterns
class CostAwareCacheManager {
  calculateCacheTTL(response: AIResponse, context: CacheContext): number {
    const baseTTL = 3600; // 1 hour

    // High-cost responses get longer cache
    const costMultiplier = Math.min(response.cost / 10, 5); // Max 5x

    // Frequently requested content gets longer cache
    const popularityMultiplier = context.hitCount > 100 ? 2 : 1;

    // User-specific vs. global cacheable
    const scopeMultiplier = context.isUserSpecific ? 0.5 : 2;

    return baseTTL * costMultiplier * popularityMultiplier * scopeMultiplier;
  }

  shouldCache(response: AIResponse): boolean {
    // Cache expensive responses
    if (response.cost > 5) return true;

    // Cache successful responses
    if (response.success && response.quality > 0.8) return true;

    // Don't cache errors or low-quality responses
    return false;
  }
}
```

### Database Performance Patterns

#### Optimized Queries for AI Workloads
```sql
-- Efficient AI interaction queries with proper indexing
-- Query frequent AI interactions by user and type
SELECT ai.*, u.email
FROM ai_interactions ai
JOIN users u ON ai.user_id = u.id
WHERE ai.user_id = $1 AND ai.type = $2
ORDER BY ai.created_at DESC
LIMIT 10;

-- Index: idx_ai_interactions_user_type (user_id, type, created_at)

-- Query cached responses with TTL check
SELECT response_data, hit_count
FROM ai_cache
WHERE cache_key = $1 AND expires_at > NOW();

-- Index: idx_ai_cache_key_expires (cache_key, expires_at)

-- Aggregate cost data by organization
SELECT
  o.name as organization_name,
  SUM(ai.cost_cents) as total_cost_cents,
  COUNT(*) as interaction_count,
  AVG(ai.processing_time_ms) as avg_processing_time
FROM ai_interactions ai
JOIN organizations o ON ai.organization_id = o.id
WHERE ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name
ORDER BY total_cost_cents DESC;

-- Invitation system with event sourcing performance
-- Get invitation with latest status
SELECT DISTINCT ON (i.id)
  i.*,
  ie.event_type as latest_event,
  ie.created_at as latest_event_time
FROM invitations i
LEFT JOIN invitation_events ie ON i.id = ie.invitation_id
WHERE i.organization_id = $1
ORDER BY i.id, ie.created_at DESC;
```

## Security Patterns

### AI Security Pattern
```typescript
// Secure AI interactions with user context validation
class SecureAIService {
  async generateResponse(prompt: string, context: UserContext): Promise<AIResponse> {
    // Validate user permissions
    if (!await this.hasAIAccess(context.userId)) {
      throw new Error('AI access not permitted');
    }

    // Sanitize prompt to prevent injection
    const sanitizedPrompt = this.sanitizePrompt(prompt);

    // Add user context for personalization while maintaining privacy
    const enhancedPrompt = this.addSecureContext(sanitizedPrompt, context);

    // Generate response
    const response = await this.aiGateway.generate(enhancedPrompt);

    // Log interaction for audit
    await this.auditLogger.log({
      userId: context.userId,
      action: 'AI_GENERATE',
      prompt: this.hashPrompt(prompt), // Hash for privacy
      cost: response.cost,
      timestamp: new Date()
    });

    return response;
  }

  private sanitizePrompt(prompt: string): string {
    // Remove potential injection patterns
    return prompt
      .replace(/\b(system|assistant|user):/gi, '') // Remove role indicators
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
  }

  private addSecureContext(prompt: string, context: UserContext): string {
    // Add context without exposing sensitive data
    return `Context: Industry=${context.industry}, Company Size=${context.companySize}, Language=Spanish\n\nUser Request: ${prompt}`;
  }
}
```

### Invitation Security Pattern
```typescript
// Secure invitation tokens with expiration and validation
class InvitationTokenService {
  generateSecureToken(invitation: InvitationData): string {
    const payload = {
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.getTime()
    };

    return jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d'
    });
  }

  async validateToken(token: string): Promise<InvitationValidation> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as InvitationTokenPayload;

      // Check if invitation still exists and is valid
      const invitation = await this.getInvitation(payload.invitationId);

      if (!invitation) {
        return { valid: false, reason: 'Invitation not found' };
      }

      if (invitation.status !== 'sent' && invitation.status !== 'viewed') {
        return { valid: false, reason: 'Invitation no longer valid' };
      }

      if (new Date() > invitation.expiresAt) {
        return { valid: false, reason: 'Invitation expired' };
      }

      return { valid: true, invitation };
    } catch (error) {
      return { valid: false, reason: 'Invalid token' };
    }
  }
}
```

## Error Handling Patterns

### AI Error Handling with Graceful Degradation
```typescript
// Resilient AI service with multiple fallback strategies
class ResilientAIService {
  async generateWithFallback(prompt: string, context: AIContext): Promise<AIResponse> {
    const strategies = [
      () => this.tryPrimaryAI(prompt, context),
      () => this.trySecondaryAI(prompt, context),
      () => this.tryTemplateBasedResponse(prompt, context),
      () => this.tryStaticResponse(prompt, context)
    ];

    for (const strategy of strategies) {
      try {
        const response = await strategy();
        if (response.success) return response;
      } catch (error) {
        console.warn('AI strategy failed:', error.message);
      }
    }

    // Final fallback: disable AI features gracefully
    return this.getManualFallback(context);
  }

  private async tryPrimaryAI(prompt: string, context: AIContext): Promise<AIResponse> {
    return await this.aiGateway.generate(prompt, { model: 'gemini-2.0-flash' });
  }

  private async trySecondaryAI(prompt: string, context: AIContext): Promise<AIResponse> {
    return await this.aiGateway.generate(prompt, { model: 'gpt-3.5-turbo' });
  }

  private async tryTemplateBasedResponse(prompt: string, context: AIContext): Promise<AIResponse> {
    // Use pre-built templates based on context
    const template = this.templateManager.getTemplate(context.industry, context.type);
    return { success: true, data: template, cost: 0, source: 'template' };
  }

  private getManualFallback(context: AIContext): AIResponse {
    return {
      success: true,
      data: { message: 'AI asistente no disponible. Continúa manualmente.' },
      cost: 0,
      source: 'manual'
    };
  }
}
```

---

**Last Updated**: 2025-09-27T05:59:12Z
**Version**: 2.0 - Complete system patterns for AI-powered onboarding with 3 PRDs implementation
**Key Focus**: Progressive enhancement, event sourcing, AI gateway patterns, and cost-aware caching