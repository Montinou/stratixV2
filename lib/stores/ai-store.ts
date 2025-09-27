/**
 * AI Store - Simple state management for AI features
 * Using React context pattern for simplicity, can be upgraded to Zustand if needed
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AISuggestion } from '@/components/ai/AISuggestionCard'
import type { AIContext } from '@/lib/hooks/use-ai'

export interface AIPreferences {
  enabled: boolean
  autoSuggestions: boolean
  confidenceThreshold: number
  showTooltips: boolean
  chatPosition: 'bottom-right' | 'bottom-left'
  theme: 'light' | 'dark' | 'auto'
  language: 'es' | 'en'
}

export interface AIState {
  // Preferences
  preferences: AIPreferences
  setPreferences: (preferences: Partial<AIPreferences>) => void

  // Current context
  context: AIContext | null
  setContext: (context: AIContext | null) => void

  // Suggestions cache
  suggestions: Record<string, AISuggestion[]>
  setSuggestions: (key: string, suggestions: AISuggestion[]) => void
  clearSuggestions: (key?: string) => void

  // UI state
  chatOpen: boolean
  setChatOpen: (open: boolean) => void

  tooltipsEnabled: boolean
  setTooltipsEnabled: (enabled: boolean) => void

  // Analytics
  interactions: {
    suggestionsApplied: number
    tooltipsViewed: number
    feedbackGiven: number
  }
  incrementInteraction: (type: keyof AIState['interactions']) => void
  resetInteractions: () => void
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // Default preferences
      preferences: {
        enabled: true,
        autoSuggestions: true,
        confidenceThreshold: 0.7,
        showTooltips: true,
        chatPosition: 'bottom-right',
        theme: 'auto',
        language: 'es'
      },

      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        })),

      // Context management
      context: null,
      setContext: (context) => set({ context }),

      // Suggestions cache
      suggestions: {},
      setSuggestions: (key, suggestions) =>
        set((state) => ({
          suggestions: { ...state.suggestions, [key]: suggestions }
        })),

      clearSuggestions: (key) =>
        set((state) => {
          if (key) {
            const { [key]: _, ...rest } = state.suggestions
            return { suggestions: rest }
          }
          return { suggestions: {} }
        }),

      // UI state
      chatOpen: false,
      setChatOpen: (open) => set({ chatOpen: open }),

      tooltipsEnabled: true,
      setTooltipsEnabled: (enabled) => set({ tooltipsEnabled: enabled }),

      // Analytics
      interactions: {
        suggestionsApplied: 0,
        tooltipsViewed: 0,
        feedbackGiven: 0
      },

      incrementInteraction: (type) =>
        set((state) => ({
          interactions: {
            ...state.interactions,
            [type]: state.interactions[type] + 1
          }
        })),

      resetInteractions: () =>
        set({
          interactions: {
            suggestionsApplied: 0,
            tooltipsViewed: 0,
            feedbackGiven: 0
          }
        })
    }),
    {
      name: 'ai-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        interactions: state.interactions
      })
    }
  )
)

// Selectors for common use cases
export const selectAIEnabled = (state: AIState) => state.preferences.enabled
export const selectAutoSuggestions = (state: AIState) => state.preferences.autoSuggestions
export const selectConfidenceThreshold = (state: AIState) => state.preferences.confidenceThreshold
export const selectChatOpen = (state: AIState) => state.chatOpen
export const selectTooltipsEnabled = (state: AIState) => state.tooltipsEnabled && state.preferences.showTooltips

// Helper hooks for specific use cases
export const useAIPreferences = () => {
  const preferences = useAIStore((state) => state.preferences)
  const setPreferences = useAIStore((state) => state.setPreferences)
  return { preferences, setPreferences }
}

export const useAIContext = () => {
  const context = useAIStore((state) => state.context)
  const setContext = useAIStore((state) => state.setContext)
  return { context, setContext }
}

export const useAISuggestions = (key: string) => {
  const suggestions = useAIStore((state) => state.suggestions[key] || [])
  const setSuggestions = useAIStore((state) => state.setSuggestions)
  const clearSuggestions = useAIStore((state) => state.clearSuggestions)

  return {
    suggestions,
    setSuggestions: (newSuggestions: AISuggestion[]) => setSuggestions(key, newSuggestions),
    clearSuggestions: () => clearSuggestions(key)
  }
}

export const useAIChat = () => {
  const chatOpen = useAIStore(selectChatOpen)
  const setChatOpen = useAIStore((state) => state.setChatOpen)
  const chatPosition = useAIStore((state) => state.preferences.chatPosition)

  return {
    isOpen: chatOpen,
    open: () => setChatOpen(true),
    close: () => setChatOpen(false),
    toggle: () => setChatOpen(!chatOpen),
    position: chatPosition
  }
}

export const useAIAnalytics = () => {
  const interactions = useAIStore((state) => state.interactions)
  const incrementInteraction = useAIStore((state) => state.incrementInteraction)
  const resetInteractions = useAIStore((state) => state.resetInteractions)

  return {
    interactions,
    incrementInteraction,
    resetInteractions,
    // Computed metrics
    totalInteractions: Object.values(interactions).reduce((sum, count) => sum + count, 0)
  }
}