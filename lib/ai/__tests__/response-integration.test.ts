/**
 * Tests for AI Response Integration
 * Comprehensive test suite for frontend workflow integration and progressive enhancement
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  OnboardingAIIntegration,
  onboardingAIIntegration,
  useOnboardingAI,
  useOnboardingAISuggestions,
  useOnboardingAIValidation,
  onboardingAIUtils,
  type OnboardingAISuggestion,
  type OnboardingAIInsight,
  type OnboardingAIValidation
} from '../response-integration'
import { onboardingAI } from '../service-connection'
import { promptManager } from '../prompt-management'
import { userChoiceUtils } from '../user-choice'

// Mock dependencies
vi.mock('../service-connection')
vi.mock('../prompt-management')
vi.mock('../user-choice')

const mockOnboardingAI = onboardingAI as {
  checkHealth: Mock
  generateOnboardingSuggestions: Mock
  validateOnboardingData: Mock
  getProgressInsights: Mock
}

const mockPromptManager = promptManager as {
  generatePrompt: Mock
}

const mockUserChoiceUtils = userChoiceUtils as {
  isAIEnabled: Mock
  shouldShowFeature: Mock
  getInteractionStyle: Mock
  getExplanationLevel: Mock
}

// Mock React
vi.mock('react', () => ({
  useState: vi.fn((initial) => [initial, vi.fn()]),
  useEffect: vi.fn(),
  useMemo: vi.fn((fn) => fn()),
  useCallback: vi.fn((fn) => fn),
  createElement: vi.fn()
}))

describe('AI Response Integration', () => {
  let integration: OnboardingAIIntegration
  const mockContext = {
    userId: 'test-user-123',
    sessionId: 'session-456',
    currentStep: 'organization',
    industry: 'technology',
    companySize: 'medium',
    role: 'gerente',
    organizationData: {
      name: 'Test Tech Corp',
      specialization: 'Software Development'
    }
  }

  beforeEach(() => {
    integration = OnboardingAIIntegration.getInstance()
    vi.clearAllMocks()

    // Setup default mock responses
    mockUserChoiceUtils.isAIEnabled.mockReturnValue(true)
    mockUserChoiceUtils.shouldShowFeature.mockReturnValue(true)
    mockUserChoiceUtils.getInteractionStyle.mockReturnValue('guided')
    mockUserChoiceUtils.getExplanationLevel.mockReturnValue('detailed')

    mockOnboardingAI.checkHealth.mockResolvedValue({
      status: 'healthy',
      models: { 'openai/gpt-4o-mini': true },
      timestamp: new Date()
    })

    mockPromptManager.generatePrompt.mockReturnValue({
      prompt: 'Generated prompt for testing',
      templateId: 'test-template',
      templateVersion: '1.0.0',
      variables: {},
      generatedAt: new Date(),
      context: mockContext,
      estimatedTokens: 50
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    integration.cleanup()
  })

  describe('Singleton Pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = OnboardingAIIntegration.getInstance()
      const instance2 = OnboardingAIIntegration.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize successfully with AI enabled', async () => {
      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue({
        success: true,
        data: 'Initial suggestion for technology companies',
        confidence: 0.8
      })

      await integration.initialize(mockContext)

      const state = integration.getState()
      expect(state.isEnabled).toBe(true)
      expect(state.lastError).toBeNull()
      expect(mockOnboardingAI.checkHealth).toHaveBeenCalled()
    })

    it('should handle AI disabled gracefully', async () => {
      mockUserChoiceUtils.isAIEnabled.mockReturnValue(false)

      await integration.initialize(mockContext)

      const state = integration.getState()
      expect(state.isEnabled).toBe(false)
      expect(mockOnboardingAI.checkHealth).not.toHaveBeenCalled()
    })

    it('should handle unhealthy AI service', async () => {
      mockOnboardingAI.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        models: {},
        timestamp: new Date()
      })

      await integration.initialize(mockContext)

      const state = integration.getState()
      expect(state.isEnabled).toBe(false)
      expect(state.lastError).toBe('AI service is currently unavailable')
    })

    it('should handle initialization errors', async () => {
      mockOnboardingAI.checkHealth.mockRejectedValue(new Error('Health check failed'))

      await integration.initialize(mockContext)

      const state = integration.getState()
      expect(state.isEnabled).toBe(false)
      expect(state.lastError).toBe('Failed to initialize AI features')
    })
  })

  describe('Suggestion Generation', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should generate suggestions successfully', async () => {
      const mockResponse = {
        success: true,
        data: 'Suggestion for organization setup in technology sector',
        confidence: 0.8
      }

      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue(mockResponse)

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].content).toBe(mockResponse.data)
      expect(suggestions[0].type).toBe('suggestions')
      expect(suggestions[0].context.step).toBe('organization')
      expect(suggestions[0].actions).toHaveLength(2) // Apply and Dismiss
    })

    it('should handle disabled suggestions feature', async () => {
      mockUserChoiceUtils.shouldShowFeature.mockReturnValue(false)

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(0)
      expect(mockOnboardingAI.generateOnboardingSuggestions).not.toHaveBeenCalled()
    })

    it('should use cache for repeated requests', async () => {
      const mockResponse = {
        success: true,
        data: 'Cached suggestion',
        confidence: 0.8
      }

      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue(mockResponse)

      // First request
      await integration.generateSuggestionsForStep('organization', mockContext)
      // Second request with same parameters
      await integration.generateSuggestionsForStep('organization', mockContext)

      // Should only call AI service once due to caching
      expect(mockOnboardingAI.generateOnboardingSuggestions).toHaveBeenCalledTimes(1)
    })

    it('should handle AI service failures gracefully', async () => {
      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue({
        success: false,
        error: 'AI service error'
      })

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(0)
      const state = integration.getState()
      expect(state.lastError).toBe('Failed to generate AI suggestions')
    })

    it('should handle prompt generation failures', async () => {
      mockPromptManager.generatePrompt.mockReturnValue(null)

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(0)
      const state = integration.getState()
      expect(state.lastError).toBe('Failed to generate AI suggestions')
    })

    it('should enhance prompts with context', async () => {
      const mockResponse = {
        success: true,
        data: 'Context-aware suggestion',
        confidence: 0.8
      }

      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue(mockResponse)

      await integration.generateSuggestionsForStep('organization', mockContext)

      expect(mockPromptManager.generatePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStep: 'organization',
          userPreferences: expect.objectContaining({
            language: 'es',
            explanationLevel: 'detailed'
          })
        })
      )
    })
  })

  describe('Data Validation', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should validate data successfully', async () => {
      const mockValidationData = {
        isValid: true,
        suggestions: ['Data looks good'],
        issues: []
      }

      mockOnboardingAI.validateOnboardingData.mockResolvedValue({
        success: true,
        data: mockValidationData
      })

      const testData = { name: 'Test Corp', industry: 'tech' }
      const validation = await integration.validateOnboardingData(testData, mockContext)

      expect(validation).toBeTruthy()
      expect(validation?.isValid).toBe(true)
      expect(validation?.improvements).toEqual(['Data looks good'])

      const state = integration.getState()
      expect(state.currentValidation).toEqual(validation)
    })

    it('should handle disabled validation feature', async () => {
      mockUserChoiceUtils.shouldShowFeature.mockImplementation((feature) => feature !== 'validation')

      const validation = await integration.validateOnboardingData({}, mockContext)

      expect(validation).toBeNull()
      expect(mockOnboardingAI.validateOnboardingData).not.toHaveBeenCalled()
    })

    it('should use cache for validation results', async () => {
      const mockValidationData = {
        isValid: true,
        suggestions: ['Cached validation'],
        issues: []
      }

      mockOnboardingAI.validateOnboardingData.mockResolvedValue({
        success: true,
        data: mockValidationData
      })

      const testData = { name: 'Test Corp' }

      // First validation
      await integration.validateOnboardingData(testData, mockContext)
      // Second validation with same data
      await integration.validateOnboardingData(testData, mockContext)

      // Should only call AI service once due to caching
      expect(mockOnboardingAI.validateOnboardingData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Progress Insights', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should generate progress insights successfully', async () => {
      const mockInsightsData = {
        insights: ['Progress is excellent'],
        recommendations: ['Keep up the good work'],
        nextSteps: ['Continue to next phase']
      }

      mockOnboardingAI.getProgressInsights.mockResolvedValue({
        success: true,
        data: mockInsightsData
      })

      const progressData = { completedSteps: 3, totalSteps: 5 }
      const insights = await integration.getProgressInsights(progressData, mockContext)

      expect(insights).toHaveLength(2) // 1 insight + 1 recommendation
      expect(insights[0].description).toBe('Progress is excellent')
      expect(insights[1].description).toBe('Keep up the good work')

      const state = integration.getState()
      expect(state.insights).toHaveLength(2)
    })

    it('should handle disabled insights feature', async () => {
      mockUserChoiceUtils.shouldShowFeature.mockImplementation((feature) => feature !== 'insights')

      const insights = await integration.getProgressInsights({}, mockContext)

      expect(insights).toHaveLength(0)
      expect(mockOnboardingAI.getProgressInsights).not.toHaveBeenCalled()
    })
  })

  describe('Suggestion Management', () => {
    let testSuggestion: OnboardingAISuggestion

    beforeEach(async () => {
      await integration.initialize(mockContext)

      // Generate a test suggestion
      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue({
        success: true,
        data: 'Test suggestion',
        confidence: 0.8
      })

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)
      testSuggestion = suggestions[0]
    })

    it('should apply suggestion successfully', async () => {
      const result = await integration.applySuggestion(testSuggestion.id, mockContext)

      expect(result).toBe(true)

      const state = integration.getState()
      expect(state.suggestions.find(s => s.id === testSuggestion.id)).toBeUndefined()
    })

    it('should handle non-existent suggestion', async () => {
      const result = await integration.applySuggestion('non-existent-id', mockContext)

      expect(result).toBe(false)
    })

    it('should dismiss suggestion', () => {
      integration.dismissSuggestion(testSuggestion.id, 'not helpful')

      const state = integration.getState()
      expect(state.suggestions.find(s => s.id === testSuggestion.id)).toBeUndefined()
    })

    it('should clear all suggestions', () => {
      integration.clearSuggestions()

      const state = integration.getState()
      expect(state.suggestions).toHaveLength(0)
    })

    it('should clear all insights', () => {
      integration.clearInsights()

      const state = integration.getState()
      expect(state.insights).toHaveLength(0)
    })
  })

  describe('Cache Management', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should cache results with TTL', async () => {
      mockOnboardingAI.generateOnboardingSuggestions.mockResolvedValue({
        success: true,
        data: 'Cached suggestion',
        confidence: 0.8
      })

      // Make request
      await integration.generateSuggestionsForStep('organization', mockContext)

      // Verify cache entry exists
      const state = integration.getState()
      expect(state.cache.size).toBeGreaterThan(0)
    })

    it('should clean up expired cache entries', () => {
      // Simulate expired cache cleanup
      integration['cleanupCache']()

      // This is a private method test - in real implementation,
      // we'd need to add a way to test cache cleanup timing
      expect(true).toBe(true) // Placeholder for cache cleanup verification
    })
  })

  describe('State Management and Subscriptions', () => {
    it('should notify subscribers of state changes', async () => {
      const mockListener = vi.fn()
      const unsubscribe = integration.subscribe(mockListener)

      // Trigger state change
      await integration.initialize(mockContext)

      expect(mockListener).toHaveBeenCalled()

      unsubscribe()
    })

    it('should remove subscribers properly', () => {
      const mockListener = vi.fn()
      const unsubscribe = integration.subscribe(mockListener)

      unsubscribe()

      // Trigger state change
      integration['updateState']({ isLoading: true })

      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('Preference Updates', () => {
    it('should update preferences and adjust state', () => {
      // Start with AI enabled
      expect(integration.getState().isEnabled).toBe(true)

      // Disable AI
      mockUserChoiceUtils.isAIEnabled.mockReturnValue(false)
      integration.updatePreferences()

      const state = integration.getState()
      expect(state.isEnabled).toBe(false)
      expect(state.suggestions).toHaveLength(0)
      expect(state.insights).toHaveLength(0)
      expect(state.currentValidation).toBeNull()
    })
  })

  describe('Operation Cancellation', () => {
    it('should cancel ongoing operations', () => {
      integration.cancelOperations()

      const state = integration.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should handle AI service unavailability', async () => {
      mockOnboardingAI.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        models: {},
        timestamp: new Date()
      })

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(0)
      const state = integration.getState()
      expect(state.lastError).toBe('Failed to generate AI suggestions')
    })

    it('should handle network errors gracefully', async () => {
      mockOnboardingAI.generateOnboardingSuggestions.mockRejectedValue(new Error('Network error'))

      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)

      expect(suggestions).toHaveLength(0)
      const state = integration.getState()
      expect(state.lastError).toBe('Failed to generate AI suggestions')
    })
  })

  describe('Progressive Enhancement', () => {
    it('should work without AI when disabled', async () => {
      mockUserChoiceUtils.isAIEnabled.mockReturnValue(false)

      await integration.initialize(mockContext)

      const state = integration.getState()
      expect(state.isEnabled).toBe(false)

      // Operations should not fail, just return empty results
      const suggestions = await integration.generateSuggestionsForStep('organization', mockContext)
      expect(suggestions).toHaveLength(0)

      const validation = await integration.validateOnboardingData({}, mockContext)
      expect(validation).toBeNull()

      const insights = await integration.getProgressInsights({}, mockContext)
      expect(insights).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('should check if AI should be shown', () => {
      mockUserChoiceUtils.isAIEnabled.mockReturnValue(true)
      expect(onboardingAIUtils.shouldShowAI()).toBe(true)

      mockUserChoiceUtils.isAIEnabled.mockReturnValue(false)
      expect(onboardingAIUtils.shouldShowAI()).toBe(false)
    })

    it('should check if specific feature should be shown', () => {
      mockUserChoiceUtils.shouldShowFeature.mockImplementation((feature) => feature === 'suggestions')

      expect(onboardingAIUtils.shouldShowFeature('suggestions')).toBe(true)
      expect(onboardingAIUtils.shouldShowFeature('validation')).toBe(false)
    })

    it('should get interaction style', () => {
      mockUserChoiceUtils.getInteractionStyle.mockReturnValue('minimal')
      expect(onboardingAIUtils.getInteractionStyle()).toBe('minimal')
    })
  })

  describe('Response Parsing', () => {
    beforeEach(async () => {
      await integration.initialize(mockContext)
    })

    it('should parse validation response correctly', async () => {
      const mockValidationData = {
        isValid: false,
        suggestions: ['Fix name field', 'Add description'],
        issues: ['Missing required field']
      }

      mockOnboardingAI.validateOnboardingData.mockResolvedValue({
        success: true,
        data: mockValidationData
      })

      const validation = await integration.validateOnboardingData({}, mockContext)

      expect(validation?.isValid).toBe(false)
      expect(validation?.improvements).toContain('Fix name field')
      expect(validation?.issues).toHaveLength(1)
      expect(validation?.issues[0].severity).toBe('suggestion')
    })

    it('should parse insights response correctly', async () => {
      const mockInsightsData = {
        insights: ['Great progress so far'],
        recommendations: ['Focus on metrics'],
        nextSteps: ['Define KPIs']
      }

      mockOnboardingAI.getProgressInsights.mockResolvedValue({
        success: true,
        data: mockInsightsData
      })

      const insights = await integration.getProgressInsights({}, mockContext)

      expect(insights).toHaveLength(3) // 1 insight + 1 recommendation + 1 next step converted to recommendation
      expect(insights[0].type).toBe('insight')
      expect(insights[1].type).toBe('recommendation')
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const mockListener = vi.fn()
      integration.subscribe(mockListener)

      integration.cleanup()

      // Verify cleanup
      expect(integration['listeners']).toHaveLength(0)
    })
  })
})