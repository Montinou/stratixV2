/**
 * AI Prompt Management System for Onboarding
 * Manages industry-specific prompts, dynamic prompt generation, and prompt versioning
 */

import type { Industry, CompanySize, UserRole } from '@/lib/types/ai'
import type { OnboardingContext } from './service-connection'

export interface PromptTemplate {
  id: string
  name: string
  version: string
  industry?: Industry
  companySize?: CompanySize
  userRole?: UserRole
  step?: string
  template: string
  variables: string[]
  metadata: {
    description: string
    author: string
    createdAt: Date
    updatedAt: Date
    usage: number
    effectiveness: number // 0-1 based on user feedback
  }
  tags: string[]
  language: 'es' | 'en'
}

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  default?: any
  description: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

export interface PromptContext extends OnboardingContext {
  variables?: Record<string, any>
  userPreferences?: {
    language: 'es' | 'en'
    explanationLevel: 'brief' | 'detailed' | 'technical'
    tone: 'formal' | 'casual' | 'professional'
  }
  templateOverrides?: Partial<PromptTemplate>
}

export interface GeneratedPrompt {
  prompt: string
  templateId: string
  templateVersion: string
  variables: Record<string, any>
  generatedAt: Date
  context: PromptContext
  estimatedTokens: number
}

export class PromptManager {
  private static instance: PromptManager
  private templates: Map<string, PromptTemplate> = new Map()
  private templateVersions: Map<string, PromptTemplate[]> = new Map()
  private industryTemplates: Map<Industry, PromptTemplate[]> = new Map()
  private stepTemplates: Map<string, PromptTemplate[]> = new Map()

