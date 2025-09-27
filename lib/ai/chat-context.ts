import type { OKRContext, UserContext } from './conversation-manager'
import type { Profile } from '@/lib/database/queries/profiles'
import type { Activity } from '@/lib/database/queries/activities'
import { getProfileById } from '@/lib/database/queries/profiles'
import { getRecentUserActivities } from '@/lib/database/queries/activities'

// Enhanced context with database queries
export interface ChatContextRequest {
  userId: string
  conversationId?: string
  currentOKRs?: OKRContext[]
  userRole?: string
  companyContext?: string
  recentActivity?: Activity[]
  preferences?: {
    language?: 'es' | 'en'
    communicationStyle?: 'formal' | 'informal'
    detailLevel?: 'basic' | 'detailed' | 'expert'
  }
}

export interface EnhancedChatContext {
  userContext: UserContext
  okrContext: OKRContext[]
  activityContext: Activity[]
  businessContext: {
    industry?: string
    companySize: 'startup' | 'pyme' | 'empresa' | 'corporacion'
    okrMaturity: 'beginner' | 'intermediate' | 'advanced'
    currentChallenges: string[]
  }
  conversationMetadata: {
    sessionType: 'strategy' | 'tracking' | 'problem_solving' | 'general'
    urgency: 'low' | 'medium' | 'high'
    expectedOutcome: string[]
  }
}

export class ChatContextBuilder {
  /**
   * Build comprehensive context for AI chat from request
   */
  async buildChatContext(request: ChatContextRequest): Promise<EnhancedChatContext> {
    // Get user profile and context
    const userContext = await this.buildUserContext(request.userId, request.preferences)

    // Get or process OKR context
    const okrContext = await this.enrichOKRContext(
      request.currentOKRs || [],
      userContext
    )

    // Get recent activity context
    const activityContext = await this.buildActivityContext(
      request.userId,
      request.recentActivity
    )

    // Build business context
    const businessContext = await this.buildBusinessContext(userContext, okrContext)

    // Determine conversation metadata
    const conversationMetadata = this.inferConversationMetadata(
      okrContext,
      activityContext,
      request
    )

    return {
      userContext,
      okrContext,
      activityContext,
      businessContext,
      conversationMetadata
    }
  }

  /**
   * Build user context from profile and preferences
   */
  private async buildUserContext(
    userId: string,
    preferences?: ChatContextRequest['preferences']
  ): Promise<UserContext> {
    try {
      // Get user profile from database
      const profile = await getProfileById(userId)
      if (!profile) {
        throw new Error(`Profile not found for user ${userId}`)
      }

      // Determine company size from profile
      const companySize = this.inferCompanySize(profile)

      // Map profile role to our role system
      const role = this.mapProfileRole(profile.role)

      return {
        userId,
        role,
        profile,
        department: profile.department || undefined,
        companySize,
        preferences: {
          language: preferences?.language || 'es',
          communicationStyle: preferences?.communicationStyle || 'formal',
          detailLevel: preferences?.detailLevel || 'detailed'
        }
      }
    } catch (error) {
      console.error('Error building user context:', error)
      throw new Error('Failed to build user context')
    }
  }

  /**
   * Enrich OKR context with additional metadata
   */
  private async enrichOKRContext(
    rawOKRs: OKRContext[],
    userContext: UserContext
  ): Promise<OKRContext[]> {
    return rawOKRs.map(okr => ({
      ...okr,
      // Add contextual metadata
      owner: okr.owner || userContext.profile.name,
      department: okr.department || userContext.department,
      // Calculate status insights
      statusInsight: this.analyzeOKRStatus(okr)
    }))
  }

  /**
   * Build activity context from recent user activities
   */
  private async buildActivityContext(
    userId: string,
    providedActivity?: Activity[]
  ): Promise<Activity[]> {
    try {
      if (providedActivity && providedActivity.length > 0) {
        return providedActivity.slice(0, 10) // Limit to last 10 activities
      }

      // Fetch recent activities from database
      const recentActivities = await getRecentUserActivities(userId, 10)
      return recentActivities || []
    } catch (error) {
      console.error('Error building activity context:', error)
      return []
    }
  }

  /**
   * Build business context based on user and OKR data
   */
  private async buildBusinessContext(
    userContext: UserContext,
    okrContext: OKRContext[]
  ): Promise<EnhancedChatContext['businessContext']> {
    const profile = userContext.profile

    // Infer OKR maturity from data quality and patterns
    const okrMaturity = this.inferOKRMaturity(okrContext, userContext)

    // Identify current challenges based on OKR status
    const currentChallenges = this.identifyCurrentChallenges(okrContext, userContext)

    return {
      industry: profile.industry || undefined,
      companySize: userContext.companySize,
      okrMaturity,
      currentChallenges
    }
  }

