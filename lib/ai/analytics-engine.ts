import { getDrizzleDb } from '@/lib/database/client'
import type { Objective, Initiative, Activity, Profile, UserRole } from "@/lib/database/types"

// Analytics interfaces following the API specification from Issue #65
export interface AnalyticsTimeRange {
  start: Date
  end: Date
}

export interface AnalyticsRequest {
  okrIds?: string[]
  teamId?: string
  timeRange: AnalyticsTimeRange
  analysisType: 'performance' | 'predictive' | 'comparative' | 'comprehensive'
  includeRecommendations?: boolean
  benchmarkAgainst?: 'industry' | 'company' | 'team'
}

export interface Insight {
  id: string
  title: string
  content: string
  type: 'trend' | 'performance' | 'risk' | 'opportunity' | 'prediction'
  priority: 'low' | 'medium' | 'high'
  confidence: number // 0-100
  impact: number // 0-100
  category: string
  metadata?: Record<string, any>
}

export interface Prediction {
  id: string
  objective_id: string
  predicted_completion: Date
  probability: number // 0-100
  confidence: number // 0-100
  risk_factors: string[]
  required_actions: string[]
}

export interface Recommendation {
  id: string
  title: string
  description: string
  category: 'process' | 'resource' | 'timeline' | 'strategy'
  priority: 'low' | 'medium' | 'high'
  impact: number // 0-100
  effort: 'low' | 'medium' | 'high'
  target_okr_ids: string[]
}

export interface Benchmark {
  metric: string
  current_value: number
  benchmark_value: number
  comparison: 'above' | 'at' | 'below'
  improvement_potential: number
}

export interface RiskFactor {
  id: string
  title: string
  description: string
  probability: number // 0-100
  impact: number // 0-100
  mitigation_suggestions: string[]
  affected_okr_ids: string[]
}

export interface Trend {
  metric: string
  direction: 'increasing' | 'decreasing' | 'stable'
  velocity: number
  confidence: number // 0-100
  timeframe: string
}

export interface AnalyticsResponse {
  summary: string
  insights: Insight[]
  predictions: Prediction[]
  recommendations: Recommendation[]
  benchmarks: Benchmark[]
  riskFactors: RiskFactor[]
  trends: Trend[]
  metadata: {
    analysis_type: string
    time_range: AnalyticsTimeRange
    generated_at: Date
    data_points_analyzed: number
    confidence_score: number
  }
}

// Core analytics data structures
export interface OKRAnalyticsData {
  objectives: Objective[]
  initiatives: Initiative[]
  activities: Activity[]
  profiles: Profile[]
  historical_progress: ProgressSnapshot[]
}

export interface ProgressSnapshot {
  okr_id: string
  okr_type: 'objective' | 'initiative' | 'activity'
  progress: number
  status: string
  snapshot_date: Date
}

export interface PerformanceMetrics {
  total_objectives: number
  completed_objectives: number
  in_progress_objectives: number
  overdue_objectives: number
  average_progress: number
  completion_rate: number
  velocity: number // progress per day
  efficiency_score: number
}

export interface TeamPerformanceData {
  team_id: string
  department: string
  metrics: PerformanceMetrics
  trend_analysis: {
    progress_trend: 'positive' | 'negative' | 'stable'
    velocity_change: number
    completion_rate_change: number
  }
}

/**
 * Core Analytics Engine - Processes OKR data and generates insights
 * Following NEON_STACK_AUTH_SETUP patterns for authentication
 */
export class AnalyticsEngine {
  private supabase = createClient()

  /**
   * Retrieve comprehensive OKR data for analysis
   */
  async getAnalyticsData(request: AnalyticsRequest, userId: string): Promise<OKRAnalyticsData> {
    const { timeRange, okrIds, teamId } = request

    // Build query filters
    let objectiveQuery = this.supabase
      .from('objectives')
      .select(`
        *,
        owner:profiles!inner(*)
      `)
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString())

    // Apply filters based on request
    if (okrIds && okrIds.length > 0) {
      objectiveQuery = objectiveQuery.in('id', okrIds)
    }

