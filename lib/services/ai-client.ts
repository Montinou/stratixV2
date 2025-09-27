/**
 * AI Client Service
 * Frontend client for interacting with AI services and backends
 */

import type { AISuggestion } from '@/components/ai/AISuggestionCard'
import type { AITooltipContent } from '@/components/ai/AITooltip'
import type { AIContext, AIResponse } from '@/lib/hooks/use-ai'

export interface AIClientConfig {
  baseURL?: string
  apiKey?: string
  timeout?: number
  retries?: number
}

export class AIClient {
  private config: Required<AIClientConfig>
  private abortController?: AbortController

  constructor(config: AIClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '/api/ai',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    }
  }

  /**
   * Generic API call method with retry logic
   */
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AIResponse<T>> {
    this.abortController = new AbortController()

    const url = `${this.config.baseURL}/${endpoint}`
    const timeoutId = setTimeout(() => this.abortController?.abort(), this.config.timeout)

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        ...options.headers,
      },
      signal: this.abortController.signal,
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return {
          success: true,
          data,
          confidence: data?.confidence,
          reasoning: data?.reasoning
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (error instanceof Error && error.name === 'AbortError') {
          break // Don't retry on user cancellation
        }

        if (attempt < this.config.retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    clearTimeout(timeoutId)
    return {
      success: false,
      error: lastError?.message || 'Request failed after retries'
    }
  }

  /**
   * Get AI suggestions for current context
   */
  async getSuggestions(context: AIContext): Promise<AIResponse<AISuggestion[]>> {
    return this.makeRequest<AISuggestion[]>('suggestions', {
      method: 'POST',
      body: JSON.stringify({ context })
    })
  }

  /**
   * Apply an AI suggestion
   */
  async applySuggestion(suggestion: AISuggestion, context: AIContext): Promise<AIResponse> {
    return this.makeRequest('apply-suggestion', {
      method: 'POST',
      body: JSON.stringify({ suggestion, context })
    })
  }

  /**
   * Get contextual help for a specific field
   */
  async getContextualHelp(fieldName: string, context: AIContext): Promise<AIResponse<AITooltipContent>> {
    return this.makeRequest<AITooltipContent>('contextual-help', {
      method: 'POST',
      body: JSON.stringify({ fieldName, context })
    })
  }

  /**
   * Validate content using AI
   */
  async validateContent(
    content: string,
    type: 'objective' | 'key-result',
    context: AIContext
  ): Promise<AIResponse> {
    return this.makeRequest('validate', {
      method: 'POST',
      body: JSON.stringify({ content, type, context })
    })
  }

  /**
   * Analyze progress of objectives
   */
  async analyzeProgress(objectives: any[], context: AIContext): Promise<AIResponse> {
    return this.makeRequest('analyze-progress', {
      method: 'POST',
      body: JSON.stringify({ objectives, context })
    })
  }

  /**
   * Generate a template
   */
  async generateTemplate(type: string, context: AIContext): Promise<AIResponse> {
    return this.makeRequest('generate-template', {
      method: 'POST',
      body: JSON.stringify({ type, context })
    })
  }

  /**
   * Generic AI completion
   */
  async complete(prompt: string, context: AIContext): Promise<AIResponse> {
    return this.makeRequest('complete', {
      method: 'POST',
      body: JSON.stringify({ prompt, context })
    })
  }

  /**
   * Send feedback for AI learning
   */
  async provideFeedback(
    suggestionId: string,
    feedback: 'positive' | 'negative',
    context: AIContext
  ): Promise<AIResponse> {
    return this.makeRequest('feedback', {
      method: 'POST',
      body: JSON.stringify({ suggestionId, feedback, context })
    })
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, context: AIContext): Promise<AIResponse> {
    return this.makeRequest('dismiss-suggestion', {
      method: 'POST',
      body: JSON.stringify({ suggestionId, context })
    })
  }

  /**
   * Stream AI responses (for chat functionality)
   */
  async *streamCompletion(
    prompt: string,
    context: AIContext
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.config.baseURL}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({ prompt, context })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                yield parsed.content
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Cancel any ongoing requests
   */
  cancel(): void {
    this.abortController?.abort()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIClientConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Singleton instance
export const aiClient = new AIClient()

// Utility functions for specific AI operations
export const aiSuggestions = {
  getForObjectives: (context: AIContext) =>
    aiClient.getSuggestions({ ...context, section: 'objectives' }),

  getForKeyResults: (context: AIContext) =>
    aiClient.getSuggestions({ ...context, section: 'key-results' }),

  getForTemplates: (context: AIContext) =>
    aiClient.getSuggestions({ ...context, section: 'templates' })
}

export const aiValidation = {
  validateObjective: (content: string, context: AIContext) =>
    aiClient.validateContent(content, 'objective', context),

  validateKeyResult: (content: string, context: AIContext) =>
    aiClient.validateContent(content, 'key-result', context)
}

export const aiHelp = {
  getFieldHelp: (fieldName: string, context: AIContext) =>
    aiClient.getContextualHelp(fieldName, context),

  getFormHelp: (formType: string, context: AIContext) =>
    aiClient.getContextualHelp(`form-${formType}`, context)
}

export const aiAnalysis = {
  analyzeOKRProgress: (objectives: any[], context: AIContext) =>
    aiClient.analyzeProgress(objectives, context),

  generateInsights: (data: any[], context: AIContext) =>
    aiClient.complete(`Analyze this data and provide insights: ${JSON.stringify(data)}`, context)
}

export const aiTemplates = {
  generateOKRTemplate: (industry: string, context: AIContext) =>
    aiClient.generateTemplate(`okr-${industry}`, context),

  generateObjectiveTemplate: (department: string, context: AIContext) =>
    aiClient.generateTemplate(`objective-${department}`, context)
}