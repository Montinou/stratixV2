/**
 * Tests for AI Prompt Management System
 * Comprehensive test suite for prompt templates, generation, and management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  PromptManager,
  promptManager,
  promptUtils,
  type PromptTemplate,
  type PromptContext
} from '../prompt-management'
import type { Industry } from '@/lib/types/ai'

describe('Prompt Management System', () => {
  let manager: PromptManager
  const mockContext: PromptContext = {
    userId: 'test-user-123',
    sessionId: 'session-456',
    currentStep: 'organization',
    industry: 'technology',
    companySize: 'medium',
    role: 'gerente',
    organizationData: {
      name: 'Test Tech Corp',
      specialization: 'Software Development',
      teamSize: 15,
      department: 'Engineering'
    },
    userPreferences: {
      language: 'es',
      explanationLevel: 'detailed',
      tone: 'professional'
    }
  }

  beforeEach(() => {
    manager = PromptManager.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = PromptManager.getInstance()
      const instance2 = PromptManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Template Management', () => {
    it('should add templates successfully', () => {
      const testTemplate: PromptTemplate = {
        id: 'test-template-1',
        name: 'Test Template',
        version: '1.0.0',
        industry: 'technology',
        step: 'objectives',
        template: 'Test template with {{variable1}} and {{variable2}}',
        variables: ['variable1', 'variable2'],
        metadata: {
          description: 'A test template',
          author: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['test', 'technology'],
        language: 'es'
      }

      manager.addTemplate(testTemplate)

      const retrieved = manager.getTemplate('test-template-1')
      expect(retrieved).toEqual(testTemplate)
    })

    it('should retrieve templates by industry', () => {
      const techTemplate: PromptTemplate = {
        id: 'tech-template',
        name: 'Technology Template',
        version: '1.0.0',
        industry: 'technology',
        template: 'Tech specific template',
        variables: [],
        metadata: {
          description: 'Tech template',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['technology'],
        language: 'es'
      }

      const financeTemplate: PromptTemplate = {
        id: 'finance-template',
        name: 'Finance Template',
        version: '1.0.0',
        industry: 'finance',
        template: 'Finance specific template',
        variables: [],
        metadata: {
          description: 'Finance template',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['finance'],
        language: 'es'
      }

      manager.addTemplate(techTemplate)
      manager.addTemplate(financeTemplate)

      const techTemplates = manager.getTemplatesByIndustry('technology')
      expect(techTemplates).toHaveLength(1)
      expect(techTemplates[0].id).toBe('tech-template')

      const financeTemplates = manager.getTemplatesByIndustry('finance')
      expect(financeTemplates).toHaveLength(1)
      expect(financeTemplates[0].id).toBe('finance-template')
    })

    it('should retrieve templates by step', () => {
      const orgTemplate: PromptTemplate = {
        id: 'org-step-template',
        name: 'Organization Step Template',
        version: '1.0.0',
        step: 'organization',
        template: 'Organization step template',
        variables: [],
        metadata: {
          description: 'Organization template',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['organization'],
        language: 'es'
      }

      manager.addTemplate(orgTemplate)

      const orgTemplates = manager.getTemplatesByStep('organization')
      expect(orgTemplates.some(t => t.id === 'org-step-template')).toBe(true)
    })
  })

  describe('Template Selection', () => {
    beforeEach(() => {
      // Add test templates with different matching criteria
      const templates: PromptTemplate[] = [
        {
          id: 'exact-match',
          name: 'Exact Match Template',
          version: '1.0.0',
          industry: 'technology',
          userRole: 'gerente',
          step: 'organization',
          template: 'Exact match template',
          variables: [],
          metadata: {
            description: 'Exact match',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 0,
            effectiveness: 0.9
          },
          tags: ['exact'],
          language: 'es'
        },
        {
          id: 'partial-match',
          name: 'Partial Match Template',
          version: '1.0.0',
          industry: 'technology',
          step: 'organization',
          template: 'Partial match template',
          variables: [],
          metadata: {
            description: 'Partial match',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 0,
            effectiveness: 0.7
          },
          tags: ['partial'],
          language: 'es'
        },
        {
          id: 'no-match',
          name: 'No Match Template',
          version: '1.0.0',
          industry: 'finance',
          template: 'No match template',
          variables: [],
          metadata: {
            description: 'No match',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 0,
            effectiveness: 0.6
          },
          tags: ['none'],
          language: 'en'
        }
      ]

      templates.forEach(template => manager.addTemplate(template))
    })

    it('should find best matching template', () => {
      const bestTemplate = manager.findBestTemplate(mockContext)

      expect(bestTemplate).toBeTruthy()
      expect(bestTemplate?.id).toBe('exact-match')
    })

    it('should return fallback template when no match found', () => {
      const noMatchContext: PromptContext = {
        ...mockContext,
        industry: 'unknown' as Industry,
        currentStep: 'unknown-step'
      }

      const template = manager.findBestTemplate(noMatchContext)

      expect(template).toBeTruthy()
      expect(template?.id).toBe('fallback-generic')
      expect(template?.name).toBe('Generic Fallback Template')
    })

    it('should consider template effectiveness in selection', () => {
      // Update effectiveness of partial match to be higher
      manager.updateTemplateEffectiveness('partial-match', 0.95)

      const template = manager.findBestTemplate(mockContext)

      // Should still prefer exact match due to higher base score
      expect(template?.id).toBe('exact-match')
    })
  })

  describe('Prompt Generation', () => {
    beforeEach(() => {
      const template: PromptTemplate = {
        id: 'variable-template',
        name: 'Variable Template',
        version: '1.0.0',
        industry: 'technology',
        step: 'organization',
        template: `Configurar organización {{organizationName}} en industria {{industry}}.
Tamaño: {{companySize}}
Especialización: {{specialization}}
Equipo: {{teamSize}} personas
Explicación: {{explanationLevel}}`,
        variables: ['organizationName', 'industry', 'companySize', 'specialization', 'teamSize', 'explanationLevel'],
        metadata: {
          description: 'Template with variables',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['variables'],
        language: 'es'
      }

      manager.addTemplate(template)
    })

    it('should generate prompt with variable substitution', () => {
      const result = manager.generatePrompt(mockContext)

      expect(result).toBeTruthy()
      expect(result?.prompt).toContain('Test Tech Corp')
      expect(result?.prompt).toContain('technology')
      expect(result?.prompt).toContain('medium')
      expect(result?.prompt).toContain('Software Development')
      expect(result?.prompt).toContain('15 personas')
      expect(result?.prompt).toContain('detailed')
    })

    it('should handle missing variables with placeholders', () => {
      const contextWithMissingData: PromptContext = {
        ...mockContext,
        organizationData: {
          name: 'Test Corp'
          // Missing other fields
        }
      }

      const result = manager.generatePrompt(contextWithMissingData)

      expect(result).toBeTruthy()
      expect(result?.prompt).toContain('Test Corp')
      expect(result?.prompt).toContain('[specialization]')
      expect(result?.prompt).toContain('[teamSize]')
    })

    it('should apply user preferences to prompt', () => {
      const casualContext: PromptContext = {
        ...mockContext,
        userPreferences: {
          language: 'es',
          explanationLevel: 'brief',
          tone: 'casual'
        }
      }

      const result = manager.generatePrompt(casualContext)

      expect(result).toBeTruthy()
      expect(result?.prompt).toContain('casual y amigable')
      expect(result?.prompt).toContain('concisas y directas')
    })

    it('should track template usage', () => {
      const initialTemplate = manager.getTemplate('variable-template')
      const initialUsage = initialTemplate?.metadata.usage || 0

      manager.generatePrompt(mockContext)

      const updatedTemplate = manager.getTemplate('variable-template')
      expect(updatedTemplate?.metadata.usage).toBe(initialUsage + 1)
      expect(updatedTemplate?.metadata.updatedAt).toBeInstanceOf(Date)
    })

    it('should estimate token count', () => {
      const result = manager.generatePrompt(mockContext)

      expect(result).toBeTruthy()
      expect(result?.estimatedTokens).toBeGreaterThan(0)
      expect(result?.estimatedTokens).toBe(Math.ceil(result!.prompt.length / 4))
    })

    it('should include generation metadata', () => {
      const result = manager.generatePrompt(mockContext)

      expect(result).toBeTruthy()
      expect(result?.templateId).toBe('variable-template')
      expect(result?.templateVersion).toBe('1.0.0')
      expect(result?.generatedAt).toBeInstanceOf(Date)
      expect(result?.context).toEqual(mockContext)
      expect(result?.variables).toBeTruthy()
    })
  })

  describe('Template Effectiveness Management', () => {
    beforeEach(() => {
      const template: PromptTemplate = {
        id: 'effectiveness-template',
        name: 'Effectiveness Template',
        version: '1.0.0',
        template: 'Test template',
        variables: [],
        metadata: {
          description: 'Test effectiveness',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.5
        },
        tags: ['test'],
        language: 'es'
      }

      manager.addTemplate(template)
    })

    it('should update template effectiveness', () => {
      const initialTemplate = manager.getTemplate('effectiveness-template')
      const initialEffectiveness = initialTemplate?.metadata.effectiveness || 0

      manager.updateTemplateEffectiveness('effectiveness-template', 0.8)

      const updatedTemplate = manager.getTemplate('effectiveness-template')
      expect(updatedTemplate?.metadata.effectiveness).toBeGreaterThan(initialEffectiveness)
      expect(updatedTemplate?.metadata.updatedAt).toBeInstanceOf(Date)
    })

    it('should use exponential moving average for effectiveness updates', () => {
      // Start with 0.5 effectiveness
      let template = manager.getTemplate('effectiveness-template')
      expect(template?.metadata.effectiveness).toBe(0.5)

      // Update with perfect score (1.0)
      manager.updateTemplateEffectiveness('effectiveness-template', 1.0)

      template = manager.getTemplate('effectiveness-template')
      const newEffectiveness = template?.metadata.effectiveness || 0

      // Should be between 0.5 and 1.0, closer to 0.5 due to low learning rate
      expect(newEffectiveness).toBeGreaterThan(0.5)
      expect(newEffectiveness).toBeLessThan(1.0)
      expect(newEffectiveness).toBeCloseTo(0.55, 2) // 0.9 * 0.5 + 0.1 * 1.0
    })

    it('should handle non-existent template gracefully', () => {
      expect(() => {
        manager.updateTemplateEffectiveness('non-existent', 0.8)
      }).not.toThrow()
    })
  })

  describe('Template Statistics', () => {
    beforeEach(() => {
      // Add templates for different industries and steps
      const templates: PromptTemplate[] = [
        {
          id: 'tech1',
          name: 'Tech 1',
          version: '1.0.0',
          industry: 'technology',
          step: 'organization',
          template: 'Tech template 1',
          variables: [],
          metadata: {
            description: 'Tech 1',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 10,
            effectiveness: 0.8
          },
          tags: ['tech'],
          language: 'es'
        },
        {
          id: 'tech2',
          name: 'Tech 2',
          version: '1.0.0',
          industry: 'technology',
          step: 'objectives',
          template: 'Tech template 2',
          variables: [],
          metadata: {
            description: 'Tech 2',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 5,
            effectiveness: 0.9
          },
          tags: ['tech'],
          language: 'es'
        },
        {
          id: 'finance1',
          name: 'Finance 1',
          version: '1.0.0',
          industry: 'finance',
          step: 'organization',
          template: 'Finance template 1',
          variables: [],
          metadata: {
            description: 'Finance 1',
            author: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            usage: 3,
            effectiveness: 0.7
          },
          tags: ['finance'],
          language: 'es'
        }
      ]

      templates.forEach(template => manager.addTemplate(template))
    })

    it('should calculate template statistics correctly', () => {
      const stats = manager.getTemplateStats()

      expect(stats.totalTemplates).toBeGreaterThanOrEqual(3)
      expect(stats.templatesPerIndustry.technology).toBe(2)
      expect(stats.templatesPerIndustry.finance).toBe(1)
      expect(stats.templatesPerStep.organization).toBe(2)
      expect(stats.templatesPerStep.objectives).toBe(1)

      expect(stats.avgEffectiveness).toBeGreaterThan(0)
      expect(stats.mostUsedTemplates).toHaveLength(5)
      expect(stats.mostUsedTemplates[0].metadata.usage).toBeGreaterThanOrEqual(
        stats.mostUsedTemplates[1]?.metadata.usage || 0
      )
    })
  })

  describe('Default Templates', () => {
    it('should initialize with default templates', () => {
      const stats = manager.getTemplateStats()
      expect(stats.totalTemplates).toBeGreaterThan(0)
    })

    it('should have templates for different industries', () => {
      const techTemplates = manager.getTemplatesByIndustry('technology')
      const financeTemplates = manager.getTemplatesByIndustry('finance')

      expect(techTemplates.length).toBeGreaterThan(0)
      expect(financeTemplates.length).toBeGreaterThan(0)
    })

    it('should have templates for different steps', () => {
      const orgTemplates = manager.getTemplatesByStep('organization')
      const objTemplates = manager.getTemplatesByStep('objectives')

      expect(orgTemplates.length).toBeGreaterThan(0)
      expect(objTemplates.length).toBeGreaterThan(0)
    })

    it('should have templates for different user roles', () => {
      // Find templates that have userRole specified
      const allTemplates = Array.from(manager.getTemplateStats().mostUsedTemplates)
      const roleTemplates = allTemplates.filter(t => t.userRole)

      expect(roleTemplates.length).toBeGreaterThan(0)
    })
  })

  describe('Utility Functions', () => {
    it('should generate step prompt', () => {
      const result = promptUtils.generateStepPrompt('organization', mockContext)

      expect(result).toBeTruthy()
      expect(result?.context.currentStep).toBe('organization')
    })

    it('should get industry templates', () => {
      const templates = promptUtils.getIndustryTemplates('technology')
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.industry === 'technology')).toBe(true)
    })

    it('should get step templates', () => {
      const templates = promptUtils.getStepTemplates('organization')
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.step === 'organization')).toBe(true)
    })

    it('should provide feedback on template effectiveness', () => {
      const template = manager.getTemplate('org-setup-tech')
      const initialEffectiveness = template?.metadata.effectiveness || 0

      promptUtils.provideFeedback('org-setup-tech', true)

      const updatedTemplate = manager.getTemplate('org-setup-tech')
      expect(updatedTemplate?.metadata.effectiveness).toBeGreaterThan(initialEffectiveness)
    })

    it('should check if templates exist for context', () => {
      const hasTemplates = promptUtils.hasTemplatesForContext(mockContext)
      expect(hasTemplates).toBe(true)

      const noMatchContext: PromptContext = {
        ...mockContext,
        industry: 'unknown' as Industry,
        currentStep: 'unknown'
      }

      // Should still return true because fallback template exists
      const hasFallback = promptUtils.hasTemplatesForContext(noMatchContext)
      expect(hasFallback).toBe(true)
    })

    it('should get template statistics', () => {
      const stats = promptUtils.getStats()

      expect(stats).toHaveProperty('totalTemplates')
      expect(stats).toHaveProperty('templatesPerIndustry')
      expect(stats).toHaveProperty('templatesPerStep')
      expect(stats).toHaveProperty('avgEffectiveness')
      expect(stats).toHaveProperty('mostUsedTemplates')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty context gracefully', () => {
      const emptyContext: PromptContext = {}

      const result = manager.generatePrompt(emptyContext)

      expect(result).toBeTruthy()
      expect(result?.templateId).toBe('fallback-generic')
    })

    it('should handle template with no variables', () => {
      const simpleTemplate: PromptTemplate = {
        id: 'simple-template',
        name: 'Simple Template',
        version: '1.0.0',
        template: 'Simple template with no variables',
        variables: [],
        metadata: {
          description: 'Simple',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['simple'],
        language: 'es'
      }

      manager.addTemplate(simpleTemplate)

      const contextForSimple: PromptContext = {
        templateOverrides: { id: 'simple-template' }
      }

      const result = manager.generatePrompt(contextForSimple)

      expect(result).toBeTruthy()
      expect(result?.prompt).toBe('Simple template with no variables')
    })

    it('should handle template override', () => {
      const template: PromptTemplate = {
        id: 'override-template',
        name: 'Override Template',
        version: '1.0.0',
        template: 'Override template for {{organizationName}}',
        variables: ['organizationName'],
        metadata: {
          description: 'Override',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['override'],
        language: 'es'
      }

      manager.addTemplate(template)

      const contextWithOverride: PromptContext = {
        ...mockContext,
        templateOverrides: { id: 'override-template' }
      }

      const result = manager.generatePrompt(contextWithOverride)

      expect(result).toBeTruthy()
      expect(result?.templateId).toBe('override-template')
      expect(result?.prompt).toContain('Test Tech Corp')
    })

    it('should handle invalid template override gracefully', () => {
      const contextWithInvalidOverride: PromptContext = {
        ...mockContext,
        templateOverrides: { id: 'non-existent-template' }
      }

      expect(() => {
        manager.generatePrompt(contextWithInvalidOverride)
      }).toThrow('No suitable template found for the given context')
    })
  })
})