    if (teamId) {
      objectiveQuery = objectiveQuery.eq('department', teamId)
    }

    const { data: objectives, error: objError } = await objectiveQuery
    if (objError) throw new Error(`Failed to fetch objectives: ${objError.message}`)

    // Get related initiatives
    const objectiveIds = objectives?.map(obj => obj.id) || []
    const { data: initiatives, error: initError } = await this.supabase
      .from('initiatives')
      .select(`
        *,
        owner:profiles!inner(*),
        objective:objectives!inner(*)
      `)
      .in('objective_id', objectiveIds)

    if (initError) throw new Error(`Failed to fetch initiatives: ${initError.message}`)

    // Get related activities
    const initiativeIds = initiatives?.map(init => init.id) || []
    const { data: activities, error: actError } = await this.supabase
      .from('activities')
      .select(`
        *,
        owner:profiles!inner(*),
        initiative:initiatives!inner(*)
      `)
      .in('initiative_id', initiativeIds)

    if (actError) throw new Error(`Failed to fetch activities: ${actError.message}`)

    // Get unique profiles
    // Get unique owner IDs
    const ownerIds = new Set<string>()
    objectives?.forEach(obj => ownerIds.add(obj.owner_id))
    initiatives?.forEach(init => ownerIds.add(init.owner_id))
    activities?.forEach(act => ownerIds.add(act.owner_id))
    const allOwnerIds = Array.from(ownerIds)

    const { data: profiles, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .in('id', allOwnerIds)

    if (profileError) throw new Error(`Failed to fetch profiles: ${profileError.message}`)

    // For now, we'll simulate historical progress data
    // In a real implementation, this would come from a progress_snapshots table
    const historical_progress = this.generateHistoricalProgressData(objectives || [], initiatives || [], activities || [])

    return {
      objectives: objectives || [],
      initiatives: initiatives || [],
      activities: activities || [],
      profiles: profiles || [],
      historical_progress
    }
  }

  /**
   * Calculate performance metrics for a dataset
   */
  calculatePerformanceMetrics(data: OKRAnalyticsData): PerformanceMetrics {
    const { objectives } = data

    const total_objectives = objectives.length
    const completed_objectives = objectives.filter(obj => obj.status === 'completado').length
    const in_progress_objectives = objectives.filter(obj => obj.status === 'en_progreso').length

    // Calculate overdue objectives
    const today = new Date()
    const overdue_objectives = objectives.filter(obj => {
      const endDate = new Date(obj.end_date)
      return endDate < today && obj.status !== 'completado'
    }).length

    const average_progress = total_objectives > 0
      ? objectives.reduce((sum, obj) => sum + obj.progress, 0) / total_objectives
      : 0

    const completion_rate = total_objectives > 0 ? (completed_objectives / total_objectives) * 100 : 0

    // Calculate velocity (average progress per day)
    const velocity = this.calculateProgressVelocity(data.historical_progress)

    // Calculate efficiency score based on progress vs time elapsed
    const efficiency_score = this.calculateEfficiencyScore(objectives)

    return {
      total_objectives,
      completed_objectives,
      in_progress_objectives,
      overdue_objectives,
      average_progress,
      completion_rate,
      velocity,
      efficiency_score
    }
  }

  /**
   * Perform comparative analysis between teams/departments
   */
  async performComparativeAnalysis(request: AnalyticsRequest, userId: string): Promise<TeamPerformanceData[]> {
    const data = await this.getAnalyticsData(request, userId)

    // Group data by department
    const departmentGroups = this.groupByDepartment(data)

    return departmentGroups.map(group => {
      const metrics = this.calculatePerformanceMetrics(group.data)
      const trend_analysis = this.analyzeTrends(group.data.historical_progress)

      return {
        team_id: group.department,
        department: group.department,
        metrics,
        trend_analysis
      }
    })
  }

