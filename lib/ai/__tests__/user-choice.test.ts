/**
 * Tests for AI User Choice Framework
 * Comprehensive test suite for user preference and choice management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useUserChoiceStore,
  useAIFeatureChoice,
  useAIFeedback,
  useAIAdaptation,
  useOnboardingAISettings,
  userChoiceUtils,
  type AIFeatureType,
  type FeedbackType
} from '../user-choice'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('User Choice Framework', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)

    // Reset store to initial state
    useUserChoiceStore.getState().resetPreferences()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Core Store Functionality', () => {
    it('should initialize with default preferences', () => {
      const { preferences } = useUserChoiceStore.getState()

      expect(preferences.aiEnabled).toBe(true)
      expect(preferences.adaptiveLearning).toBe(true)
      expect(preferences.confidenceThreshold).toBe(0.6)
      expect(preferences.interactionStyle).toBe('guided')
      expect(preferences.explanationLevel).toBe('detailed')
      expect(preferences.language).toBe('es')
      expect(preferences.feedbackHistory).toHaveLength(0)
    })

    it('should update preferences correctly', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.setPreferences({
          aiEnabled: false,
          interactionStyle: 'minimal',
          confidenceThreshold: 0.8
        })
      })

      const { preferences } = useUserChoiceStore.getState()
      expect(preferences.aiEnabled).toBe(false)
      expect(preferences.interactionStyle).toBe('minimal')
      expect(preferences.confidenceThreshold).toBe(0.8)
      // Other preferences should remain unchanged
      expect(preferences.adaptiveLearning).toBe(true)
      expect(preferences.language).toBe('es')
    })

    it('should reset preferences to default', () => {
      const store = useUserChoiceStore.getState()

      // Modify preferences first
      act(() => {
        store.setPreferences({
          aiEnabled: false,
          interactionStyle: 'minimal'
        })
      })

      // Reset
      act(() => {
        store.resetPreferences()
      })

      const { preferences } = useUserChoiceStore.getState()
      expect(preferences.aiEnabled).toBe(true)
      expect(preferences.interactionStyle).toBe('guided')
    })
  })

  describe('Feature Choice Management', () => {
    it('should get and set feature choices', () => {
      const store = useUserChoiceStore.getState()
      const featureType: AIFeatureType = 'suggestions'

      // Get default choice
      const defaultChoice = store.getFeatureChoice(featureType)
      expect(defaultChoice.featureType).toBe('suggestions')
      expect(defaultChoice.enabled).toBe(true)
      expect(defaultChoice.confidence).toBe(0.7)

      // Update choice
      act(() => {
        store.setFeatureChoice(featureType, {
          enabled: false,
          confidence: 0.3
        })
      })

      const updatedChoice = store.getFeatureChoice(featureType)
      expect(updatedChoice.enabled).toBe(false)
      expect(updatedChoice.confidence).toBe(0.3)
      expect(updatedChoice.lastUpdated).toBeInstanceOf(Date)
    })

    it('should determine if feature is enabled based on preferences', () => {
      const store = useUserChoiceStore.getState()

      // Feature enabled with sufficient confidence
      expect(store.isFeatureEnabled('suggestions')).toBe(true)

      // Disable AI globally
      act(() => {
        store.setPreferences({ aiEnabled: false })
      })
      expect(store.isFeatureEnabled('suggestions')).toBe(false)

      // Re-enable AI but set confidence below threshold
      act(() => {
        store.setPreferences({ aiEnabled: true, confidenceThreshold: 0.8 })
        store.setFeatureChoice('suggestions', { confidence: 0.5 })
      })
      expect(store.isFeatureEnabled('suggestions')).toBe(false)

      // Disable feature specifically
      act(() => {
        store.setFeatureChoice('suggestions', { enabled: false, confidence: 0.9 })
      })
      expect(store.isFeatureEnabled('suggestions')).toBe(false)
    })

    it('should handle non-existent feature choices', () => {
      const store = useUserChoiceStore.getState()
      const choice = store.getFeatureChoice('unknown_feature' as AIFeatureType)

      expect(choice.featureType).toBe('unknown_feature')
      expect(choice.enabled).toBe(true)
      expect(choice.confidence).toBe(0.7)
    })
  })

  describe('Feedback Management', () => {
    it('should add feedback correctly', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'helpful',
          comment: 'Great suggestion!',
          context: { step: 'organization', industry: 'technology' }
        })
      })

      const { preferences } = useUserChoiceStore.getState()
      expect(preferences.feedbackHistory).toHaveLength(1)

      const feedback = preferences.feedbackHistory[0]
      expect(feedback.featureType).toBe('suggestions')
      expect(feedback.feedbackType).toBe('helpful')
      expect(feedback.comment).toBe('Great suggestion!')
      expect(feedback.id).toBeTruthy()
      expect(feedback.timestamp).toBeInstanceOf(Date)
      expect(feedback.processed).toBe(false)
    })

    it('should filter feedback by feature type', () => {
      const store = useUserChoiceStore.getState()

      // Add feedback for different features
      act(() => {
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'helpful',
          context: {}
        })
        store.addFeedback({
          featureType: 'validation',
          feedbackType: 'not_helpful',
          context: {}
        })
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'excellent',
          context: {}
        })
      })

      const suggestionFeedback = store.getFeedback('suggestions')
      const validationFeedback = store.getFeedback('validation')
      const allFeedback = store.getFeedback()

      expect(suggestionFeedback).toHaveLength(2)
      expect(validationFeedback).toHaveLength(1)
      expect(allFeedback).toHaveLength(3)
    })

    it('should mark feedback as processed', () => {
      const store = useUserChoiceStore.getState()

      // Add feedback
      act(() => {
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'helpful',
          context: {}
        })
      })

      const feedbackId = store.getFeedback()[0].id

      // Mark as processed
      act(() => {
        store.markFeedbackProcessed(feedbackId)
      })

      const processedFeedback = store.getFeedback()[0]
      expect(processedFeedback.processed).toBe(true)
    })
  })

  describe('Adaptive Learning', () => {
    it('should adapt confidence based on successful interactions', () => {
      const store = useUserChoiceStore.getState()
      const initialChoice = store.getFeatureChoice('suggestions')
      const initialConfidence = initialChoice.confidence

      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: true,
          timeSpent: 5000
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      expect(updatedChoice.confidence).toBeGreaterThan(initialConfidence)
    })

    it('should reduce confidence based on unsuccessful interactions', () => {
      const store = useUserChoiceStore.getState()
      const initialChoice = store.getFeatureChoice('suggestions')
      const initialConfidence = initialChoice.confidence

      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: false,
          timeSpent: 2000
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      expect(updatedChoice.confidence).toBeLessThan(initialConfidence)
    })

    it('should consider time spent in adaptation', () => {
      const store = useUserChoiceStore.getState()
      const initialChoice = store.getFeatureChoice('suggestions')
      const initialConfidence = initialChoice.confidence

      // Long time spent (> 30 seconds) should reduce confidence slightly
      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: true,
          timeSpent: 35000 // 35 seconds
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      // Should still increase due to success, but less than if time was shorter
      expect(updatedChoice.confidence).toBeGreaterThan(initialConfidence)
      expect(updatedChoice.confidence).toBeLessThan(initialConfidence + 0.05)
    })

    it('should disable feature if confidence drops too low', () => {
      const store = useUserChoiceStore.getState()

      // Set initial low confidence
      act(() => {
        store.setFeatureChoice('suggestions', { confidence: 0.4 })
      })

      // Multiple unsuccessful interactions
      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: false,
          timeSpent: 1000
        })
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: false,
          timeSpent: 1000
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      expect(updatedChoice.enabled).toBe(false)
      expect(updatedChoice.confidence).toBeLessThan(0.3)
    })

    it('should respect adaptive learning setting', () => {
      const store = useUserChoiceStore.getState()

      // Disable adaptive learning
      act(() => {
        store.setPreferences({ adaptiveLearning: false })
      })

      const initialChoice = store.getFeatureChoice('suggestions')
      const initialConfidence = initialChoice.confidence

      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: false,
          timeSpent: 1000
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      expect(updatedChoice.confidence).toBe(initialConfidence)
    })

    it('should auto-adapt from feedback when enabled', () => {
      const store = useUserChoiceStore.getState()
      const initialChoice = store.getFeatureChoice('suggestions')
      const initialConfidence = initialChoice.confidence

      // Ensure improve from feedback is enabled
      act(() => {
        store.setPreferences({ improveFromFeedback: true })
      })

      // Add positive feedback
      act(() => {
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'helpful',
          context: {}
        })
      })

      const updatedChoice = store.getFeatureChoice('suggestions')
      expect(updatedChoice.confidence).toBeGreaterThan(initialConfidence)
    })
  })

  describe('User Insights', () => {
    it('should calculate user insights correctly', () => {
      const store = useUserChoiceStore.getState()

      // Set up some features with different confidence levels
      act(() => {
        store.setFeatureChoice('suggestions', { confidence: 0.9, enabled: true })
        store.setFeatureChoice('validation', { confidence: 0.8, enabled: true })
        store.setFeatureChoice('insights', { confidence: 0.4, enabled: false })
        store.setFeatureChoice('autocomplete', { confidence: 0.2, enabled: true })

        // Add feedback
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'helpful',
          context: {}
        })
        store.addFeedback({
          featureType: 'suggestions',
          feedbackType: 'excellent',
          context: {}
        })
        store.addFeedback({
          featureType: 'validation',
          feedbackType: 'not_helpful',
          context: {}
        })
      })

      const insights = store.getUserInsights()

      expect(insights.preferredFeatures).toContain('suggestions')
      expect(insights.preferredFeatures).toContain('validation')
      expect(insights.strugglingAreas).toContain('insights')
      expect(insights.strugglingAreas).toContain('autocomplete')

      expect(insights.overallSatisfaction).toBe(2/3) // 2 positive out of 3 total
      expect(insights.feedbackSummary.helpful).toBe(1)
      expect(insights.feedbackSummary.excellent).toBe(1)
      expect(insights.feedbackSummary.not_helpful).toBe(1)
    })
  })

  describe('User Profile Initialization', () => {
    it('should initialize for beginner user', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.initializeForUser({
          experience: 'beginner',
          role: 'empleado',
          industry: 'technology'
        })
      })

      const { preferences } = useUserChoiceStore.getState()
      expect(preferences.confidenceThreshold).toBe(0.5) // Lower threshold for beginners
      expect(preferences.interactionStyle).toBe('comprehensive')
      expect(preferences.explanationLevel).toBe('detailed')
      expect(preferences.enableStepGuidance).toBe(true)

      const guidanceChoice = store.getFeatureChoice('guidance')
      expect(guidanceChoice.confidence).toBe(0.9) // High confidence for guidance
    })

    it('should initialize for advanced user', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.initializeForUser({
          experience: 'advanced',
          role: 'corporativo',
          industry: 'finance'
        })
      })

      const { preferences } = useUserChoiceStore.getState()
      expect(preferences.confidenceThreshold).toBe(0.6)
      expect(preferences.interactionStyle).toBe('guided')
      expect(preferences.explanationLevel).toBe('brief')
      expect(preferences.enableStepGuidance).toBe(false)

      const guidanceChoice = store.getFeatureChoice('guidance')
      expect(guidanceChoice.confidence).toBe(0.5) // Lower confidence for guidance
    })

    it('should initialize for corporate user', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.initializeForUser({
          role: 'corporativo'
        })
      })

      const insightsChoice = store.getFeatureChoice('insights')
      const progressChoice = store.getFeatureChoice('progress_tracking')

      expect(insightsChoice.confidence).toBe(0.9)
      expect(progressChoice.confidence).toBe(0.9)
    })
  })

  describe('React Hooks', () => {
    it('should provide feature choice hook functionality', () => {
      const { result } = renderHook(() => useAIFeatureChoice('suggestions'))

      expect(result.current.choice.featureType).toBe('suggestions')
      expect(result.current.isEnabled).toBe(true)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.choice.enabled).toBe(false)
      expect(result.current.isEnabled).toBe(false)
    })

    it('should provide feedback hook functionality', () => {
      const { result } = renderHook(() => useAIFeedback())

      act(() => {
        result.current.addQuickFeedback('suggestions', true, { step: 'test' })
      })

      const feedback = result.current.getFeedback('suggestions')
      expect(feedback).toHaveLength(1)
      expect(feedback[0].feedbackType).toBe('helpful')
      expect(feedback[0].context.step).toBe('test')
    })

    it('should provide adaptation hook functionality', () => {
      const { result } = renderHook(() => useAIAdaptation())

      expect(result.current.isAdaptiveLearningEnabled).toBe(true)

      act(() => {
        result.current.trackSuccess('suggestions', 5000, { step: 'test' })
      })

      const insights = result.current.getUserInsights()
      expect(insights.preferredFeatures).toContain('suggestions')
    })

    it('should provide settings hook functionality', () => {
      const { result } = renderHook(() => useOnboardingAISettings())

      expect(result.current.preferences.aiEnabled).toBe(true)

      act(() => {
        result.current.toggleAI()
      })

      expect(result.current.preferences.aiEnabled).toBe(false)

      act(() => {
        result.current.setInteractionStyle('minimal')
      })

      expect(result.current.preferences.interactionStyle).toBe('minimal')

      act(() => {
        result.current.setConfidenceThreshold(0.9)
      })

      expect(result.current.preferences.confidenceThreshold).toBe(0.9)
    })
  })

  describe('Utility Functions', () => {
    it('should check if feature should be shown', () => {
      const store = useUserChoiceStore.getState()

      expect(userChoiceUtils.shouldShowFeature('suggestions')).toBe(true)

      act(() => {
        store.setPreferences({ aiEnabled: false })
      })

      expect(userChoiceUtils.shouldShowFeature('suggestions')).toBe(false)
    })

    it('should get interaction style', () => {
      expect(userChoiceUtils.getInteractionStyle()).toBe('guided')

      const store = useUserChoiceStore.getState()
      act(() => {
        store.setPreferences({ interactionStyle: 'minimal' })
      })

      expect(userChoiceUtils.getInteractionStyle()).toBe('minimal')
    })

    it('should get explanation level', () => {
      expect(userChoiceUtils.getExplanationLevel()).toBe('detailed')

      const store = useUserChoiceStore.getState()
      act(() => {
        store.setPreferences({ explanationLevel: 'brief' })
      })

      expect(userChoiceUtils.getExplanationLevel()).toBe('brief')
    })

    it('should check data collection permission', () => {
      expect(userChoiceUtils.allowsDataCollection()).toBe(true)

      const store = useUserChoiceStore.getState()
      act(() => {
        store.setPreferences({ allowDataCollection: false })
      })

      expect(userChoiceUtils.allowsDataCollection()).toBe(false)
    })

    it('should check AI enablement', () => {
      expect(userChoiceUtils.isAIEnabled()).toBe(true)

      const store = useUserChoiceStore.getState()
      act(() => {
        store.setPreferences({ aiEnabled: false })
      })

      expect(userChoiceUtils.isAIEnabled()).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle confidence values outside valid range', () => {
      const store = useUserChoiceStore.getState()

      act(() => {
        store.adaptToUserBehavior({
          featureType: 'suggestions',
          successful: false,
          timeSpent: 1000
        })
      })

      // Confidence should never go below 0
      let choice = store.getFeatureChoice('suggestions')
      for (let i = 0; i < 20; i++) {
        act(() => {
          store.adaptToUserBehavior({
            featureType: 'suggestions',
            successful: false,
            timeSpent: 1000
          })
        })
      }

      choice = store.getFeatureChoice('suggestions')
      expect(choice.confidence).toBeGreaterThanOrEqual(0)

      // Reset and test upper bound
      act(() => {
        store.setFeatureChoice('suggestions', { confidence: 0.9 })
      })

      for (let i = 0; i < 20; i++) {
        act(() => {
          store.adaptToUserBehavior({
            featureType: 'suggestions',
            successful: true,
            timeSpent: 1000
          })
        })
      }

      choice = store.getFeatureChoice('suggestions')
      expect(choice.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle empty feedback history gracefully', () => {
      const store = useUserChoiceStore.getState()
      const insights = store.getUserInsights()

      expect(insights.overallSatisfaction).toBe(0.5) // Default when no feedback
      expect(insights.feedbackSummary).toEqual({})
    })

    it('should limit feedback history size in persistence', () => {
      const store = useUserChoiceStore.getState()

      // Add more than 100 feedback items
      act(() => {
        for (let i = 0; i < 150; i++) {
          store.addFeedback({
            featureType: 'suggestions',
            feedbackType: 'helpful',
            context: { index: i }
          })
        }
      })

      const allFeedback = store.getFeedback()
      expect(allFeedback).toHaveLength(150)

      // But persistence should only keep last 100
      // This would be tested by checking the localStorage calls
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
})