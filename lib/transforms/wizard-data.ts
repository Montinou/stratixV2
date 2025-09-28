import { InsightsGenerator } from '@/lib/ai/insights-generator'
import { AnalyticsEngine } from '@/lib/ai/analytics-engine'
import type {
  OnboardingFormData,
  OnboardingSession,
  OnboardingProgress
} from '@/lib/database/onboarding-types'
import type { AnalyticsRequest, AnalyticsResponse } from '@/lib/ai/analytics-engine'

/**
 * WizardDataTransformer
 * Transforms wizard onboarding data into actionable insights and analytics
 * Integrates with existing AI services for generating recommendations
 */
export class WizardDataTransformer {
  private insightsGenerator: InsightsGenerator
  private analyticsEngine: AnalyticsEngine

  constructor() {
    this.analyticsEngine = new AnalyticsEngine()
    this.insightsGenerator = new InsightsGenerator(this.analyticsEngine)
  }

  /**
   * Transform onboarding data into analytics insights
   */
  async generateOnboardingInsights(
    session: OnboardingSession,
    progress: OnboardingProgress[],
    userId: string
  ): Promise<AnalyticsResponse> {
    try {
      // Prepare analytics request based on onboarding data
      const analyticsRequest: AnalyticsRequest = {
        userId,
        timeRange: {
          start: new Date(session.created_at),
          end: new Date()
        },
        analysisType: 'comprehensive', // Use comprehensive analysis for onboarding
        filters: {
          departments: this.extractDepartments(session.form_data),
          status: ['in_progress', 'completed'],
          priority: ['high', 'medium', 'low']
        },
        includeMetrics: true,
        includePredictions: true,
        includeRecommendations: true
      }

      // Generate insights using the existing AI service
      return await this.insightsGenerator.generateInsights(analyticsRequest, userId)
    } catch (error) {
      console.error('Error generating onboarding insights:', error)
      throw new Error(`Failed to generate onboarding insights: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transform wizard form data into structured organization data
   */
  transformWizardToOrgData(formData: OnboardingFormData): {
    organization: any;
    recommendations: any[];
    nextSteps: string[];
  } {
    const { welcome, company, organization: orgData, preferences } = formData

    // Transform company data
    const organization = {
      name: company?.company_name,
      industry: company?.industry_id,
      size: company?.company_size,
      description: company?.description,
      country: company?.country,
      website: company?.website,
      okr_maturity: orgData?.okr_maturity,
      current_challenges: orgData?.current_challenges || [],
      business_goals: orgData?.business_goals || [],
      user_preferences: {
        communication_style: preferences?.communication_style,
        language: preferences?.language,
        ai_assistance_level: preferences?.ai_assistance_level
      },
      primary_contact: {
        name: welcome?.full_name,
        job_title: welcome?.job_title,
        experience_level: welcome?.experience_with_okr,
        primary_goal: welcome?.primary_goal,
        urgency_level: welcome?.urgency_level
      }
    }

    // Generate recommendations based on form data
    const recommendations = this.generateRecommendations(formData)

    // Generate next steps
    const nextSteps = this.generateNextSteps(formData)

    return {
      organization,
      recommendations,
      nextSteps
    }
  }

  /**
   * Extract completion analytics from onboarding progress
   */
  extractCompletionAnalytics(session: OnboardingSession, progress: OnboardingProgress[]): {
    completionRate: number;
    timeSpent: number;
    stepAnalytics: Array<{
      stepNumber: number;
      stepName: string;
      completed: boolean;
      timeSpent: number;
      validationScore: number;
    }>;
    riskFactors: string[];
  } {
    const completedSteps = progress.filter(p => p.completed).length
    const completionRate = (completedSteps / session.total_steps) * 100

    // Calculate total time spent
    const totalTime = progress.reduce((total, step) => {
      if (step.completion_time) {
        const start = new Date(step.created_at).getTime()
        const end = new Date(step.completion_time).getTime()
        return total + (end - start)
      }
      return total
    }, 0)

    // Extract step analytics
    const stepAnalytics = progress.map(step => ({
      stepNumber: step.step_number,
      stepName: step.step_name,
      completed: step.completed,
      timeSpent: step.completion_time
        ? new Date(step.completion_time).getTime() - new Date(step.created_at).getTime()
        : 0,
      validationScore: this.calculateValidationScore(step)
    }))

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(session, stepAnalytics)

    return {
      completionRate,
      timeSpent: totalTime,
      stepAnalytics,
      riskFactors
    }
  }

  /**
   * Transform onboarding data for OKR initialization
   */
  transformForOKRSetup(formData: OnboardingFormData): {
    suggestedObjectives: any[];
    teamStructure: any;
    priorityMatrix: any;
  } {
    const { welcome, company, organization: orgData } = formData

    // Generate suggested objectives based on industry and goals
    const suggestedObjectives = this.generateSuggestedObjectives(
      company?.industry_id,
      orgData?.business_goals || [],
      welcome?.experience_with_okr,
      welcome?.primary_goal
    )

    // Suggest team structure based on company size and industry
    const teamStructure = this.suggestTeamStructure(
      company?.company_size,
      company?.industry_id,
      orgData?.current_challenges || []
    )

    // Create priority matrix based on urgency and business goals
    const priorityMatrix = this.createPriorityMatrix(
      welcome?.urgency_level,
      orgData?.business_goals || [],
      orgData?.current_challenges || []
    )

    return {
      suggestedObjectives,
      teamStructure,
      priorityMatrix
    }
  }

  /**
   * Private helper methods
   */

  private extractDepartments(formData: any): string[] {
    // Extract potential departments from form data
    const departments = ['General'] // Default department

    if (formData?.company?.industry_id) {
      // Add industry-specific departments
      departments.push(...this.getIndustryDepartments(formData.company.industry_id))
    }

    return departments
  }

  private getIndustryDepartments(industryId: string): string[] {
    const industryDepartments: Record<string, string[]> = {
      'technology': ['Desarrollo', 'Producto', 'Marketing', 'Ventas'],
      'healthcare': ['Medicina', 'Administración', 'Investigación'],
      'finance': ['Riesgo', 'Inversiones', 'Cumplimiento', 'Operaciones'],
      'retail': ['Ventas', 'Marketing', 'Operaciones', 'Logística'],
      'manufacturing': ['Producción', 'Calidad', 'Logística', 'Mantenimiento']
    }

    return industryDepartments[industryId] || ['Operaciones', 'Administración']
  }

  private generateRecommendations(formData: OnboardingFormData): any[] {
    const recommendations = []
    const { welcome, company, organization: orgData } = formData

    // Experience-based recommendations
    if (welcome?.experience_with_okr === 'none') {
      recommendations.push({
        type: 'learning',
        title: 'Capacitación en OKRs',
        description: 'Recomendamos comenzar con capacitación básica en metodología OKRs',
        priority: 'high',
        timeline: '1-2 semanas'
      })
    }

    // Company size-based recommendations
    if (company?.company_size === 'startup') {
      recommendations.push({
        type: 'strategy',
        title: 'Enfoque en métricas de tracción',
        description: 'Para startups, prioriza métricas de crecimiento y validación de mercado',
        priority: 'high',
        timeline: 'Inmediato'
      })
    }

    // Industry-specific recommendations
    if (company?.industry_id === 'technology') {
      recommendations.push({
        type: 'process',
        title: 'Integración con metodologías ágiles',
        description: 'Alinea los OKRs con sprints y entregas de producto',
        priority: 'medium',
        timeline: '2-4 semanas'
      })
    }

    // Challenge-based recommendations
    if (orgData?.current_challenges?.includes('alignment')) {
      recommendations.push({
        type: 'alignment',
        title: 'Sesiones de alineación estratégica',
        description: 'Implementa reuniones regulares de alineación entre equipos',
        priority: 'high',
        timeline: 'Semanal'
      })
    }

    return recommendations
  }

  private generateNextSteps(formData: OnboardingFormData): string[] {
    const steps = []
    const { welcome, preferences } = formData

    // Always include basic setup steps
    steps.push('Revisar OKRs sugeridos para tu industria')
    steps.push('Configurar tu primer objetivo en el dashboard')

    // Add AI-specific steps if AI assistance is enabled
    if (preferences?.ai_assistance_level === 'extensive') {
      steps.unshift('Activar notificaciones de IA para sugerencias proactivas')
    }

    // Add experience-based steps
    if (welcome?.experience_with_okr === 'none') {
      steps.push('Completar tutorial de metodología OKRs')
    }

    // Add collaboration steps
    steps.push('Invitar a tu equipo a colaborar')
    steps.push('Configurar métricas y reportes automáticos')

    return steps
  }

  private calculateValidationScore(step: OnboardingProgress): number {
    if (!step.ai_validation) return 50 // Default score if no validation

    const validation = step.ai_validation as any

    let score = 100

    // Reduce score based on errors and warnings
    if (validation.errors?.length > 0) {
      score -= validation.errors.length * 20
    }

    if (validation.warnings?.length > 0) {
      score -= validation.warnings.length * 10
    }

    return Math.max(0, score)
  }

  private identifyRiskFactors(session: OnboardingSession, stepAnalytics: any[]): string[] {
    const risks = []

    // Check completion rate
    const completedSteps = stepAnalytics.filter(step => step.completed).length
    const completionRate = (completedSteps / session.total_steps) * 100

    if (completionRate < 50) {
      risks.push('Baja tasa de finalización del onboarding')
    }

    // Check for rushed completion
    const avgTimePerStep = stepAnalytics.reduce((sum, step) => sum + step.timeSpent, 0) / stepAnalytics.length
    if (avgTimePerStep < 60000) { // Less than 1 minute per step
      risks.push('Onboarding completado demasiado rápido, posible falta de detalle')
    }

    // Check validation scores
    const avgValidationScore = stepAnalytics.reduce((sum, step) => sum + step.validationScore, 0) / stepAnalytics.length
    if (avgValidationScore < 70) {
      risks.push('Múltiples errores de validación, datos incompletos')
    }

    // Check for incomplete mandatory steps
    const incompleteSteps = stepAnalytics.filter(step => !step.completed).length
    if (incompleteSteps > 0) {
      risks.push(`${incompleteSteps} pasos obligatorios sin completar`)
    }

    return risks
  }

  private generateSuggestedObjectives(
    industryId?: string,
    businessGoals: string[] = [],
    experienceLevel?: string,
    primaryGoal?: string
  ): any[] {
    const objectives = []

    // Industry-specific objectives
    if (industryId === 'technology') {
      objectives.push({
        title: 'Acelerar desarrollo de producto',
        description: 'Reducir tiempo de lanzamiento de nuevas funcionalidades',
        keyResults: [
          'Reducir ciclo de desarrollo en 30%',
          'Aumentar satisfacción del desarrollador a 85%',
          'Implementar 5 funcionalidades críticas'
        ],
        priority: 'high'
      })
    }

    // Experience-based objectives
    if (experienceLevel === 'none') {
      objectives.push({
        title: 'Establecer cultura OKR',
        description: 'Implementar metodología OKRs en toda la organización',
        keyResults: [
          '100% del equipo capacitado en OKRs',
          'Definir 3 objetivos organizacionales',
          'Alcanzar 80% de adopción en equipos'
        ],
        priority: 'high'
      })
    }

    // Business goal-based objectives
    if (businessGoals.includes('growth')) {
      objectives.push({
        title: 'Acelerar crecimiento del negocio',
        description: 'Incrementar ingresos y base de clientes',
        keyResults: [
          'Aumentar ingresos mensuales en 25%',
          'Adquirir 100 nuevos clientes',
          'Mejorar retención de clientes a 95%'
        ],
        priority: 'high'
      })
    }

    return objectives
  }

  private suggestTeamStructure(
    companySize?: string,
    industryId?: string,
    challenges: string[] = []
  ): any {
    const structure = {
      departments: [] as string[],
      roles: [] as any[],
      hierarchy: 'flat' as 'flat' | 'hierarchical'
    }

    // Size-based structure
    if (companySize === 'startup') {
      structure.departments = ['Producto', 'Desarrollo', 'Marketing']
      structure.hierarchy = 'flat'
      structure.roles = [
        { title: 'Product Owner', department: 'Producto', level: 'lead' },
        { title: 'Tech Lead', department: 'Desarrollo', level: 'lead' },
        { title: 'Marketing Lead', department: 'Marketing', level: 'lead' }
      ]
    } else if (companySize === 'enterprise') {
      structure.departments = ['Estrategia', 'Operaciones', 'Tecnología', 'Recursos Humanos', 'Finanzas']
      structure.hierarchy = 'hierarchical'
      structure.roles = [
        { title: 'Director de Estrategia', department: 'Estrategia', level: 'executive' },
        { title: 'Director de Operaciones', department: 'Operaciones', level: 'executive' },
        { title: 'CTO', department: 'Tecnología', level: 'executive' }
      ]
    }

    // Industry adjustments
    if (industryId === 'technology') {
      if (!structure.departments.includes('Desarrollo')) {
        structure.departments.push('Desarrollo')
      }
      if (!structure.departments.includes('Producto')) {
        structure.departments.push('Producto')
      }
    }

    return structure
  }

  private createPriorityMatrix(
    urgencyLevel?: string,
    businessGoals: string[] = [],
    challenges: string[] = []
  ): any {
    const matrix = {
      high_priority: [] as string[],
      medium_priority: [] as string[],
      low_priority: [] as string[]
    }

    // Urgency-based prioritization
    if (urgencyLevel === 'urgent') {
      matrix.high_priority.push('Implementación inmediata de OKRs críticos')
      matrix.high_priority.push('Resolución de bloqueos organizacionales')
    }

    // Goal-based prioritization
    if (businessGoals.includes('growth')) {
      matrix.high_priority.push('Objetivos de crecimiento e ingresos')
    }

    if (businessGoals.includes('efficiency')) {
      matrix.medium_priority.push('Optimización de procesos internos')
    }

    // Challenge-based prioritization
    if (challenges.includes('alignment')) {
      matrix.high_priority.push('Alineación estratégica entre equipos')
    }

    if (challenges.includes('communication')) {
      matrix.medium_priority.push('Mejora en comunicación organizacional')
    }

    // Fill remaining priorities
    matrix.low_priority.push('Optimización de herramientas secundarias')
    matrix.low_priority.push('Capacitación avanzada en metodologías')

    return matrix
  }
}

/**
 * Factory function to create a new wizard data transformer
 */
export function createWizardDataTransformer(): WizardDataTransformer {
  return new WizardDataTransformer()
}

/**
 * Convenience function for quick onboarding insights generation
 */
export async function generateQuickOnboardingInsights(
  session: OnboardingSession,
  progress: OnboardingProgress[],
  userId: string
): Promise<AnalyticsResponse> {
  const transformer = createWizardDataTransformer()
  return transformer.generateOnboardingInsights(session, progress, userId)
}

/**
 * Export singleton instance for reuse
 */
export const wizardDataTransformer = new WizardDataTransformer()