  /**
   * Infer conversation metadata from context
   */
  private inferConversationMetadata(
    okrContext: OKRContext[],
    activityContext: Activity[],
    request: ChatContextRequest
  ): EnhancedChatContext['conversationMetadata'] {
    // Determine session type based on OKR states and recent activity
    let sessionType: 'strategy' | 'tracking' | 'problem_solving' | 'general' = 'general'

    if (okrContext.length === 0) {
      sessionType = 'strategy' // Likely setting up OKRs
    } else if (okrContext.some(okr => okr.status === 'at_risk' || okr.status === 'blocked')) {
      sessionType = 'problem_solving'
    } else if (activityContext.some(activity => activity.type === 'progress_update')) {
      sessionType = 'tracking'
    }

    // Determine urgency based on OKR status and deadlines
    let urgency: 'low' | 'medium' | 'high' = 'low'

    const now = new Date()
    const hasUrgentOKRs = okrContext.some(okr => {
      if (okr.deadline) {
        const daysUntilDeadline = Math.ceil(
          (okr.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilDeadline <= 7 && okr.status !== 'completed'
      }
      return false
    })

    if (hasUrgentOKRs || okrContext.some(okr => okr.status === 'blocked')) {
      urgency = 'high'
    } else if (okrContext.some(okr => okr.status === 'at_risk')) {
      urgency = 'medium'
    }

    // Expected outcomes based on session type
    const expectedOutcome = this.getExpectedOutcomes(sessionType, urgency)

    return {
      sessionType,
      urgency,
      expectedOutcome
    }
  }

  /**
   * Map profile role to our standardized role system
   */
  private mapProfileRole(profileRole: string): 'corporativo' | 'gerente' | 'empleado' {
    const role = profileRole.toLowerCase()

    if (role.includes('ceo') || role.includes('director') || role.includes('executive')) {
      return 'corporativo'
    }

    if (role.includes('manager') || role.includes('gerente') || role.includes('lead')) {
      return 'gerente'
    }

    return 'empleado'
  }

  /**
   * Infer company size from profile data
   */
  private inferCompanySize(profile: Profile): 'startup' | 'pyme' | 'empresa' | 'corporacion' {
    // This could be enhanced with actual company data
    // For now, use department and role as indicators

    if (profile.industry === 'startup' || profile.company_name?.toLowerCase().includes('startup')) {
      return 'startup'
    }

    // Default to PYME for most cases
    return 'pyme'
  }

  /**
   * Analyze OKR status and provide insights
   */
  private analyzeOKRStatus(okr: OKRContext): string {
    const progress = okr.progress || 0
    const status = okr.status

    if (status === 'completed') {
      return 'completado exitosamente'
    }

    if (status === 'blocked') {
      return 'bloqueado - requiere atención inmediata'
    }

    if (status === 'at_risk') {
      return 'en riesgo - necesita seguimiento cercano'
    }

    if (progress < 25) {
      return 'progreso inicial - acelerar ejecución'
    } else if (progress < 50) {
      return 'progreso moderado - mantener momentum'
    } else if (progress < 75) {
      return 'buen progreso - enfocar en finalización'
    } else {
      return 'cerca de completar - sprint final'
    }
  }

  /**
   * Infer OKR maturity based on data patterns
   */
  private inferOKRMaturity(
    okrContext: OKRContext[],
    userContext: UserContext
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (okrContext.length === 0) {
      return 'beginner'
    }

    // Check for advanced OKR practices
    const hasProgress = okrContext.some(okr => okr.progress !== undefined)
    const hasDeadlines = okrContext.some(okr => okr.deadline !== undefined)
    const hasOwners = okrContext.some(okr => okr.owner !== undefined)
    const hasDepartments = okrContext.some(okr => okr.department !== undefined)

    const practiceCount = [hasProgress, hasDeadlines, hasOwners, hasDepartments]
      .filter(Boolean).length

    if (practiceCount >= 3) {
      return 'advanced'
    } else if (practiceCount >= 2) {
      return 'intermediate'
    } else {
      return 'beginner'
    }
  }

  /**
   * Identify current challenges based on OKR data
   */
  private identifyCurrentChallenges(
    okrContext: OKRContext[],
    userContext: UserContext
  ): string[] {
    const challenges: string[] = []

    if (okrContext.length === 0) {
      challenges.push('establecimiento_inicial_okrs')
    }

    const blockedOKRs = okrContext.filter(okr => okr.status === 'blocked')
    if (blockedOKRs.length > 0) {
      challenges.push('bloqueos_activos')
    }

    const atRiskOKRs = okrContext.filter(okr => okr.status === 'at_risk')
    if (atRiskOKRs.length > 0) {
      challenges.push('okrs_en_riesgo')
    }

    const lowProgressOKRs = okrContext.filter(okr =>
      okr.progress !== undefined && okr.progress < 30
    )
    if (lowProgressOKRs.length > okrContext.length / 2) {
      challenges.push('progreso_lento_generalizado')
    }

    // Check for alignment issues (different departments)
    const departments = new Set(okrContext.map(okr => okr.department).filter(Boolean))
    if (departments.size > 3 && userContext.role === 'corporativo') {
      challenges.push('alineacion_departamental')
    }

    return challenges
  }

  /**
   * Get expected outcomes based on session type and urgency
   */
  private getExpectedOutcomes(
    sessionType: string,
    urgency: string
  ): string[] {
    const outcomes: Record<string, string[]> = {
      strategy: [
        'definición clara de objetivos',
        'resultados clave medibles',
        'plan de implementación',
        'asignación de responsabilidades'
      ],
      tracking: [
        'análisis de progreso actual',
        'identificación de bloqueos',
        'plan de acción para mejoras',
        'próximos pasos específicos'
      ],
      problem_solving: [
        'identificación de causas raíz',
        'soluciones prácticas',
        'plan de recuperación',
        'prevención de problemas futuros'
      ],
      general: [
        'clarificación de dudas',
        'mejores prácticas',
        'recomendaciones personalizadas',
        'guía paso a paso'
      ]
    }

    let baseOutcomes = outcomes[sessionType] || outcomes.general

    // Add urgency-specific outcomes
    if (urgency === 'high') {
      baseOutcomes = ['solución inmediata', ...baseOutcomes]
    }

    return baseOutcomes
  }
}

// Export singleton instance
export const chatContextBuilder = new ChatContextBuilder()