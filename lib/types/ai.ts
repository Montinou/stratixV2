/**
 * TypeScript type definitions for AI Gateway operations
 * Provides comprehensive type safety for all AI interactions
 */

import type { CoreMessage } from 'ai'

// Base AI operation types
export type AIOperation =
  | 'generateText'
  | 'generateChatCompletion'
  | 'generateStreamingText'
  | 'generateEmbedding'
  | 'generateEmbeddings'
  | 'healthCheck'

// Model categories
export type ModelCategory = 'text' | 'embedding' | 'analysis'

// Provider types
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'amazon-bedrock'

// AI Gateway configuration
export interface AIGatewayConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  retries?: number
}

// Model configuration
export interface ModelConfig {
  name: string
  provider: AIProvider
  category: ModelCategory
  maxTokens: number
  costPerToken: number
  isAvailable: boolean
}

// Request options
export interface AIRequestOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  stream?: boolean
  userId?: string
  metadata?: Record<string, any>
}

// Provider options for failover
export interface ProviderOptions {
  order?: string[]
  only?: string[]
  timeout?: number
  maxRetries?: number
}

// Extended request options with provider configuration
export interface ExtendedAIRequestOptions extends AIRequestOptions {
  providerOptions?: ProviderOptions
  cacheOptions?: CacheOptions
  rateLimitOptions?: RateLimitOptions
}

// Cache configuration
export interface CacheOptions {
  ttl?: number
  tags?: string[]
  enabled?: boolean
}

// Rate limiting configuration
export interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
  maxTokens?: number
  enabled?: boolean
}

// Text generation types
export interface TextGenerationRequest {
  prompt: string
  options?: ExtendedAIRequestOptions
}

export interface TextGenerationResponse {
  text: string
  usage: TokenUsage
  model: string
  provider: string
  cached: boolean
  latency: number
}

// Chat completion types
export interface ChatCompletionRequest {
  messages: CoreMessage[]
  options?: ExtendedAIRequestOptions
}

export interface ChatCompletionResponse {
  text: string
  messages: CoreMessage[]
  usage: TokenUsage
  model: string
  provider: string
  cached: boolean
  latency: number
}

// Streaming text types
export interface StreamingTextRequest {
  prompt: string
  options?: ExtendedAIRequestOptions
}

// Embedding types
export interface EmbeddingRequest {
  text: string
  options?: ExtendedAIRequestOptions
}

export interface EmbeddingResponse {
  embedding: number[]
  usage: TokenUsage
  model: string
  provider: string
  cached: boolean
  latency: number
}

export interface MultipleEmbeddingRequest {
  texts: string[]
  options?: ExtendedAIRequestOptions
}

export interface MultipleEmbeddingResponse {
  embeddings: number[][]
  usage: TokenUsage
  model: string
  provider: string
  cached: boolean
  latency: number
}

// Usage tracking
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

// Health check types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  models: Record<string, boolean>
  timestamp: Date
  latency?: number
}

export interface DetailedHealthCheck extends HealthCheckResult {
  cache: CacheStatus
  rateLimiting: RateLimitStatus
  environment: EnvironmentStatus
  modelTests?: ModelTestResult[]
  availableModels?: AvailableModels
}

export interface CacheStatus {
  status: 'operational' | 'degraded' | 'error'
  size: number
  maxSize: number
  hitRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  topEntries?: CacheEntry[]
  error?: string
}

export interface CacheEntry {
  operation: string
  hits: number
  age: number
  ttl: number
}

export interface RateLimitStatus {
  status: 'operational' | 'degraded' | 'error'
  totalEntries: number
  totalRequests: number
  totalTokens?: number
  activeUsers?: number
  topUsers?: RateLimitUser[]
  error?: string
}

export interface RateLimitUser {
  identifier: string
  requests: number
  tokens: number
}

export interface EnvironmentStatus {
  nodeEnv: string
  hasApiKey: boolean
  apiKeyValid: boolean
  configurationStatus: ConfigurationStatus
}

export interface ConfigurationStatus {
  valid: boolean
  issues: string[]
}

export interface ModelTestResult {
  type: string
  status: 'success' | 'failed'
  latency?: number
  error?: string
}

export interface AvailableModels {
  textModels: string[]
  embeddingModels: string[]
  allModels: string[]
}

