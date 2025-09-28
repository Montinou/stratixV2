/**
 * AI Response Integration for Onboarding Frontend
 * Integrates AI suggestions into frontend workflow with progressive enhancement
 */

import { onboardingAI, type OnboardingContext, type OnboardingAIResponse } from './service-connection'
import { promptManager, type PromptContext } from './prompt-management'
import { useUserChoiceStore, type AIFeatureType, userChoiceUtils } from './user-choice'
import type { AIResponse } from '@/lib/hooks/use-ai'

export interface OnboardingAISuggestion {
  id: string
  type: AIFeatureType
  content: string
  confidence: number
  context: {
    step: string
    industry?: string
    role?: string
  }
  actions?: Array<{
    type: 'apply' | 'dismiss' | 'modify'
    label: string
    handler: () => Promise<void>
  }>
  metadata: {
    templateId?: string
    templateVersion?: string
    generatedAt: Date
    expiresAt?: Date
  }
}

export interface OnboardingAIInsight {
  id: string
  title: string
  description: string
  type: 'recommendation' | 'warning' | 'insight' | 'tip'
  priority: 'low' | 'medium' | 'high'
  dismissible: boolean
  actions?: Array<{
    label: string
    handler: () => Promise<void>
  }>
}

export interface OnboardingAIValidation {
  isValid: boolean
  score: number
  issues: Array<{
    field: string
    severity: 'error' | 'warning' | 'suggestion'
    message: string
    suggestion?: string
  }>
  improvements: string[]
}

export interface OnboardingAIState {
  isEnabled: boolean
  isLoading: boolean
  suggestions: OnboardingAISuggestion[]
  insights: OnboardingAIInsight[]
  currentValidation: OnboardingAIValidation | null
  cache: Map<string, { data: any; timestamp: Date; ttl: number }>
  lastError: string | null
}

export class OnboardingAIIntegration {
  private static instance: OnboardingAIIntegration
  private state: OnboardingAIState
  private listeners: Array<(state: OnboardingAIState) => void> = []
  private abortController?: AbortController
  private cacheCleanupInterval?: NodeJS.Timeout

