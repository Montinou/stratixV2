/**
 * Tests for AI Service Connection
 * Comprehensive test suite for onboarding AI service integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { onboardingAI, OnboardingAIService, onboardingAIHelpers } from '../service-connection'
import { aiClient } from '../gateway-client'
import type { OnboardingContext } from '../service-connection'

// Mock the AI Gateway client
vi.mock('../gateway-client', () => ({
  aiClient: {
    validateConfiguration: vi.fn(),
    healthCheck: vi.fn(),
    generateText: vi.fn(),
    generateEmbeddings: vi.fn()
  }
}))

const mockAIClient = aiClient as {
  validateConfiguration: Mock
  healthCheck: Mock
  generateText: Mock
  generateEmbeddings: Mock
}

describe('OnboardingAIService', () => {
  let service: OnboardingAIService
  const mockContext: OnboardingContext = {
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
    service = OnboardingAIService.getInstance()

    // Reset mocks
    vi.clearAllMocks()

    // Set up environment variable
    process.env.AI_GATEWAY_API_KEY = 'vck_test_key_123'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Initialization', () => {
    it('should initialize as singleton', () => {
      const instance1 = OnboardingAIService.getInstance()
      const instance2 = OnboardingAIService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should validate configuration successfully', async () => {
      mockAIClient.validateConfiguration.mockReturnValue(undefined)
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })

      const result = await service.initialize()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(mockAIClient.validateConfiguration).toHaveBeenCalled()
    })

    it('should handle missing API key', async () => {
      delete process.env.AI_GATEWAY_API_KEY

      const result = await service.initialize()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('AI_GATEWAY_API_KEY environment variable is required')
    })

    it('should handle unhealthy AI service', async () => {
      mockAIClient.validateConfiguration.mockReturnValue(undefined)
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        models: {},
        timestamp: new Date()
      })

      const result = await service.initialize()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('AI Gateway health check failed')
    })
  })

  describe('Health Monitoring', () => {
    it('should check AI service health', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date(),
        latency: 150
      }

      mockAIClient.healthCheck.mockResolvedValue(mockHealth)

      const health = await service.checkHealth()

      expect(health).toEqual(mockHealth)
      expect(mockAIClient.healthCheck).toHaveBeenCalled()
    })

    it('should cache health check results', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      }

      mockAIClient.healthCheck.mockResolvedValue(mockHealth)

      // First call
      await service.checkHealth()
      // Second call should use cache
      await service.checkHealth()

      expect(mockAIClient.healthCheck).toHaveBeenCalledTimes(1)
    })

    it('should handle health check failures', async () => {
      mockAIClient.healthCheck.mockRejectedValue(new Error('Service unavailable'))

      const health = await service.checkHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Suggestion Generation', () => {
    beforeEach(() => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })
    })

    it('should generate onboarding suggestions successfully', async () => {
      const mockSuggestion = 'Para una empresa de tecnología, considera establecer objetivos de escalabilidad y métricas de performance.'
      mockAIClient.generateText.mockResolvedValue(mockSuggestion)

      const result = await service.generateOnboardingSuggestions(
        'Ayuda con configuración organizacional',
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe(mockSuggestion)
      expect(result.confidence).toBe(0.8)
      expect(mockAIClient.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Industria: technology'),
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500
        })
      )
    })

    it('should handle disabled suggestions', async () => {
      service.updateConfig({ enableOnboardingSuggestions: false })

      const result = await service.generateOnboardingSuggestions(
        'Test prompt',
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Onboarding AI suggestions are disabled')
    })

    it('should handle unhealthy AI service gracefully', async () => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        models: {},
        timestamp: new Date()
      })

      const result = await service.generateOnboardingSuggestions(
        'Test prompt',
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service is currently unavailable')
    })

    it('should provide graceful degradation on AI failure', async () => {
      mockAIClient.generateText.mockRejectedValue(new Error('AI service error'))

      const result = await service.generateOnboardingSuggestions(
        'Test prompt',
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service temporarily unavailable')
      expect(result.suggestions).toContain('El sistema continúa funcionando sin asistencia de IA')
    })

    it('should enhance prompt with context', async () => {
      const mockSuggestion = 'Context-aware suggestion'
      mockAIClient.generateText.mockResolvedValue(mockSuggestion)

      await service.generateOnboardingSuggestions('Base prompt', mockContext)

      const [enhancedPrompt] = mockAIClient.generateText.mock.calls[0]
      expect(enhancedPrompt).toContain('Industria: technology')
      expect(enhancedPrompt).toContain('Tamaño de empresa: medium')
      expect(enhancedPrompt).toContain('Rol del usuario: gerente')
      expect(enhancedPrompt).toContain('Paso actual del onboarding: organization')
    })
  })

  describe('Embedding Generation', () => {
    beforeEach(() => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/text-embedding-3-small': true },
        timestamp: new Date()
      })
    })

    it('should generate embeddings successfully', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
      mockAIClient.generateEmbeddings.mockResolvedValue(mockEmbeddings)

      const texts = ['First text', 'Second text']
      const result = await service.generateOnboardingEmbeddings(texts, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEmbeddings)
      expect(result.confidence).toBe(0.9)
      expect(mockAIClient.generateEmbeddings).toHaveBeenCalledWith(
        texts,
        expect.objectContaining({
          model: 'openai/text-embedding-3-small'
        })
      )
    })

    it('should handle embedding generation failures', async () => {
      mockAIClient.generateEmbeddings.mockRejectedValue(new Error('Embedding failed'))

      const result = await service.generateOnboardingEmbeddings(['text'], mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service temporarily unavailable')
    })
  })

  describe('Data Validation', () => {
    it('should validate onboarding data', async () => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })

      const mockValidationResponse = JSON.stringify({
        isValid: true,
        suggestions: ['Excelente configuración'],
        issues: []
      })
      mockAIClient.generateText.mockResolvedValue(mockValidationResponse)

      const testData = { name: 'Test Corp', industry: 'tech' }
      const result = await service.validateOnboardingData(testData, mockContext)

      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(true)
      expect(result.data.suggestions).toContain('Excelente configuración')
    })

    it('should handle malformed validation responses', async () => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })

      mockAIClient.generateText.mockResolvedValue('Invalid JSON response')

      const result = await service.validateOnboardingData({}, mockContext)

      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(true)
      expect(result.data.suggestions).toContain('Los datos parecen correctos')
    })
  })

  describe('Progress Insights', () => {
    it('should generate progress insights', async () => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })

      const mockInsightsResponse = JSON.stringify({
        insights: ['Progreso excelente'],
        recommendations: ['Continúa así'],
        nextSteps: ['Siguiente fase']
      })
      mockAIClient.generateText.mockResolvedValue(mockInsightsResponse)

      const progressData = { completedSteps: 3, totalSteps: 5 }
      const result = await service.getProgressInsights(progressData, mockContext)

      expect(result.success).toBe(true)
      expect(result.data.insights).toContain('Progreso excelente')
      expect(result.data.recommendations).toContain('Continúa así')
      expect(result.data.nextSteps).toContain('Siguiente fase')
    })

    it('should handle disabled progress tracking', async () => {
      service.updateConfig({ enableProgressTracking: false })

      const result = await service.getProgressInsights({}, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Progress tracking is disabled')
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const initialStatus = service.getServiceStatus()
      expect(initialStatus.featuresEnabled.suggestions).toBe(true)

      service.updateConfig({ enableOnboardingSuggestions: false })

      const updatedStatus = service.getServiceStatus()
      expect(updatedStatus.featuresEnabled.suggestions).toBe(false)
    })

    it('should provide service status', () => {
      const status = service.getServiceStatus()

      expect(status).toMatchObject({
        configured: true,
        healthy: false, // No health check performed yet
        lastHealthCheck: null,
        featuresEnabled: {
          suggestions: true,
          industryPrompts: true,
          progressTracking: true
        }
      })
    })
  })

  describe('Utility Helpers', () => {
    beforeEach(() => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: { 'openai/gpt-4o-mini': true },
        timestamp: new Date()
      })
    })

    it('should generate step suggestions', async () => {
      mockAIClient.generateText.mockResolvedValue('Step-specific suggestion')

      const result = await onboardingAIHelpers.getStepSuggestions('objectives', mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Step-specific suggestion')
      expect(mockAIClient.generateText).toHaveBeenCalledWith(
        expect.stringContaining('paso "objectives"'),
        expect.any(Object)
      )
    })

    it('should validate organization data', async () => {
      const mockValidation = JSON.stringify({
        isValid: true,
        suggestions: ['Good data'],
        issues: []
      })
      mockAIClient.generateText.mockResolvedValue(mockValidation)

      const orgData = { name: 'Test Org' }
      const result = await onboardingAIHelpers.validateOrganizationData(orgData, mockContext)

      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(true)
    })

    it('should get completion insights', async () => {
      const mockInsights = JSON.stringify({
        insights: ['Completion insight'],
        recommendations: ['Next step'],
        nextSteps: ['Future action']
      })
      mockAIClient.generateText.mockResolvedValue(mockInsights)

      const completionData = { completed: true }
      const result = await onboardingAIHelpers.getCompletionInsights(completionData, mockContext)

      expect(result.success).toBe(true)
      expect(result.data.insights).toContain('Completion insight')
    })

    it('should check AI availability', async () => {
      mockAIClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: {},
        timestamp: new Date()
      })

      const isAvailable = await onboardingAIHelpers.isAIAvailable()
      expect(isAvailable).toBe(true)

      mockAIClient.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        models: {},
        timestamp: new Date()
      })

      const isUnavailable = await onboardingAIHelpers.isAIAvailable()
      expect(isUnavailable).toBe(false)
    })

    it('should get feature status', () => {
      const status = onboardingAIHelpers.getFeatureStatus()

      expect(status).toHaveProperty('configured')
      expect(status).toHaveProperty('healthy')
      expect(status).toHaveProperty('featuresEnabled')
      expect(status.featuresEnabled).toHaveProperty('suggestions')
      expect(status.featuresEnabled).toHaveProperty('industryPrompts')
      expect(status.featuresEnabled).toHaveProperty('progressTracking')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      mockAIClient.generateText.mockRejectedValue(new Error('Network timeout'))

      const result = await service.generateOnboardingSuggestions('test', mockContext)

      expect(result.success).toBe(false)
      expect(result.suggestions).toContain('El sistema continúa funcionando sin asistencia de IA')
    })

    it('should handle rate limiting gracefully', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      mockAIClient.generateText.mockRejectedValue(rateLimitError)

      const result = await service.generateOnboardingSuggestions('test', mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service temporarily unavailable')
    })

    it('should handle invalid model responses', async () => {
      mockAIClient.generateText.mockResolvedValue('')

      const result = await service.generateOnboardingSuggestions('test', mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toBe('')
    })
  })
})