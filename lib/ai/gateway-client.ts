import { generateText, streamText, embed, embedMany, gateway } from 'ai'
import type { CoreMessage, LanguageModel, EmbeddingModel } from 'ai'

// Vercel AI Gateway client configuration
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Model configurations with fallback chains
export const AI_MODELS = {
  // Text generation models (budget-focused)
  text: {
    primary: 'openai/gpt-4o-mini',
    fallback: 'anthropic/claude-3-haiku-20240307',
    premium: 'openai/gpt-4o',
  },
  // Embedding models
  embedding: {
    primary: 'openai/text-embedding-3-small',
    fallback: 'openai/text-embedding-ada-002',
  },
  // Analysis and complex reasoning
  analysis: {
    primary: 'anthropic/claude-3-sonnet-20240229',
    fallback: 'openai/gpt-4o',
  }
} as const

// Provider configuration with failover
export interface ProviderOptions {
  order?: string[]
  only?: string[]
  timeout?: number
  maxRetries?: number
}

export interface AIRequestContext {
  operation: string
  userId?: string
  model: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface TextGenerationOptions {
  model?: keyof typeof AI_MODELS.text | string
  maxTokens?: number
  temperature?: number
  stream?: boolean
  providerOptions?: ProviderOptions
}

export interface EmbeddingOptions {
  model?: keyof typeof AI_MODELS.embedding | string
  providerOptions?: ProviderOptions
}

export class AIGatewayClient {
  private static instance: AIGatewayClient
  private readonly gateway = ai
  private readonly defaultTimeout = 30000 // 30 seconds
  private readonly maxRetries = 3

  private constructor() {}

  public static getInstance(): AIGatewayClient {
    if (!AIGatewayClient.instance) {
      AIGatewayClient.instance = new AIGatewayClient()
    }
    return AIGatewayClient.instance
  }

  /**
   * Validate that the AI Gateway is properly configured
   */
  public validateConfiguration(): void {
    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY environment variable is required')
    }

    if (!process.env.AI_GATEWAY_API_KEY.startsWith('vck_')) {
      throw new Error('Invalid AI_GATEWAY_API_KEY format. Expected format: vck_...')
    }
  }