  private constructor() {
    this.state = {
      isEnabled: userChoiceUtils.isAIEnabled(),
      isLoading: false,
      suggestions: [],
      insights: [],
      currentValidation: null,
      cache: new Map(),
      lastError: null
    }

    // Setup cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  public static getInstance(): OnboardingAIIntegration {
    if (!OnboardingAIIntegration.instance) {
      OnboardingAIIntegration.instance = new OnboardingAIIntegration()
    }
    return OnboardingAIIntegration.instance
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: (state: OnboardingAIState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get current state
   */
  public getState(): OnboardingAIState {
    return { ...this.state }
  }

  /**
   * Initialize AI integration for onboarding session
   */
  public async initialize(context: OnboardingContext): Promise<void> {
    this.updateState({ isEnabled: userChoiceUtils.isAIEnabled() })

    if (!this.state.isEnabled) {
      return
    }

    try {
      // Check AI service health
      const health = await onboardingAI.checkHealth()
      if (health.status === 'unhealthy') {
        this.updateState({
          isEnabled: false,
          lastError: 'AI service is currently unavailable'
        })
        return
      }

      // Generate initial suggestions if user has enabled them
      if (userChoiceUtils.shouldShowFeature('suggestions')) {
        await this.generateSuggestionsForStep(context.currentStep || 'start', context)
      }

      // Generate initial insights
      if (userChoiceUtils.shouldShowFeature('insights')) {
        await this.generateInitialInsights(context)
      }

    } catch (error) {
      console.error('Failed to initialize AI integration:', error)
      this.updateState({
        lastError: 'Failed to initialize AI features',
        isEnabled: false
      })
    }
  }

  /**
   * Generate AI suggestions for a specific onboarding step
   */
  public async generateSuggestionsForStep(
    step: string,
    context: OnboardingContext
  ): Promise<OnboardingAISuggestion[]> {
    if (!this.state.isEnabled || !userChoiceUtils.shouldShowFeature('suggestions')) {
      return []
    }

    const cacheKey = `suggestions_${step}_${JSON.stringify(context)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    this.updateState({ isLoading: true })

    try {
      // Create prompt context
      const promptContext: PromptContext = {
        ...context,
        currentStep: step,
        userPreferences: {
          language: userChoiceUtils.getInteractionStyle() === 'minimal' ? 'en' : 'es',
          explanationLevel: userChoiceUtils.getExplanationLevel(),
          tone: 'professional'
        }
      }

      // Generate prompt
      const generatedPrompt = promptManager.generatePrompt(promptContext)
      if (!generatedPrompt) {
        throw new Error('No suitable prompt template found')
      }

      // Get AI suggestions
      const response = await onboardingAI.generateOnboardingSuggestions(
        generatedPrompt.prompt,
        context
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate suggestions')
      }

      // Parse and format suggestions
      const suggestions = this.parseSuggestionsResponse(response.data!, step, context)

      // Cache the results
      this.setCache(cacheKey, suggestions, 10 * 60 * 1000) // 10 minutes

      // Update state
      this.updateState({
        suggestions: [...this.state.suggestions, ...suggestions],
        isLoading: false
      })

      return suggestions

    } catch (error) {
      console.error('Failed to generate suggestions:', error)
      this.updateState({
        isLoading: false,
        lastError: 'Failed to generate AI suggestions'
      })
      return []
    }
  }

  /**
   * Validate onboarding data using AI
   */
  public async validateOnboardingData(
    data: Record<string, any>,
    context: OnboardingContext
  ): Promise<OnboardingAIValidation | null> {
    if (!this.state.isEnabled || !userChoiceUtils.shouldShowFeature('validation')) {
      return null
    }

    const cacheKey = `validation_${JSON.stringify(data)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.updateState({ currentValidation: cached })
      return cached
    }

    this.updateState({ isLoading: true })

    try {
      const response = await onboardingAI.validateOnboardingData(data, context)

      if (!response.success) {
        throw new Error(response.error || 'Validation failed')
      }

      const validation = this.parseValidationResponse(response.data!)

      // Cache the result
      this.setCache(cacheKey, validation, 5 * 60 * 1000) // 5 minutes

      // Update state
      this.updateState({
        currentValidation: validation,
        isLoading: false
      })

      return validation

    } catch (error) {
      console.error('Failed to validate data:', error)
      this.updateState({
        isLoading: false,
        lastError: 'Failed to validate data'
      })
      return null
    }
  }

  /**
   * Get AI-powered progress insights
   */
  public async getProgressInsights(
    progressData: Record<string, any>,
    context: OnboardingContext
  ): Promise<OnboardingAIInsight[]> {
    if (!this.state.isEnabled || !userChoiceUtils.shouldShowFeature('insights')) {
      return []
    }

    const cacheKey = `insights_${JSON.stringify(progressData)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    this.updateState({ isLoading: true })

    try {
      const response = await onboardingAI.getProgressInsights(progressData, context)

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate insights')
      }

      const insights = this.parseInsightsResponse(response.data!, context)

      // Cache the results
      this.setCache(cacheKey, insights, 15 * 60 * 1000) // 15 minutes

      // Update state
      this.updateState({
        insights: [...this.state.insights, ...insights],
        isLoading: false
      })

      return insights

    } catch (error) {
      console.error('Failed to generate insights:', error)
      this.updateState({
        isLoading: false,
        lastError: 'Failed to generate insights'
      })
      return []
    }
  }

  /**
   * Apply an AI suggestion
   */
  public async applySuggestion(
    suggestionId: string,
    context: OnboardingContext
  ): Promise<boolean> {
    const suggestion = this.state.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) {
      return false
    }

    try {
      // Track user interaction
      const store = useUserChoiceStore.getState()
      store.adaptToUserBehavior({
        featureType: suggestion.type,
        successful: true,
        timeSpent: 0,
        context: { suggestionId, step: suggestion.context.step }
      })

      // Add positive feedback
      store.addFeedback({
        featureType: suggestion.type,
        feedbackType: 'helpful',
        context: suggestion.context
      })

      // Remove suggestion from state
      this.updateState({
        suggestions: this.state.suggestions.filter(s => s.id !== suggestionId)
      })

      return true

    } catch (error) {
      console.error('Failed to apply suggestion:', error)
      return false
    }
  }

  /**
   * Dismiss an AI suggestion
   */
  public dismissSuggestion(suggestionId: string, reason?: string): void {
    const suggestion = this.state.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return

    // Track user interaction
    const store = useUserChoiceStore.getState()
    store.adaptToUserBehavior({
      featureType: suggestion.type,
      successful: false,
      timeSpent: 0,
      context: { suggestionId, dismissReason: reason }
    })

    // Add feedback
    store.addFeedback({
      featureType: suggestion.type,
      feedbackType: reason === 'incorrect' ? 'incorrect' : 'not_helpful',
      comment: reason,
      context: suggestion.context
    })

    // Remove suggestion from state
    this.updateState({
      suggestions: this.state.suggestions.filter(s => s.id !== suggestionId)
    })
  }

  /**
   * Clear all suggestions
   */
  public clearSuggestions(): void {
    this.updateState({ suggestions: [] })
  }

  /**
   * Clear all insights
   */
  public clearInsights(): void {
    this.updateState({ insights: [] })
  }

  /**
   * Update AI preferences and reinitialize if needed
   */
  public updatePreferences(): void {
    const newEnabled = userChoiceUtils.isAIEnabled()
    if (newEnabled !== this.state.isEnabled) {
      this.updateState({
        isEnabled: newEnabled,
        suggestions: newEnabled ? this.state.suggestions : [],
        insights: newEnabled ? this.state.insights : [],
        currentValidation: newEnabled ? this.state.currentValidation : null
      })
    }
  }

  /**
   * Cancel any ongoing AI operations
   */
  public cancelOperations(): void {
    this.abortController?.abort()
    this.updateState({ isLoading: false })
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.cancelOperations()
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
    }
    this.listeners = []
  }

  // Private helper methods

  private updateState(updates: Partial<OnboardingAIState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(listener => listener(this.state))
  }

  private parseSuggestionsResponse(
    response: string,
    step: string,
    context: OnboardingContext
  ): OnboardingAISuggestion[] {
    try {
      // In a real implementation, you might parse structured JSON
      // For now, we'll create a simple suggestion from the response
      const suggestion: OnboardingAISuggestion = {
        id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'suggestions',
        content: response,
        confidence: 0.8,
        context: {
          step,
          industry: context.industry,
          role: context.role
        },
        actions: [
          {
            type: 'apply',
            label: 'Aplicar',
            handler: async () => {
              await this.applySuggestion(suggestion.id, context)
            }
          },
          {
            type: 'dismiss',
            label: 'Descartar',
            handler: async () => {
              this.dismissSuggestion(suggestion.id)
            }
          }
        ],
        metadata: {
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        }
      }

      return [suggestion]
    } catch (error) {
      console.error('Failed to parse suggestions response:', error)
      return []
    }
  }

  private parseValidationResponse(response: any): OnboardingAIValidation {
    return {
      isValid: response.isValid || true,
      score: 0.8,
      issues: (response.issues || []).map((issue: string) => ({
        field: 'general',
        severity: 'suggestion' as const,
        message: issue,
        suggestion: 'Considera revisar este aspecto'
      })),
      improvements: response.suggestions || []
    }
  }

  private parseInsightsResponse(
    response: any,
    context: OnboardingContext
  ): OnboardingAIInsight[] {
    const insights: OnboardingAIInsight[] = []

    if (response.insights) {
      response.insights.forEach((insight: string, index: number) => {
        insights.push({
          id: `insight_${Date.now()}_${index}`,
          title: 'Insight del Progreso',
          description: insight,
          type: 'insight',
          priority: 'medium',
          dismissible: true
        })
      })
    }

    if (response.recommendations) {
      response.recommendations.forEach((rec: string, index: number) => {
        insights.push({
          id: `recommendation_${Date.now()}_${index}`,
          title: 'Recomendación',
          description: rec,
          type: 'recommendation',
          priority: 'high',
          dismissible: true
        })
      })
    }

    return insights
  }

  private async generateInitialInsights(context: OnboardingContext): Promise<void> {
    // Generate some initial insights based on context
    const insights: OnboardingAIInsight[] = []

    if (context.industry === 'technology') {
      insights.push({
        id: 'tech_insight_1',
        title: 'Configuración para Tecnología',
        description: 'Las empresas de tecnología se benefician de métricas ágiles y seguimiento de sprints.',
        type: 'tip',
        priority: 'medium',
        dismissible: true
      })
    }

    if (context.role === 'corporativo') {
      insights.push({
        id: 'corporate_insight_1',
        title: 'Vista Ejecutiva',
        description: 'Considera configurar dashboards ejecutivos para seguimiento de alto nivel.',
        type: 'recommendation',
        priority: 'high',
        dismissible: true
      })
    }

    this.updateState({ insights })
  }

  private getFromCache(key: string): any {
    const cached = this.state.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.state.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.state.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.state.cache.entries()) {
      if (now - cached.timestamp.getTime() > cached.ttl) {
        this.state.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const onboardingAIIntegration = OnboardingAIIntegration.getInstance()

// React hooks for easy integration with frontend components
export const useOnboardingAI = () => {
  const [state, setState] = React.useState(onboardingAIIntegration.getState())

  React.useEffect(() => {
    const unsubscribe = onboardingAIIntegration.subscribe(setState)
    return unsubscribe
  }, [])

  return {
    ...state,
    initialize: onboardingAIIntegration.initialize.bind(onboardingAIIntegration),
    generateSuggestions: onboardingAIIntegration.generateSuggestionsForStep.bind(onboardingAIIntegration),
    validateData: onboardingAIIntegration.validateOnboardingData.bind(onboardingAIIntegration),
    getInsights: onboardingAIIntegration.getProgressInsights.bind(onboardingAIIntegration),
    applySuggestion: onboardingAIIntegration.applySuggestion.bind(onboardingAIIntegration),
    dismissSuggestion: onboardingAIIntegration.dismissSuggestion.bind(onboardingAIIntegration),
    clearSuggestions: onboardingAIIntegration.clearSuggestions.bind(onboardingAIIntegration),
    clearInsights: onboardingAIIntegration.clearInsights.bind(onboardingAIIntegration),
    updatePreferences: onboardingAIIntegration.updatePreferences.bind(onboardingAIIntegration)
  }
}

export const useOnboardingAISuggestions = (step: string, context: OnboardingContext) => {
  const { suggestions, generateSuggestions, isLoading } = useOnboardingAI()

  const stepSuggestions = React.useMemo(() => {
    return suggestions.filter(s => s.context.step === step)
  }, [suggestions, step])

  const refresh = React.useCallback(() => {
    return generateSuggestions(step, context)
  }, [generateSuggestions, step, context])

  return {
    suggestions: stepSuggestions,
    isLoading,
    refresh
  }
}

export const useOnboardingAIValidation = () => {
  const { currentValidation, validateData, isLoading } = useOnboardingAI()

  return {
    validation: currentValidation,
    validate: validateData,
    isLoading,
    hasErrors: currentValidation?.issues.some(i => i.severity === 'error') || false,
    hasWarnings: currentValidation?.issues.some(i => i.severity === 'warning') || false
  }
}

// Helper utilities for frontend integration
export const onboardingAIUtils = {
  // Check if AI features should be shown
  shouldShowAI: (): boolean => {
    return userChoiceUtils.isAIEnabled()
  },

  // Check if specific feature should be shown
  shouldShowFeature: (feature: AIFeatureType): boolean => {
    return userChoiceUtils.shouldShowFeature(feature)
  },

  // Get user's preferred interaction style
  getInteractionStyle: (): 'minimal' | 'guided' | 'comprehensive' => {
    return userChoiceUtils.getInteractionStyle()
  },

  // Progressive enhancement wrapper
  withAI: <T extends {}>(
    component: React.ComponentType<T & { aiProps?: any }>,
    aiFeature: AIFeatureType
  ) => {
    return React.forwardRef<any, T>((props, ref) => {
      const shouldShow = userChoiceUtils.shouldShowFeature(aiFeature)
      const Component = component

      if (!shouldShow) {
        return React.createElement(Component, { ...props, ref })
      }

      return React.createElement(Component, {
        ...props,
        ref,
        aiProps: { enabled: true, feature: aiFeature }
      })
    })
  }
}

// Add React import for hooks (this would normally be at the top)
import React from 'react'