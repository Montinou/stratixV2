'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { AISuggestion } from '@/components/ai/AISuggestionCard'
import type { AITooltipContent } from '@/components/ai/AITooltip'

export interface AIContext {
  page?: string
  section?: string
  formData?: Record<string, any>
  userRole?: string
  department?: string
  companySize?: 'startup' | 'pyme' | 'empresa' | 'corporacion'
  objectives?: any[]
  keyResults?: any[]
}

export interface AIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  confidence?: number
  reasoning?: string
}

export interface UseAIOptions {
  context?: AIContext
  autoRefresh?: boolean
  refreshInterval?: number
  onError?: (error: Error) => void
}

export interface UseAIResult {
  // Suggestions
  suggestions: AISuggestion[]
  loadingSuggestions: boolean
  errorSuggestions: string | null
  getSuggestions: (context?: AIContext) => Promise<void>
  applySuggestion: (suggestion: AISuggestion) => Promise<void>
  dismissSuggestion: (suggestionId: string) => void
  provideFeedback: (suggestionId: string, feedback: 'positive' | 'negative') => void

  // Contextual Help
  getContextualHelp: (fieldName: string, context?: AIContext) => Promise<AITooltipContent>
  loadingHelp: boolean

  // Validation
  validateContent: (content: string, type: 'objective' | 'key-result', context?: AIContext) => Promise<AIResponse>
  loadingValidation: boolean

  // Analysis
  analyzeProgress: (objectives: any[], context?: AIContext) => Promise<AIResponse>
  loadingAnalysis: boolean

  // Templates
  generateTemplate: (type: string, context?: AIContext) => Promise<AIResponse>
  loadingTemplate: boolean

  // Generic AI completion
  complete: (prompt: string, context?: AIContext) => Promise<AIResponse>
  loadingCompletion: boolean

  // State management
  clearSuggestions: () => void
  refreshAll: () => Promise<void>
}

// Mock data for development - in production this would call real AI endpoints
const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: '1',
    type: 'objective',
    title: 'Mejorar satisfacción del cliente',
    description: 'Objetivo enfocado en la experiencia del cliente',
    content: 'Aumentar la satisfacción del cliente mediante la mejora de nuestros procesos de atención y reducción de tiempos de respuesta.',
    confidence: 0.92,
    category: 'Customer Success',
    priority: 'high',
    reasoning: 'Basado en el análisis de feedback de clientes y métricas actuales de NPS.',
    examples: [
      'Implementar chatbot para consultas frecuentes',
      'Crear programa de training para equipo de soporte',
      'Establecer SLAs claros para tiempos de respuesta'
    ],
    metadata: {
      estimatedImpact: 8,
      difficulty: 'medium',
      timeframe: '3-6 meses',
      relatedOKRs: ['customer-satisfaction', 'support-efficiency']
    }
  },
  {
    id: '2',
    type: 'key-result',
    title: 'Reducir tiempo de respuesta promedio',
    description: 'Key Result medible para objetivos de eficiencia',
    content: 'Reducir el tiempo de respuesta promedio de soporte de 4 horas a 2 horas.',
    confidence: 0.87,
    category: 'Operations',
    priority: 'medium',
    reasoning: 'Métrica específica y alcanzable basada en capacidad actual del equipo.',
    examples: [
      'Implementar sistema de tickets automatizado',
      'Crear base de conocimiento self-service',
      'Optimizar procesos de escalación'
    ],
    metadata: {
      estimatedImpact: 7,
      difficulty: 'easy',
      timeframe: '1-2 meses'
    }
  }
]

const MOCK_CONTEXTUAL_HELP: Record<string, AITooltipContent> = {
  'objectives-title': {
    type: 'rich',
    title: 'Título del Objetivo',
    content: 'Un buen título de objetivo debe ser claro, específico y inspirador. Evita jerga técnica y sé conciso.',
    confidence: 0.92,
    category: 'suggestion',
    examples: [
      'Aumentar satisfacción del cliente',
      'Mejorar eficiencia operacional',
      'Expandir presencia en el mercado'
    ],
    actions: [
      {
        label: 'Sugerir títulos',
        action: () => console.log('Generate suggestions'),
        variant: 'default'
      }
    ]
  },
  'key-results': {
    type: 'rich',
    title: 'Key Results',
    content: 'Los Key Results deben ser específicos, medibles, alcanzables, relevantes y con límite de tiempo (SMART).',
    confidence: 0.87,
    category: 'help',
    examples: [
      'Aumentar NPS de 7 a 8.5 en Q4',
      'Reducir tiempo de respuesta a 2h',
      'Conseguir 100 nuevos clientes'
    ],
    learnMore: {
      url: 'https://example.com/okr-guide',
      label: 'Aprende más sobre OKRs'
    }
  }
}