  /**
   * Generate predictive analytics for goal achievement
   */
  generatePredictions(data: OKRAnalyticsData): Prediction[] {
    return data.objectives.map(objective => {
      const velocity = this.calculateObjectiveVelocity(objective, data.historical_progress)
      const remaining_progress = 100 - objective.progress
      const days_remaining = Math.max(1, Math.ceil((new Date(objective.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

      // Calculate probability based on current velocity and time remaining
      const required_velocity = remaining_progress / days_remaining
      const probability = Math.min(100, Math.max(0, (velocity / required_velocity) * 100))

      // Identify risk factors
      const risk_factors = this.identifyRiskFactors(objective, velocity, days_remaining)

      // Generate required actions
      const required_actions = this.generateRequiredActions(objective, velocity, required_velocity)

      const predicted_completion = this.predictCompletionDate(objective, velocity)

      return {
        id: `pred_${objective.id}`,
        objective_id: objective.id,
        predicted_completion,
        probability: Math.round(probability),
        confidence: this.calculatePredictionConfidence(objective, data.historical_progress),
        risk_factors,
        required_actions
      }
    })
  }

  /**
   * Generate strategic recommendations
   */
  generateRecommendations(data: OKRAnalyticsData, metrics: PerformanceMetrics): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Low completion rate recommendations
    if (metrics.completion_rate < 60) {
      recommendations.push({
        id: 'rec_completion_rate',
        title: 'Mejorar Tasa de Finalización',
        description: 'La tasa de finalización del ' + Math.round(metrics.completion_rate) + '% está por debajo del objetivo. Considere revisar la dificultad de los objetivos y proporcionar más apoyo a los equipos.',
        category: 'strategy',
        priority: 'high',
        impact: 85,
        effort: 'medium',
        target_okr_ids: data.objectives.filter(obj => obj.progress < 50).map(obj => obj.id)
      })
    }

    // Low velocity recommendations
    if (metrics.velocity < 1) {
      recommendations.push({
        id: 'rec_velocity',
        title: 'Acelerar Progreso',
        description: 'El progreso diario está por debajo del promedio. Implemente reuniones de seguimiento más frecuentes y elimine bloqueadores identificados.',
        category: 'process',
        priority: 'medium',
        impact: 70,
        effort: 'low',
        target_okr_ids: data.objectives.filter(obj => obj.status === 'en_progreso').map(obj => obj.id)
      })
    }

    // Overdue objectives recommendations
    if (metrics.overdue_objectives > 0) {
      recommendations.push({
        id: 'rec_overdue',
        title: 'Gestionar Objetivos Vencidos',
        description: `Hay ${metrics.overdue_objectives} objetivos vencidos que requieren atención inmediata. Evalúe si necesitan extensión de tiempo o reasignación de recursos.`,
        category: 'timeline',
        priority: 'high',
        impact: 90,
        effort: 'high',
        target_okr_ids: data.objectives.filter(obj => {
          const endDate = new Date(obj.end_date)
          return endDate < new Date() && obj.status !== 'completado'
        }).map(obj => obj.id)
      })
    }

    // Resource allocation recommendations
    const underperformingDepts = this.identifyUnderperformingDepartments(data)
    if (underperformingDepts.length > 0) {
      recommendations.push({
        id: 'rec_resource_allocation',
        title: 'Optimizar Asignación de Recursos',
        description: `Los departamentos ${underperformingDepts.join(', ')} muestran bajo rendimiento. Considere reasignar recursos o proporcionar capacitación adicional.`,
        category: 'resource',
        priority: 'medium',
        impact: 75,
        effort: 'high',
        target_okr_ids: data.objectives.filter(obj => underperformingDepts.includes(obj.department || '')).map(obj => obj.id)
      })
    }

    return recommendations
  }

  // Helper methods

  private generateHistoricalProgressData(objectives: Objective[], initiatives: Initiative[], activities: Activity[]): ProgressSnapshot[] {
    const snapshots: ProgressSnapshot[] = []
    const now = new Date()

    // Generate 30 days of simulated historical data
    for (let i = 0; i < 30; i++) {
      const snapshotDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))

      const allItems = objectives.concat(initiatives).concat(activities)
      allItems.forEach(item => {
        const daysSinceStart = Math.floor((snapshotDate.getTime() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceStart >= 0) {
          // Simulate gradual progress over time
          const simulatedProgress = Math.min(item.progress, (daysSinceStart / 30) * item.progress)

          snapshots.push({
            okr_id: item.id,
            okr_type: 'objective_id' in item ? 'initiative' : 'initiative_id' in item ? 'activity' : 'objective',
            progress: simulatedProgress,
            status: item.status,
            snapshot_date: snapshotDate
          })
        }
      })
    }

    return snapshots
  }

  private calculateProgressVelocity(historical_progress: ProgressSnapshot[]): number {
    // Calculate average daily progress across all OKRs
    const okrVelocities = new Map<string, number>()

    historical_progress.forEach(snapshot => {
      if (!okrVelocities.has(snapshot.okr_id)) {
        const okrSnapshots = historical_progress.filter(s => s.okr_id === snapshot.okr_id)
          .sort((a, b) => a.snapshot_date.getTime() - b.snapshot_date.getTime())

        if (okrSnapshots.length >= 2) {
          const firstSnapshot = okrSnapshots[0]
          const lastSnapshot = okrSnapshots[okrSnapshots.length - 1]
          const daysDiff = (lastSnapshot.snapshot_date.getTime() - firstSnapshot.snapshot_date.getTime()) / (1000 * 60 * 60 * 24)
          const progressDiff = lastSnapshot.progress - firstSnapshot.progress

          okrVelocities.set(snapshot.okr_id, daysDiff > 0 ? progressDiff / daysDiff : 0)
        }
      }
    })

    const velocities = Array.from(okrVelocities.values())
    return velocities.length > 0 ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0
  }

  private calculateEfficiencyScore(objectives: Objective[]): number {
    let totalEfficiency = 0
    let validObjectives = 0

    objectives.forEach(objective => {
      const startDate = new Date(objective.start_date)
      const endDate = new Date(objective.end_date)
      const now = new Date()

      const totalDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      const elapsed = Math.min(totalDuration, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      if (totalDuration > 0 && elapsed > 0) {
        const expectedProgress = (elapsed / totalDuration) * 100
        const actualProgress = objective.progress
        const efficiency = actualProgress > 0 ? (actualProgress / expectedProgress) * 100 : 0

        totalEfficiency += Math.min(150, efficiency) // Cap at 150% to avoid skewing
        validObjectives++
      }
    })

    return validObjectives > 0 ? totalEfficiency / validObjectives : 50
  }

  private groupByDepartment(data: OKRAnalyticsData): Array<{ department: string; data: OKRAnalyticsData }> {
    const departments = new Set(data.objectives.map(obj => obj.department || 'General'))

    return Array.from(departments).map(department => ({
      department,
      data: {
        objectives: data.objectives.filter(obj => (obj.department || 'General') === department),
        initiatives: data.initiatives.filter(init =>
          data.objectives.some(obj => obj.id === init.objective_id && (obj.department || 'General') === department)
        ),
        activities: data.activities.filter(act =>
          data.initiatives.some(init => init.id === act.initiative_id &&
            data.objectives.some(obj => obj.id === init.objective_id && (obj.department || 'General') === department)
          )
        ),
        profiles: data.profiles,
        historical_progress: data.historical_progress.filter(hp =>
          data.objectives.some(obj => obj.id === hp.okr_id && (obj.department || 'General') === department) ||
          data.initiatives.some(init => init.id === hp.okr_id &&
            data.objectives.some(obj => obj.id === init.objective_id && (obj.department || 'General') === department)
          ) ||
          data.activities.some(act => act.id === hp.okr_id &&
            data.initiatives.some(init => init.id === act.initiative_id &&
              data.objectives.some(obj => obj.id === init.objective_id && (obj.department || 'General') === department)
            )
          )
        )
      }
    }))
  }

  private analyzeTrends(historical_progress: ProgressSnapshot[]): TeamPerformanceData['trend_analysis'] {
    // Simple trend analysis - compare first half vs second half of time period
    const sortedProgress = historical_progress.sort((a, b) => a.snapshot_date.getTime() - b.snapshot_date.getTime())
    const midpoint = Math.floor(sortedProgress.length / 2)

    const firstHalf = sortedProgress.slice(0, midpoint)
    const secondHalf = sortedProgress.slice(midpoint)

    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, s) => sum + s.progress, 0) / firstHalf.length : 0
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, s) => sum + s.progress, 0) / secondHalf.length : 0