// Error types
export interface AIErrorDetails {
  code: string
  message: string
  operation: string
  model?: string
  provider?: string
  userId?: string
  retryCount?: number
  retryAfter?: number
  isRetryable: boolean
  timestamp: Date
  metadata?: Record<string, any>
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  remainingTokens: number
  resetTime: number
  totalHits: number
  retryAfter?: number
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  maxTokens?: number
  keyGenerator?: (identifier: string) => string
  skipFailedRequests?: boolean
  skipSuccessfulRequests?: boolean
}

// User role types (from existing OKR system)
export type UserRole = 'corporativo' | 'gerente' | 'empleado'

// Context types for AI operations
export interface AIOperationContext {
  operation: AIOperation
  userId?: string
  userRole?: UserRole
  model: string
  provider?: string
  timestamp: Date
  metadata?: Record<string, any>
}

// Analytics and insights types
export interface InsightContext {
  role: UserRole
  objectives: any[] // Using any for now, should import from okr.ts
  initiatives: any[]
  activities: any[]
  department?: string
}

export interface SuggestionRequest {
  title?: string
  description?: string
  department?: string
  userRole: UserRole
  companyContext?: string
}

export interface AIResponse {
  initiatives: string[]
  activities: string[]
  keyMetrics: string[]
  timeline: string
  risks: string[]
}

// Monitoring and observability types
export interface AIMetrics {
  requestCount: number
  successRate: number
  averageLatency: number
  totalTokensUsed: number
  totalCost: number
  errorRate: number
  cacheHitRate: number
  rateLimitHitRate: number
}

export interface AIUsageByUser {
  userId: string
  userRole?: UserRole
  requestCount: number
  tokenUsage: number
  cost: number
  lastActivity: Date
}

export interface AIProviderMetrics {
  provider: AIProvider
  requestCount: number
  successRate: number
  averageLatency: number
  errorCount: number
  lastError?: Date
}

// Configuration validation types
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Event types for monitoring
export interface AIEvent {
  type: 'request' | 'response' | 'error' | 'cache_hit' | 'cache_miss' | 'rate_limit'
  operation: AIOperation
  userId?: string
  model: string
  provider?: string
  timestamp: Date
  duration?: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

// Utility types
export type Awaitable<T> = T | Promise<T>

export type AIHandler<TRequest, TResponse> = (
  request: TRequest,
  context?: AIOperationContext
) => Awaitable<TResponse>

// Function type for AI operations with error handling
export type AIOperationFunction<T extends any[], R> = (...args: T) => Promise<R>

// Function type for cached AI operations
export type CachedAIOperation<T extends any[], R> = (...args: T) => Promise<R>

// Function type for rate-limited AI operations
export type RateLimitedAIOperation<T extends any[], R> = (...args: T) => Promise<R>

// OKR Template Generation Types
export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
export type Industry =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'retail'
  | 'manufacturing'
  | 'education'
  | 'consulting'
  | 'marketing'
  | 'sales'
  | 'hr'
  | 'operations'
  | 'general'

export interface OKRTemplateContext {
  industry: Industry
  companySize: CompanySize
  department?: string
  role?: UserRole
  timeframe?: 'quarterly' | 'annual'
  focusArea?: string
  teamSize?: number
  companyStage?: 'early' | 'growth' | 'mature'
  specificGoals?: string[]
}

export interface KeyResult {
  title: string
  description: string
  target: string
  measurementType: 'percentage' | 'number' | 'boolean' | 'currency'
  baseline?: string
  frequency: 'weekly' | 'monthly' | 'quarterly'
}

export interface OKRTemplate {
  objective: {
    title: string
    description: string
    category: string
    timeframe: 'quarterly' | 'annual'
  }
  keyResults: KeyResult[]
  initiatives: string[]
  metrics: string[]
  risks: string[]
  successCriteria: string[]
  confidenceScore: number
  industryRelevance: number
}

export interface OKRGenerationRequest {
  context: OKRTemplateContext
  numberOfTemplates?: number
  customPrompt?: string
  existingObjectives?: string[]
}

export interface OKRGenerationResponse {
  templates: OKRTemplate[]
  metadata: {
    generatedAt: Date
    model: string
    provider: string
    requestId: string
    processingTime: number
  }
  qualityScore: number
  suggestions: string[]
}

export interface OKRValidationResult {
  isValid: boolean
  score: number
  feedback: {
    objectiveQuality: number
    keyResultsQuality: number
    measurabilityScore: number
    timelineRealism: number
    industryAlignment: number
  }
  improvements: string[]
  warnings: string[]
}