export function useAI(options: UseAIOptions = {}): UseAIResult {
  const { context, autoRefresh = false, refreshInterval = 30000, onError } = options

  // State
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null)

  const [loadingHelp, setLoadingHelp] = useState(false)
  const [loadingValidation, setLoadingValidation] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [loadingCompletion, setLoadingCompletion] = useState(false)

  // Refs
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // API client function
  const callAI = useCallback(async <T = any>(
    endpoint: string,
    options: {
      method?: string
      body?: any
      signal?: AbortSignal
    } = {}
  ): Promise<AIResponse<T>> => {
    try {
      const response = await fetch(`/api/ai/${endpoint}`, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }

      console.error(`AI API error for ${endpoint}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI error'
      onError?.(new Error(errorMessage))

      return {
        success: false,
        error: errorMessage
      }
    }
  }, [onError])

  // Get AI suggestions
  const getSuggestions = useCallback(async (contextOverride?: AIContext) => {
    setLoadingSuggestions(true)
    setErrorSuggestions(null)

    try {
      // Cancel previous request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      const finalContext = { ...context, ...contextOverride }

      // In development, use mock data
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSuggestions(MOCK_SUGGESTIONS)
        return
      }

      const response = await callAI<AISuggestion[]>('suggestions', {
        body: { context: finalContext },
        signal: abortControllerRef.current.signal
      })

      if (response.success && response.data) {
        setSuggestions(response.data)
      } else {
        setErrorSuggestions(response.error || 'Error getting suggestions')
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        const errorMessage = error.message || 'Error getting suggestions'
        setErrorSuggestions(errorMessage)
      }
    } finally {
      setLoadingSuggestions(false)
    }
  }, [context, callAI])

  // Apply suggestion
  const applySuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      const response = await callAI('apply-suggestion', {
        body: {
          suggestion,
          context
        }
      })

      if (response.success) {
        // Remove applied suggestion from list
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
        toast.success('Sugerencia aplicada exitosamente')
      } else {
        throw new Error(response.error || 'Error applying suggestion')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error applying suggestion'
      toast.error(errorMessage)
      throw error
    }
  }, [context, callAI])

  // Dismiss suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))

    // Optionally send dismissal to backend for learning
    callAI('dismiss-suggestion', {
      body: { suggestionId, context }
    }).catch(console.error)
  }, [context, callAI])

  // Provide feedback
  const provideFeedback = useCallback((suggestionId: string, feedback: 'positive' | 'negative') => {
    // Send feedback to backend for learning
    callAI('feedback', {
      body: { suggestionId, feedback, context }
    }).catch(console.error)
  }, [context, callAI])

  // Get contextual help
  const getContextualHelp = useCallback(async (
    fieldName: string,
    contextOverride?: AIContext
  ): Promise<AITooltipContent> => {
    setLoadingHelp(true)

    try {
      const finalContext = { ...context, ...contextOverride }

      // In development, use mock data
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 500))
        return MOCK_CONTEXTUAL_HELP[fieldName] || {
          type: 'simple',
          content: 'Ayuda contextual no disponible para este campo.',
          category: 'info',
          confidence: 0.5
        }
      }

      const response = await callAI<AITooltipContent>('contextual-help', {
        body: { fieldName, context: finalContext }
      })

      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.error || 'Error getting contextual help')
      }
    } catch (error) {
      console.error('Error getting contextual help:', error)
      return {
        type: 'simple',
        content: 'Error obteniendo ayuda contextual.',
        category: 'warning',
        confidence: 0
      }
    } finally {
      setLoadingHelp(false)
    }
  }, [context, callAI])

  // Validate content
  const validateContent = useCallback(async (
    content: string,
    type: 'objective' | 'key-result',
    contextOverride?: AIContext
  ): Promise<AIResponse> => {
    setLoadingValidation(true)

    try {
      const finalContext = { ...context, ...contextOverride }

      const response = await callAI('validate', {
        body: { content, type, context: finalContext }
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation error'
      }
    } finally {
      setLoadingValidation(false)
    }
  }, [context, callAI])

  // Analyze progress
  const analyzeProgress = useCallback(async (
    objectives: any[],
    contextOverride?: AIContext
  ): Promise<AIResponse> => {
    setLoadingAnalysis(true)

    try {
      const finalContext = { ...context, ...contextOverride }

      const response = await callAI('analyze-progress', {
        body: { objectives, context: finalContext }
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis error'
      }
    } finally {
      setLoadingAnalysis(false)
    }
  }, [context, callAI])

  // Generate template
  const generateTemplate = useCallback(async (
    type: string,
    contextOverride?: AIContext
  ): Promise<AIResponse> => {
    setLoadingTemplate(true)

    try {
      const finalContext = { ...context, ...contextOverride }

      const response = await callAI('generate-template', {
        body: { type, context: finalContext }
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation error'
      }
    } finally {
      setLoadingTemplate(false)
    }
  }, [context, callAI])

  // Generic completion
  const complete = useCallback(async (
    prompt: string,
    contextOverride?: AIContext
  ): Promise<AIResponse> => {
    setLoadingCompletion(true)

    try {
      const finalContext = { ...context, ...contextOverride }

      const response = await callAI('complete', {
        body: { prompt, context: finalContext }
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Completion error'
      }
    } finally {
      setLoadingCompletion(false)
    }
  }, [context, callAI])

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setErrorSuggestions(null)
  }, [])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      getSuggestions()
    ])
  }, [getSuggestions])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const refresh = () => {
        refreshAll().catch(console.error)
        refreshTimeoutRef.current = setTimeout(refresh, refreshInterval)
      }

      refreshTimeoutRef.current = setTimeout(refresh, refreshInterval)

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refreshAll])

  // Cleanup effect
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Suggestions
    suggestions,
    loadingSuggestions,
    errorSuggestions,
    getSuggestions,
    applySuggestion,
    dismissSuggestion,
    provideFeedback,

    // Contextual Help
    getContextualHelp,
    loadingHelp,

    // Validation
    validateContent,
    loadingValidation,

    // Analysis
    analyzeProgress,
    loadingAnalysis,

    // Templates
    generateTemplate,
    loadingTemplate,

    // Generic completion
    complete,
    loadingCompletion,

    // State management
    clearSuggestions,
    refreshAll
  }
}

// Hook for managing AI state across the application
export function useAIStore() {
  // This could be implemented with Zustand or other state management
  // For now, keeping it simple with React state
  return {
    // Global AI preferences
    aiEnabled: true,
    autoSuggestions: true,
    confidenceThreshold: 0.7,
    // Methods to update preferences would go here
  }
}