    const progress_trend = secondHalfAvg > firstHalfAvg + 5 ? 'positive' :
                         secondHalfAvg < firstHalfAvg - 5 ? 'negative' : 'stable'

    return {
      progress_trend,
      velocity_change: secondHalfAvg - firstHalfAvg,
      completion_rate_change: 0 // Simplified for now
    }
  }

  private calculateObjectiveVelocity(objective: Objective, historical_progress: ProgressSnapshot[]): number {
    const objectiveProgress = historical_progress
      .filter(hp => hp.okr_id === objective.id)
      .sort((a, b) => a.snapshot_date.getTime() - b.snapshot_date.getTime())

    if (objectiveProgress.length < 2) return 0

    const recent = objectiveProgress.slice(-7) // Last 7 days
    if (recent.length < 2) return 0

    const daysDiff = (recent[recent.length - 1].snapshot_date.getTime() - recent[0].snapshot_date.getTime()) / (1000 * 60 * 60 * 24)
    const progressDiff = recent[recent.length - 1].progress - recent[0].progress

    return daysDiff > 0 ? progressDiff / daysDiff : 0
  }

  private identifyRiskFactors(objective: Objective, velocity: number, days_remaining: number): string[] {
    const risks: string[] = []

    if (velocity < 0.5) {
      risks.push('Progreso muy lento - requiere intervención inmediata')
    }

    if (days_remaining < 7 && objective.progress < 80) {
      risks.push('Tiempo insuficiente para completar con progreso actual')
    }

    if (objective.progress < 20 && days_remaining < (new Date(objective.end_date).getTime() - new Date(objective.start_date).getTime()) / (1000 * 60 * 60 * 24) / 2) {
      risks.push('Progreso insuficiente en la primera mitad del período')
    }

    return risks
  }

  private generateRequiredActions(objective: Objective, current_velocity: number, required_velocity: number): string[] {
    const actions: string[] = []

    if (current_velocity < required_velocity) {
      actions.push(`Aumentar velocidad de progreso de ${current_velocity.toFixed(1)} a ${required_velocity.toFixed(1)} puntos por día`)
    }

    if (objective.progress < 50) {
      actions.push('Revisar bloqueadores y proporcionar recursos adicionales')
    }

    actions.push('Implementar seguimiento semanal con métricas específicas')

    return actions
  }

  private predictCompletionDate(objective: Objective, velocity: number): Date {
    const remaining_progress = 100 - objective.progress
    const days_to_complete = velocity > 0 ? remaining_progress / velocity : 999

    return new Date(Date.now() + (days_to_complete * 24 * 60 * 60 * 1000))
  }

  private calculatePredictionConfidence(objective: Objective, historical_progress: ProgressSnapshot[]): number {
    const objectiveProgress = historical_progress.filter(hp => hp.okr_id === objective.id)

    // More historical data = higher confidence
    const dataConfidence = Math.min(100, (objectiveProgress.length / 30) * 100)

    // Consistent progress = higher confidence
    const progressValues = objectiveProgress.map(hp => hp.progress).sort((a, b) => a - b)
    const variance = this.calculateVariance(progressValues)
    const consistencyConfidence = Math.max(0, 100 - variance)

    return Math.round((dataConfidence + consistencyConfidence) / 2)
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 100

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private identifyUnderperformingDepartments(data: OKRAnalyticsData): string[] {
    const departmentGroups = this.groupByDepartment(data)
    const underperforming: string[] = []

    departmentGroups.forEach(group => {
      const metrics = this.calculatePerformanceMetrics(group.data)
      if (metrics.completion_rate < 50 || metrics.average_progress < 60) {
        underperforming.push(group.department)
      }
    })

    return underperforming
  }
}