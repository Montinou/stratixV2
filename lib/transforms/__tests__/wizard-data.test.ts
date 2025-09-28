import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { WizardDataTransformer, createWizardDataTransformer, generateQuickOnboardingInsights } from '../wizard-data'
import type { OnboardingSession, OnboardingProgress, OnboardingFormData } from '@/lib/database/onboarding-types'

// Mock the AI modules
jest.mock('@/lib/ai/insights-generator')
jest.mock('@/lib/ai/analytics-engine')

describe('WizardDataTransformer', () => {
  let transformer: WizardDataTransformer
  let mockSession: OnboardingSession
  let mockProgress: OnboardingProgress[]
  let mockFormData: OnboardingFormData

  beforeEach(() => {
    transformer = new WizardDataTransformer()

    mockSession = {
      id: 'session-123',
      user_id: 'user-456',
      total_steps: 5,
      current_step: 5,
      status: 'completed',
      completion_percentage: 100,
      form_data: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      expires_at: '2024-01-02T00:00:00Z',
      completion_time: '2024-01-01T01:00:00Z'
    }

    mockProgress = [
      {
        id: 'progress-1',
        session_id: 'session-123',
        step_number: 1,
        step_name: 'welcome',
        step_data: { full_name: 'Test User', job_title: 'Developer' },
        completed: true,
        skipped: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:15:00Z',
        completion_time: '2024-01-01T00:15:00Z',
        ai_validation: { is_valid: true, errors: [], warnings: [] }
      }
    ]

    mockFormData = {
      welcome: {
        full_name: 'Test User',
        job_title: 'Developer',
        experience_with_okr: 'intermediate',
        primary_goal: 'Improve team productivity',
        urgency_level: 'high'
      },
      company: {
        company_name: 'Test Company',
        industry_id: 'technology',
        company_size: 'startup',
        description: 'A test company',
        country: 'Spain'
      },
      organization: {
        okr_maturity: 'intermediate',
        current_challenges: ['alignment', 'communication'],
        business_goals: ['growth', 'efficiency']
      },
      preferences: {
        communication_style: 'direct',
        language: 'es',
        ai_assistance_level: 'extensive'
      }
    }
  })

  describe('constructor', () => {
    it('should create a new transformer instance', () => {
      expect(transformer).toBeInstanceOf(WizardDataTransformer)
    })
  })

  describe('transformWizardToOrgData', () => {
    it('should transform wizard form data into structured organization data', () => {
      const result = transformer.transformWizardToOrgData(mockFormData)

      expect(result).toHaveProperty('organization')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('nextSteps')

      expect(result.organization.name).toBe('Test Company')
      expect(result.organization.industry).toBe('technology')
      expect(result.organization.primary_contact.name).toBe('Test User')
      expect(result.recommendations).toBeInstanceOf(Array)
      expect(result.nextSteps).toBeInstanceOf(Array)
    })

    it('should generate appropriate recommendations based on experience level', () => {
      const noneExperienceData = {
        ...mockFormData,
        welcome: { ...mockFormData.welcome, experience_with_okr: 'none' }
      }

      const result = transformer.transformWizardToOrgData(noneExperienceData)
      const learningRec = result.recommendations.find(rec => rec.type === 'learning')

      expect(learningRec).toBeDefined()
      expect(learningRec?.title).toContain('Capacitación')
    })

    it('should generate startup-specific recommendations', () => {
      const result = transformer.transformWizardToOrgData(mockFormData)
      const strategyRec = result.recommendations.find(rec => rec.type === 'strategy')

      expect(strategyRec).toBeDefined()
      expect(strategyRec?.description).toContain('tracción')
    })

    it('should include AI-specific next steps when AI assistance is enabled', () => {
      const result = transformer.transformWizardToOrgData(mockFormData)

      expect(result.nextSteps).toContain(expect.stringContaining('IA'))
    })
  })

  describe('extractCompletionAnalytics', () => {
    it('should calculate completion rate correctly', () => {
      const result = transformer.extractCompletionAnalytics(mockSession, mockProgress)

      expect(result.completionRate).toBe(20) // 1 out of 5 steps completed
      expect(result.stepAnalytics).toHaveLength(1)
      expect(result.stepAnalytics[0].completed).toBe(true)
    })

    it('should calculate time spent correctly', () => {
      const result = transformer.extractCompletionAnalytics(mockSession, mockProgress)

      // Should calculate time difference (15 minutes = 900000 ms)
      expect(result.stepAnalytics[0].timeSpent).toBe(900000)
    })

    it('should identify risk factors for low completion rate', () => {
      const incompleteSession = {
        ...mockSession,
        total_steps: 10 // Makes completion rate 10%
      }

      const result = transformer.extractCompletionAnalytics(incompleteSession, mockProgress)

      expect(result.riskFactors).toContain(expect.stringContaining('Baja tasa de finalización'))
    })

    it('should identify risk factors for rushed completion', () => {
      const rushedProgress = [{
        ...mockProgress[0],
        created_at: '2024-01-01T00:00:00Z',
        completion_time: '2024-01-01T00:00:30Z' // 30 seconds
      }]

      const result = transformer.extractCompletionAnalytics(mockSession, rushedProgress)

      expect(result.riskFactors).toContain(expect.stringContaining('demasiado rápido'))
    })
  })

  describe('transformForOKRSetup', () => {
    it('should generate suggested objectives based on form data', () => {
      const result = transformer.transformForOKRSetup(mockFormData)

      expect(result.suggestedObjectives).toBeInstanceOf(Array)
      expect(result.teamStructure).toBeDefined()
      expect(result.priorityMatrix).toBeDefined()
    })

    it('should suggest technology-specific objectives', () => {
      const result = transformer.transformForOKRSetup(mockFormData)
      const techObjective = result.suggestedObjectives.find(obj =>
        obj.title.includes('desarrollo de producto')
      )

      expect(techObjective).toBeDefined()
    })

    it('should suggest appropriate team structure for startups', () => {
      const result = transformer.transformForOKRSetup(mockFormData)

      expect(result.teamStructure.hierarchy).toBe('flat')
      expect(result.teamStructure.departments).toContain('Producto')
    })

    it('should prioritize urgent goals correctly', () => {
      const result = transformer.transformForOKRSetup(mockFormData)

      expect(result.priorityMatrix.high_priority).toContain(
        expect.stringContaining('inmediata')
      )
    })
  })

  describe('factory functions', () => {
    it('should create transformer via factory function', () => {
      const factoryTransformer = createWizardDataTransformer()
      expect(factoryTransformer).toBeInstanceOf(WizardDataTransformer)
    })

    it('should provide convenience function for quick insights', async () => {
      // Mock the generateInsights method
      const mockGenerateInsights = jest.fn().mockResolvedValue({
        summary: 'Test summary',
        insights: [],
        predictions: [],
        recommendations: [],
        metadata: {}
      })

      // Replace the method on the transformer
      const originalMethod = transformer.generateOnboardingInsights
      transformer.generateOnboardingInsights = mockGenerateInsights

      const result = await generateQuickOnboardingInsights(mockSession, mockProgress, 'user-456')

      expect(result).toBeDefined()
      expect(mockGenerateInsights).toHaveBeenCalledWith(mockSession, mockProgress, 'user-456')

      // Restore original method
      transformer.generateOnboardingInsights = originalMethod
    })
  })

  describe('private methods via public interface', () => {
    it('should handle missing form data gracefully', () => {
      const emptyFormData: OnboardingFormData = {}
      const result = transformer.transformWizardToOrgData(emptyFormData)

      expect(result.organization).toBeDefined()
      expect(result.recommendations).toBeInstanceOf(Array)
      expect(result.nextSteps).toBeInstanceOf(Array)
    })

    it('should generate consistent results for same input', () => {
      const result1 = transformer.transformWizardToOrgData(mockFormData)
      const result2 = transformer.transformWizardToOrgData(mockFormData)

      expect(result1.organization.name).toBe(result2.organization.name)
      expect(result1.recommendations.length).toBe(result2.recommendations.length)
    })
  })

  describe('error handling', () => {
    it('should handle invalid session data gracefully', () => {
      const invalidSession = { ...mockSession, total_steps: 0 }

      expect(() => {
        transformer.extractCompletionAnalytics(invalidSession, mockProgress)
      }).not.toThrow()
    })

    it('should handle empty progress array', () => {
      const result = transformer.extractCompletionAnalytics(mockSession, [])

      expect(result.completionRate).toBe(0)
      expect(result.stepAnalytics).toHaveLength(0)
      expect(result.timeSpent).toBe(0)
    })
  })
})