  private constructor() {
    this.initializeDefaultTemplates()
  }

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager()
    }
    return PromptManager.instance
  }

  /**
   * Initialize default prompt templates for onboarding
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      // Organization Setup Templates
      {
        id: 'org-setup-tech',
        name: 'Organization Setup - Technology',
        version: '1.0.0',
        industry: 'technology',
        step: 'organization',
        template: `Ayuda a configurar una organización de tecnología con los siguientes datos:

Nombre: {{organizationName}}
Tamaño: {{companySize}}
Especialización: {{specialization}}

Proporciona sugerencias específicas para:
1. Estructura organizacional recomendada
2. Objetivos iniciales relevantes para {{specialization}}
3. Métricas clave a considerar
4. Mejores prácticas para empresas {{companySize}} en tecnología

Responde en español de manera {{explanationLevel}}.`,
        variables: ['organizationName', 'companySize', 'specialization', 'explanationLevel'],
        metadata: {
          description: 'Template for technology companies organization setup',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['organization', 'technology', 'setup'],
        language: 'es'
      },

      {
        id: 'org-setup-finance',
        name: 'Organization Setup - Finance',
        version: '1.0.0',
        industry: 'finance',
        step: 'organization',
        template: `Configura una organización financiera considerando:

Datos de la empresa:
- Nombre: {{organizationName}}
- Tamaño: {{companySize}}
- Tipo de servicios: {{serviceType}}
- Mercado objetivo: {{targetMarket}}

Sugerencias personalizadas:
1. Estructura de gobierno corporativo apropiada
2. Marco de gestión de riesgos inicial
3. Objetivos de cumplimiento regulatorio
4. KPIs financieros fundamentales
5. Estructura organizacional recomendada

Considera las regulaciones del sector financiero y proporciona recomendaciones {{explanationLevel}}.`,
        variables: ['organizationName', 'companySize', 'serviceType', 'targetMarket', 'explanationLevel'],
        metadata: {
          description: 'Template for financial services organization setup',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.8
        },
        tags: ['organization', 'finance', 'compliance'],
        language: 'es'
      },

      // Objective Setting Templates
      {
        id: 'objective-quarterly-generic',
        name: 'Quarterly Objective Setting',
        version: '1.0.0',
        step: 'objectives',
        template: `Ayuda a definir objetivos trimestrales para:

Contexto organizacional:
- Industria: {{industry}}
- Departamento: {{department}}
- Rol del usuario: {{userRole}}
- Período: {{quarter}} {{year}}

Objetivo propuesto: "{{proposedObjective}}"

Análisis y sugerencias:
1. ¿Es este objetivo específico, medible, alcanzable, relevante y temporal (SMART)?
2. Alineación con la industria {{industry}}
3. Key Results sugeridos (3-5)
4. Métricas de seguimiento recomendadas
5. Riesgos potenciales y mitigaciones
6. Iniciativas de apoyo sugeridas

Proporciona retroalimentación constructiva y alternativas si es necesario.`,
        variables: ['industry', 'department', 'userRole', 'quarter', 'year', 'proposedObjective'],
        metadata: {
          description: 'Generic template for quarterly objective setting',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.9
        },
        tags: ['objectives', 'quarterly', 'smart'],
        language: 'es'
      },

      // Progress Tracking Templates
      {
        id: 'progress-insights-manager',
        name: 'Progress Insights - Manager Role',
        version: '1.0.0',
        userRole: 'gerente',
        step: 'progress',
        template: `Analiza el progreso del onboarding para un gerente:

Datos de progreso:
{{progressData}}

Contexto del gerente:
- Equipo: {{teamSize}} personas
- Departamento: {{department}}
- Experiencia previa: {{experience}}

Proporciona insights sobre:
1. Velocidad de progreso comparada con benchmarks
2. Áreas donde el gerente podría necesitar más apoyo
3. Recomendaciones para gestión de equipo durante onboarding
4. Próximos pasos prioritarios
5. Recursos adicionales recomendados

Focus en aspectos de liderazgo y gestión de equipos.`,
        variables: ['progressData', 'teamSize', 'department', 'experience'],
        metadata: {
          description: 'Progress insights tailored for managers',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.85
        },
        tags: ['progress', 'manager', 'insights'],
        language: 'es'
      },

      // Validation Templates
      {
        id: 'validation-okr-tech',
        name: 'OKR Validation - Technology',
        version: '1.0.0',
        industry: 'technology',
        template: `Valida el siguiente OKR para una empresa de tecnología:

Objetivo: {{objective}}

Key Results:
{{keyResults}}

Criterios de validación específicos para tecnología:
1. Alineación con ciclos de desarrollo ágil
2. Métricas técnicas apropiadas (performance, uptime, etc.)
3. Consideración de deuda técnica
4. Escalabilidad y crecimiento tecnológico
5. Innovación y competitividad tecnológica

Proporciona:
- Puntuación de calidad (1-10)
- Aspectos positivos
- Áreas de mejora
- Sugerencias específicas
- Alternativas si es necesario`,
        variables: ['objective', 'keyResults'],
        metadata: {
          description: 'OKR validation specific to technology companies',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.87
        },
        tags: ['validation', 'okr', 'technology'],
        language: 'es'
      },

      // Completion Templates
      {
        id: 'completion-summary-corporate',
        name: 'Completion Summary - Corporate',
        version: '1.0.0',
        userRole: 'corporativo',
        step: 'completion',
        template: `Genera un resumen de finalización del onboarding para nivel corporativo:

Datos completados:
{{completionData}}

Organización:
- Nombre: {{organizationName}}
- Industria: {{industry}}
- Tamaño: {{companySize}}

Resumen ejecutivo:
1. Estado de configuración organizacional
2. Objetivos y KRs establecidos
3. Estructura de seguimiento implementada
4. Próximos pasos estratégicos
5. Recomendaciones para los primeros 30/60/90 días
6. Recursos de apoyo y mejores prácticas

Enfócate en aspectos estratégicos y de alto nivel apropiados para liderazgo corporativo.`,
        variables: ['completionData', 'organizationName', 'industry', 'companySize'],
        metadata: {
          description: 'Executive summary for corporate level users',
          author: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          usage: 0,
          effectiveness: 0.9
        },
        tags: ['completion', 'corporate', 'executive'],
        language: 'es'
      }
    ]

    // Add templates to storage
    defaultTemplates.forEach(template => {
      this.addTemplate(template)
    })
  }

  /**
   * Add a new prompt template
   */
  public addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template)

    // Add to version tracking
    const versions = this.templateVersions.get(template.id) || []
    versions.push(template)
    this.templateVersions.set(template.id, versions)

    // Index by industry
    if (template.industry) {
      const industryTemplates = this.industryTemplates.get(template.industry) || []
      industryTemplates.push(template)
      this.industryTemplates.set(template.industry, industryTemplates)
    }

    // Index by step
    if (template.step) {
      const stepTemplates = this.stepTemplates.get(template.step) || []
      stepTemplates.push(template)
      this.stepTemplates.set(template.step, stepTemplates)
    }
  }

  /**
   * Find the best template for given context
   */
  public findBestTemplate(context: PromptContext): PromptTemplate | null {
    const candidates: PromptTemplate[] = []

    // Get templates that match the context
    this.templates.forEach(template => {
      let score = 0

      // Exact matches get higher scores
      if (template.industry === context.industry) score += 10
      if (template.companySize === context.companySize) score += 5
      if (template.userRole === context.role) score += 8
      if (template.step === context.currentStep) score += 15

      // Language match
      if (template.language === context.userPreferences?.language) score += 3

      // Effectiveness bonus
      score += template.metadata.effectiveness * 5

      if (score > 0) {
        candidates.push({ ...template, metadata: { ...template.metadata, usage: score } })
      }
    })

    if (candidates.length === 0) {
      return this.getFallbackTemplate(context)
    }

    // Sort by score (stored in usage field for this calculation)
    candidates.sort((a, b) => b.metadata.usage - a.metadata.usage)

    return candidates[0]
  }

  /**
   * Generate a prompt from template and context
   */
  public generatePrompt(context: PromptContext): GeneratedPrompt | null {
    const template = context.templateOverrides?.id
      ? this.templates.get(context.templateOverrides.id)
      : this.findBestTemplate(context)

    if (!template) {
      throw new Error('No suitable template found for the given context')
    }

    // Prepare variables for substitution
    const variables = this.prepareVariables(template, context)

    // Perform template substitution
    let prompt = template.template

    template.variables.forEach(varName => {
      const value = variables[varName] || `[${varName}]`
      const regex = new RegExp(`{{${varName}}}`, 'g')
      prompt = prompt.replace(regex, String(value))
    })

    // Apply user preference adjustments
    prompt = this.applyUserPreferences(prompt, context.userPreferences)

    // Estimate token count (rough approximation)
    const estimatedTokens = Math.ceil(prompt.length / 4)

    // Update template usage
    template.metadata.usage += 1
    template.metadata.updatedAt = new Date()

    return {
      prompt,
      templateId: template.id,
      templateVersion: template.version,
      variables,
      generatedAt: new Date(),
      context,
      estimatedTokens
    }
  }

  /**
   * Get template by ID
   */
  public getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * Get templates by industry
   */
  public getTemplatesByIndustry(industry: Industry): PromptTemplate[] {
    return this.industryTemplates.get(industry) || []
  }

  /**
   * Get templates by step
   */
  public getTemplatesByStep(step: string): PromptTemplate[] {
    return this.stepTemplates.get(step) || []
  }

  /**
   * Update template effectiveness based on feedback
   */
  public updateTemplateEffectiveness(templateId: string, feedback: number): void {
    const template = this.templates.get(templateId)
    if (!template) return

    // Update effectiveness using exponential moving average
    const alpha = 0.1 // Learning rate
    template.metadata.effectiveness =
      (1 - alpha) * template.metadata.effectiveness + alpha * feedback

    template.metadata.updatedAt = new Date()
  }

  /**
   * Get template statistics
   */
  public getTemplateStats(): {
    totalTemplates: number
    templatesPerIndustry: Record<Industry, number>
    templatesPerStep: Record<string, number>
    avgEffectiveness: number
    mostUsedTemplates: PromptTemplate[]
  } {
    const templates = Array.from(this.templates.values())

    const templatesPerIndustry = {} as Record<Industry, number>
    const templatesPerStep = {} as Record<string, number>

    templates.forEach(template => {
      if (template.industry) {
        templatesPerIndustry[template.industry] = (templatesPerIndustry[template.industry] || 0) + 1
      }
      if (template.step) {
        templatesPerStep[template.step] = (templatesPerStep[template.step] || 0) + 1
      }
    })

    const avgEffectiveness = templates.reduce((sum, t) => sum + t.metadata.effectiveness, 0) / templates.length

    const mostUsedTemplates = templates
      .sort((a, b) => b.metadata.usage - a.metadata.usage)
      .slice(0, 5)

    return {
      totalTemplates: templates.length,
      templatesPerIndustry,
      templatesPerStep,
      avgEffectiveness,
      mostUsedTemplates
    }
  }

  // Private helper methods

  private prepareVariables(template: PromptTemplate, context: PromptContext): Record<string, any> {
    const variables: Record<string, any> = {}

    // Map context to template variables
    const contextMapping: Record<string, any> = {
      organizationName: context.organizationData?.name || '[Nombre de organización]',
      companySize: context.companySize || 'medium',
      industry: context.industry || 'general',
      department: context.organizationData?.department || '[Departamento]',
      userRole: context.role || 'empleado',
      currentStep: context.currentStep || '[Paso actual]',
      specialization: context.organizationData?.specialization || '[Especialización]',
      targetMarket: context.organizationData?.targetMarket || '[Mercado objetivo]',
      serviceType: context.organizationData?.serviceType || '[Tipo de servicio]',
      quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      year: new Date().getFullYear().toString(),
      teamSize: context.organizationData?.teamSize || '[Tamaño de equipo]',
      experience: context.organizationData?.experience || 'intermediate',
      progressData: JSON.stringify(context.progressData || {}, null, 2),
      completionData: JSON.stringify(context.organizationData || {}, null, 2),
      explanationLevel: context.userPreferences?.explanationLevel || 'detailed'
    }

    // Add custom variables from context
    Object.assign(contextMapping, context.variables || {})

    // Extract only variables needed by the template
    template.variables.forEach(varName => {
      variables[varName] = contextMapping[varName] || `[${varName}]`
    })

    return variables
  }

  private applyUserPreferences(prompt: string, preferences?: PromptContext['userPreferences']): string {
    if (!preferences) return prompt

    let adjustedPrompt = prompt

    // Adjust tone
    if (preferences.tone === 'casual') {
      adjustedPrompt = adjustedPrompt.replace(/formal/g, 'casual')
      adjustedPrompt += '\n\nUsa un tono casual y amigable en tu respuesta.'
    } else if (preferences.tone === 'formal') {
      adjustedPrompt += '\n\nMantén un tono formal y profesional.'
    }

    // Adjust explanation level
    if (preferences.explanationLevel === 'brief') {
      adjustedPrompt += '\n\nProporciona respuestas concisas y directas.'
    } else if (preferences.explanationLevel === 'detailed') {
      adjustedPrompt += '\n\nProporciona explicaciones detalladas con ejemplos.'
    } else if (preferences.explanationLevel === 'technical') {
      adjustedPrompt += '\n\nIncluye detalles técnicos y análisis profundo.'
    }

    return adjustedPrompt
  }

  private getFallbackTemplate(context: PromptContext): PromptTemplate {
    return {
      id: 'fallback-generic',
      name: 'Generic Fallback Template',
      version: '1.0.0',
      template: `Proporciona asistencia para el paso "{{currentStep}}" del proceso de onboarding.

Contexto:
- Industria: {{industry}}
- Rol: {{userRole}}
- Paso actual: {{currentStep}}

Por favor, proporciona sugerencias útiles y relevantes para continuar con el proceso de configuración.`,
      variables: ['currentStep', 'industry', 'userRole'],
      metadata: {
        description: 'Fallback template when no specific template is found',
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usage: 0,
        effectiveness: 0.5
      },
      tags: ['fallback', 'generic'],
      language: 'es'
    }
  }
}

// Export singleton instance
export const promptManager = PromptManager.getInstance()

// Export utility functions for common operations
export const promptUtils = {
  // Generate prompt for a specific step
  generateStepPrompt: (step: string, context: PromptContext): GeneratedPrompt | null => {
    return promptManager.generatePrompt({ ...context, currentStep: step })
  },

  // Get industry-specific templates
  getIndustryTemplates: (industry: Industry): PromptTemplate[] => {
    return promptManager.getTemplatesByIndustry(industry)
  },

  // Find templates for a specific step
  getStepTemplates: (step: string): PromptTemplate[] => {
    return promptManager.getTemplatesByStep(step)
  },

  // Provide feedback on template effectiveness
  provideFeedback: (templateId: string, wasHelpful: boolean): void => {
    const feedback = wasHelpful ? 1 : 0
    promptManager.updateTemplateEffectiveness(templateId, feedback)
  },

  // Check if templates exist for context
  hasTemplatesForContext: (context: PromptContext): boolean => {
    return promptManager.findBestTemplate(context) !== null
  },

  // Get template statistics
  getStats: () => {
    return promptManager.getTemplateStats()
  }
}