  /**
   * Generate text using the AI Gateway
   */
  public async generateText(
    prompt: string,
    options: TextGenerationOptions = {}
  ): Promise<string> {
    this.validateConfiguration()

    const context: AIRequestContext = {
      operation: 'generateText',
      model: options.model || AI_MODELS.text.primary,
      timestamp: new Date(),
      metadata: {
        promptLength: prompt.length,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      }
    }

    try {
      const model = this.getLanguageModel(options.model || AI_MODELS.text.primary)

      const result = await generateText({
        model,
        prompt,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        providerOptions: options.providerOptions ? {
          gateway: options.providerOptions
        } : undefined,
      })

      return result.text
    } catch (error) {
      // Log error and attempt fallback if primary model fails
      console.error(`AI text generation failed for ${context.model}:`, error)

      if (options.model !== AI_MODELS.text.fallback) {
        console.log(`Attempting fallback to ${AI_MODELS.text.fallback}`)
        return this.generateText(prompt, {
          ...options,
          model: AI_MODELS.text.fallback
        })
      }

      throw new Error(`AI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate streaming text using the AI Gateway
   */
  public async generateStreamingText(
    prompt: string,
    options: TextGenerationOptions = {}
  ) {
    this.validateConfiguration()

    const context: AIRequestContext = {
      operation: 'generateStreamingText',
      model: options.model || AI_MODELS.text.primary,
      timestamp: new Date(),
      metadata: {
        promptLength: prompt.length,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      }
    }

    try {
      const model = this.getLanguageModel(options.model || AI_MODELS.text.primary)

      return streamText({
        model,
        prompt,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        providerOptions: options.providerOptions ? {
          gateway: options.providerOptions
        } : undefined,
      })
    } catch (error) {
      console.error(`AI streaming text generation failed for ${context.model}:`, error)
      throw new Error(`AI streaming text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate chat completion using messages
   */
  public async generateChatCompletion(
    messages: CoreMessage[],
    options: TextGenerationOptions = {}
  ): Promise<string> {
    this.validateConfiguration()

    const context: AIRequestContext = {
      operation: 'generateChatCompletion',
      model: options.model || AI_MODELS.text.primary,
      timestamp: new Date(),
      metadata: {
        messageCount: messages.length,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      }
    }

    try {
      const model = this.getLanguageModel(options.model || AI_MODELS.text.primary)

      const result = await generateText({
        model,
        messages,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        providerOptions: options.providerOptions ? {
          gateway: options.providerOptions
        } : undefined,
      })

      return result.text
    } catch (error) {
      console.error(`AI chat completion failed for ${context.model}:`, error)

      if (options.model !== AI_MODELS.text.fallback) {
        console.log(`Attempting fallback to ${AI_MODELS.text.fallback}`)
        return this.generateChatCompletion(messages, {
          ...options,
          model: AI_MODELS.text.fallback
        })
      }

      throw new Error(`AI chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate embeddings for text
   */
  public async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    this.validateConfiguration()

    const context: AIRequestContext = {
      operation: 'generateEmbedding',
      model: options.model || AI_MODELS.embedding.primary,
      timestamp: new Date(),
      metadata: {
        textLength: text.length
      }
    }

    try {
      const model = this.getEmbeddingModel(options.model || AI_MODELS.embedding.primary)

      const result = await embed({
        model,
        value: text,
        providerOptions: options.providerOptions ? {
          gateway: options.providerOptions
        } : undefined,
      })

      return result.embedding
    } catch (error) {
      console.error(`AI embedding generation failed for ${context.model}:`, error)

      if (options.model !== AI_MODELS.embedding.fallback) {
        console.log(`Attempting embedding fallback to ${AI_MODELS.embedding.fallback}`)
        return this.generateEmbedding(text, {
          ...options,
          model: AI_MODELS.embedding.fallback
        })
      }

      throw new Error(`AI embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  public async generateEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    this.validateConfiguration()

    const context: AIRequestContext = {
      operation: 'generateEmbeddings',
      model: options.model || AI_MODELS.embedding.primary,
      timestamp: new Date(),
      metadata: {
        textCount: texts.length,
        totalLength: texts.reduce((sum, text) => sum + text.length, 0)
      }
    }

    try {
      const model = this.getEmbeddingModel(options.model || AI_MODELS.embedding.primary)

      const result = await embedMany({
        model,
        values: texts,
        providerOptions: options.providerOptions ? {
          gateway: options.providerOptions
        } : undefined,
      })

      return result.embeddings
    } catch (error) {
      console.error(`AI embeddings generation failed for ${context.model}:`, error)

      if (options.model !== AI_MODELS.embedding.fallback) {
        console.log(`Attempting embeddings fallback to ${AI_MODELS.embedding.fallback}`)
        return this.generateEmbeddings(texts, {
          ...options,
          model: AI_MODELS.embedding.fallback
        })
      }

      throw new Error(`AI embeddings generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Health check for AI Gateway connectivity
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    models: Record<string, boolean>
    timestamp: Date
    latency?: number
  }> {
    const startTime = Date.now()
    const results: Record<string, boolean> = {}

    try {
      this.validateConfiguration()

      // Test primary text model
      try {
        await this.generateText('Test', {
          maxTokens: 10,
          model: AI_MODELS.text.primary
        })
        results[AI_MODELS.text.primary] = true
      } catch {
        results[AI_MODELS.text.primary] = false
      }

      // Test fallback text model
      try {
        await this.generateText('Test', {
          maxTokens: 10,
          model: AI_MODELS.text.fallback
        })
        results[AI_MODELS.text.fallback] = true
      } catch {
        results[AI_MODELS.text.fallback] = false
      }

      // Test primary embedding model
      try {
        await this.generateEmbedding('Test')
        results[AI_MODELS.embedding.primary] = true
      } catch {
        results[AI_MODELS.embedding.primary] = false
      }

      const healthyModels = Object.values(results).filter(Boolean).length
      const totalModels = Object.values(results).length

      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (healthyModels === totalModels) {
        status = 'healthy'
      } else if (healthyModels > 0) {
        status = 'degraded'
      } else {
        status = 'unhealthy'
      }

      return {
        status,
        models: results,
        timestamp: new Date(),
        latency: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        models: results,
        timestamp: new Date(),
        latency: Date.now() - startTime
      }
    }
  }

  /**
   * Get language model instance
   */
  private getLanguageModel(modelName: string): LanguageModel {
    return this.gateway(modelName)
  }

  /**
   * Get embedding model instance
   */
  private getEmbeddingModel(modelName: string): EmbeddingModel {
    return this.gateway(modelName)
  }

  /**
   * Get available models from the gateway
   */
  public async getAvailableModels(): Promise<{
    textModels: string[]
    embeddingModels: string[]
    allModels: string[]
  }> {
    // Note: In real implementation, this would query the gateway for available models
    // For now, return our configured models
    return {
      textModels: Object.values(AI_MODELS.text),
      embeddingModels: Object.values(AI_MODELS.embedding),
      allModels: [
        ...Object.values(AI_MODELS.text),
        ...Object.values(AI_MODELS.embedding),
        ...Object.values(AI_MODELS.analysis)
      ]
    }
  }
}

// Export singleton instance
export const aiClient = AIGatewayClient.getInstance()

// Export utility functions that match existing patterns
export { generateDailyInsights, generateObjectiveRecommendations, generateTeamInsights } from './insights'
export { generateOKRSuggestions, generateSmartSuggestions } from './suggestions'