/**
 * AI User Choice Framework for Onboarding
 * Manages user preferences and choices for AI-powered onboarding features
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AIFeatureType =
  | 'suggestions'
  | 'validation'
  | 'insights'
  | 'autocomplete'
  | 'guidance'
  | 'progress_tracking'

export type FeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'irrelevant' | 'excellent'

export interface AIUserChoice {
  featureType: AIFeatureType
  enabled: boolean
  confidence: number // 0-1, user's confidence in AI for this feature
  lastUpdated: Date
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
}

export interface AIFeedback {
  id: string
  featureType: AIFeatureType
  suggestionId?: string
  feedbackType: FeedbackType
  comment?: string
  context: {
    step?: string
    industry?: string
    role?: string
  }
  timestamp: Date
  processed: boolean
}

export interface OnboardingAIPreferences {
  // Global AI settings
  aiEnabled: boolean
  adaptiveLearning: boolean // Learn from user behavior
  confidenceThreshold: number // Minimum confidence to show suggestions

  // Feature-specific choices
  choices: Record<AIFeatureType, AIUserChoice>

  // User experience preferences
  interactionStyle: 'minimal' | 'guided' | 'comprehensive'
  explanationLevel: 'brief' | 'detailed' | 'technical'
  language: 'es' | 'en'

  // Feedback and learning
  feedbackHistory: AIFeedback[]
  allowDataCollection: boolean
  improveFromFeedback: boolean

  // Onboarding-specific settings
  showProgressInsights: boolean
  enableStepGuidance: boolean
  enableValidationChecks: boolean
  enableSmartSuggestions: boolean
}

export interface UserChoiceState {
  // Preferences management
  preferences: OnboardingAIPreferences
  setPreferences: (preferences: Partial<OnboardingAIPreferences>) => void

  // Feature choice management
  setFeatureChoice: (featureType: AIFeatureType, choice: Partial<AIUserChoice>) => void
  getFeatureChoice: (featureType: AIFeatureType) => AIUserChoice
  isFeatureEnabled: (featureType: AIFeatureType) => boolean

  // Feedback management
  addFeedback: (feedback: Omit<AIFeedback, 'id' | 'timestamp' | 'processed'>) => void
  getFeedback: (featureType?: AIFeatureType) => AIFeedback[]
  markFeedbackProcessed: (feedbackId: string) => void

  // User experience adaptation
  adaptToUserBehavior: (interaction: {
    featureType: AIFeatureType
    successful: boolean
    timeSpent: number
    context?: Record<string, any>
  }) => void

  // Analytics and insights
  getUserInsights: () => {
    preferredFeatures: AIFeatureType[]
    strugglingAreas: AIFeatureType[]
    overallSatisfaction: number
    feedbackSummary: Record<FeedbackType, number>
  }

  // Reset and initialization
  resetPreferences: () => void
  initializeForUser: (userProfile: {
    experience?: 'beginner' | 'intermediate' | 'advanced'
    role?: string
    industry?: string
    preferences?: Partial<OnboardingAIPreferences>
  }) => void
}

const defaultAIChoice: AIUserChoice = {
  featureType: 'suggestions',
  enabled: true,
  confidence: 0.7,
  lastUpdated: new Date(),
  experienceLevel: 'intermediate'
}

const createDefaultChoices = (): Record<AIFeatureType, AIUserChoice> => ({
  suggestions: { ...defaultAIChoice, featureType: 'suggestions' },
  validation: { ...defaultAIChoice, featureType: 'validation', confidence: 0.8 },
  insights: { ...defaultAIChoice, featureType: 'insights', confidence: 0.6 },
  autocomplete: { ...defaultAIChoice, featureType: 'autocomplete', confidence: 0.9 },
  guidance: { ...defaultAIChoice, featureType: 'guidance' },
  progress_tracking: { ...defaultAIChoice, featureType: 'progress_tracking', confidence: 0.8 }
})

export const useUserChoiceStore = create<UserChoiceState>()(
  persist(
    (set, get) => ({
      preferences: {
        aiEnabled: true,
        adaptiveLearning: true,
        confidenceThreshold: 0.6,
        choices: createDefaultChoices(),
        interactionStyle: 'guided',
        explanationLevel: 'detailed',
        language: 'es',
        feedbackHistory: [],
        allowDataCollection: true,
        improveFromFeedback: true,
        showProgressInsights: true,
        enableStepGuidance: true,
        enableValidationChecks: true,
        enableSmartSuggestions: true
      },

      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        })),

      setFeatureChoice: (featureType, choice) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            choices: {
              ...state.preferences.choices,
              [featureType]: {
                ...state.preferences.choices[featureType],
                ...choice,
                lastUpdated: new Date()
              }
            }
          }
        })),

      getFeatureChoice: (featureType) => {
        const state = get()
        return state.preferences.choices[featureType] || {
          ...defaultAIChoice,
          featureType
        }
      },

      isFeatureEnabled: (featureType) => {
        const state = get()
        const globalEnabled = state.preferences.aiEnabled
        const featureChoice = state.preferences.choices[featureType]

        if (!globalEnabled) return false
        if (!featureChoice) return false

        return featureChoice.enabled && featureChoice.confidence >= state.preferences.confidenceThreshold
      },

      addFeedback: (feedbackData) => {
        const feedback: AIFeedback = {
          ...feedbackData,
          id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          processed: false
        }

        set((state) => ({
          preferences: {
            ...state.preferences,
            feedbackHistory: [...state.preferences.feedbackHistory, feedback]
          }
        }))

        // Auto-adapt based on feedback if enabled
        const state = get()
        if (state.preferences.improveFromFeedback) {
          state.adaptToUserBehavior({
            featureType: feedback.featureType,
            successful: ['helpful', 'excellent'].includes(feedback.feedbackType),
            timeSpent: 0, // Not tracked for feedback
            context: feedback.context
          })
        }
      },

      getFeedback: (featureType) => {
        const state = get()
        if (featureType) {
          return state.preferences.feedbackHistory.filter(f => f.featureType === featureType)
        }
        return state.preferences.feedbackHistory
      },

      markFeedbackProcessed: (feedbackId) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            feedbackHistory: state.preferences.feedbackHistory.map(f =>
              f.id === feedbackId ? { ...f, processed: true } : f
            )
          }
        })),

      adaptToUserBehavior: (interaction) => {
        if (!get().preferences.adaptiveLearning) return

        const { featureType, successful, timeSpent } = interaction
        const currentChoice = get().getFeatureChoice(featureType)

        // Adjust confidence based on success and time spent
        let confidenceAdjustment = 0

        if (successful) {
          confidenceAdjustment = 0.05 // Increase confidence slightly
        } else {
          confidenceAdjustment = -0.1 // Decrease confidence more significantly
        }

        // Factor in time spent (longer time might indicate difficulty)
        if (timeSpent > 30000) { // More than 30 seconds
          confidenceAdjustment -= 0.02
        }

        const newConfidence = Math.max(0, Math.min(1, currentChoice.confidence + confidenceAdjustment))

        get().setFeatureChoice(featureType, {
          confidence: newConfidence,
          // Disable feature if confidence drops too low
          enabled: newConfidence >= 0.3
        })
      },

      getUserInsights: () => {
        const state = get()
        const { choices, feedbackHistory } = state.preferences

        // Calculate preferred features (high confidence and enabled)
        const preferredFeatures = Object.entries(choices)
          .filter(([_, choice]) => choice.enabled && choice.confidence > 0.7)
          .map(([featureType]) => featureType as AIFeatureType)

        // Calculate struggling areas (low confidence or disabled)
        const strugglingAreas = Object.entries(choices)
          .filter(([_, choice]) => !choice.enabled || choice.confidence < 0.5)
          .map(([featureType]) => featureType as AIFeatureType)

        // Calculate overall satisfaction from feedback
        const positiveFeedback = feedbackHistory.filter(f =>
          ['helpful', 'excellent'].includes(f.feedbackType)
        ).length
        const totalFeedback = feedbackHistory.length
        const overallSatisfaction = totalFeedback > 0 ? positiveFeedback / totalFeedback : 0.5

        // Summarize feedback types
        const feedbackSummary = feedbackHistory.reduce((acc, feedback) => {
          acc[feedback.feedbackType] = (acc[feedback.feedbackType] || 0) + 1
          return acc
        }, {} as Record<FeedbackType, number>)

        return {
          preferredFeatures,
          strugglingAreas,
          overallSatisfaction,
          feedbackSummary
        }
      },

      resetPreferences: () =>
        set({
          preferences: {
            aiEnabled: true,
            adaptiveLearning: true,
            confidenceThreshold: 0.6,
            choices: createDefaultChoices(),
            interactionStyle: 'guided',
            explanationLevel: 'detailed',
            language: 'es',
            feedbackHistory: [],
            allowDataCollection: true,
            improveFromFeedback: true,
            showProgressInsights: true,
            enableStepGuidance: true,
            enableValidationChecks: true,
            enableSmartSuggestions: true
          }
        }),

      initializeForUser: (userProfile) => {
        const { experience = 'intermediate', role, industry, preferences = {} } = userProfile

        // Adjust default choices based on user profile
        const profileChoices = createDefaultChoices()

        // Beginners get more guidance and validation
        if (experience === 'beginner') {
          profileChoices.guidance.confidence = 0.9
          profileChoices.validation.confidence = 0.9
          profileChoices.suggestions.confidence = 0.8
        }

        // Advanced users might prefer less guidance
        if (experience === 'advanced') {
          profileChoices.guidance.confidence = 0.5
          profileChoices.autocomplete.confidence = 0.9
          profileChoices.insights.confidence = 0.8
        }

        // Role-based adjustments
        if (role === 'corporativo') {
          profileChoices.insights.confidence = 0.9
          profileChoices.progress_tracking.confidence = 0.9
        }

        set({
          preferences: {
            aiEnabled: true,
            adaptiveLearning: true,
            confidenceThreshold: experience === 'beginner' ? 0.5 : 0.6,
            choices: profileChoices,
            interactionStyle: experience === 'beginner' ? 'comprehensive' : 'guided',
            explanationLevel: experience === 'advanced' ? 'brief' : 'detailed',
            language: 'es',
            feedbackHistory: [],
            allowDataCollection: true,
            improveFromFeedback: true,
            showProgressInsights: true,
            enableStepGuidance: experience !== 'advanced',
            enableValidationChecks: true,
            enableSmartSuggestions: true,
            ...preferences
          }
        })
      }
    }),
    {
      name: 'ai-user-choice-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        preferences: {
          ...state.preferences,
          // Limit feedback history to last 100 items to prevent storage bloat
          feedbackHistory: state.preferences.feedbackHistory.slice(-100)
        }
      })
    }
  )
)

// Utility hooks for common use cases
export const useAIFeatureChoice = (featureType: AIFeatureType) => {
  const getFeatureChoice = useUserChoiceStore((state) => state.getFeatureChoice)
  const setFeatureChoice = useUserChoiceStore((state) => state.setFeatureChoice)
  const isEnabled = useUserChoiceStore((state) => state.isFeatureEnabled)

  return {
    choice: getFeatureChoice(featureType),
    setChoice: (choice: Partial<AIUserChoice>) => setFeatureChoice(featureType, choice),
    isEnabled: isEnabled(featureType),
    toggle: () => {
      const current = getFeatureChoice(featureType)
      setFeatureChoice(featureType, { enabled: !current.enabled })
    }
  }
}

export const useAIFeedback = () => {
  const addFeedback = useUserChoiceStore((state) => state.addFeedback)
  const getFeedback = useUserChoiceStore((state) => state.getFeedback)
  const markProcessed = useUserChoiceStore((state) => state.markFeedbackProcessed)

  return {
    addFeedback,
    getFeedback,
    markProcessed,
    // Helper to quickly add positive/negative feedback
    addQuickFeedback: (featureType: AIFeatureType, isPositive: boolean, context?: any) => {
      addFeedback({
        featureType,
        feedbackType: isPositive ? 'helpful' : 'not_helpful',
        context: context || {}
      })
    }
  }
}

export const useAIAdaptation = () => {
  const adaptToUserBehavior = useUserChoiceStore((state) => state.adaptToUserBehavior)
  const getUserInsights = useUserChoiceStore((state) => state.getUserInsights)
  const preferences = useUserChoiceStore((state) => state.preferences)

  return {
    adaptToUserBehavior,
    getUserInsights,
    isAdaptiveLearningEnabled: preferences.adaptiveLearning,
    // Helper to track successful interactions
    trackSuccess: (featureType: AIFeatureType, timeSpent: number, context?: any) => {
      adaptToUserBehavior({
        featureType,
        successful: true,
        timeSpent,
        context
      })
    },
    // Helper to track failed interactions
    trackFailure: (featureType: AIFeatureType, timeSpent: number, context?: any) => {
      adaptToUserBehavior({
        featureType,
        successful: false,
        timeSpent,
        context
      })
    }
  }
}

export const useOnboardingAISettings = () => {
  const preferences = useUserChoiceStore((state) => state.preferences)
  const setPreferences = useUserChoiceStore((state) => state.setPreferences)
  const initializeForUser = useUserChoiceStore((state) => state.initializeForUser)
  const resetPreferences = useUserChoiceStore((state) => state.resetPreferences)

  return {
    preferences,
    setPreferences,
    initializeForUser,
    resetPreferences,
    // Helper to quickly toggle global AI
    toggleAI: () => setPreferences({ aiEnabled: !preferences.aiEnabled }),
    // Helper to set interaction style
    setInteractionStyle: (style: 'minimal' | 'guided' | 'comprehensive') =>
      setPreferences({ interactionStyle: style }),
    // Helper to adjust confidence threshold
    setConfidenceThreshold: (threshold: number) =>
      setPreferences({ confidenceThreshold: Math.max(0, Math.min(1, threshold)) })
  }
}

// Export utility functions for integration with other systems
export const userChoiceUtils = {
  // Check if a feature should be shown based on user choices
  shouldShowFeature: (featureType: AIFeatureType): boolean => {
    const store = useUserChoiceStore.getState()
    return store.isFeatureEnabled(featureType)
  },

  // Get user's preferred interaction style
  getInteractionStyle: (): 'minimal' | 'guided' | 'comprehensive' => {
    const store = useUserChoiceStore.getState()
    return store.preferences.interactionStyle
  },

  // Get user's preferred explanation level
  getExplanationLevel: (): 'brief' | 'detailed' | 'technical' => {
    const store = useUserChoiceStore.getState()
    return store.preferences.explanationLevel
  },

  // Check if user allows data collection
  allowsDataCollection: (): boolean => {
    const store = useUserChoiceStore.getState()
    return store.preferences.allowDataCollection
  },

  // Get overall AI enablement status
  isAIEnabled: (): boolean => {
    const store = useUserChoiceStore.getState()
    return store.preferences.aiEnabled
  }
}