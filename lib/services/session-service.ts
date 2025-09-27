import {
  getOnboardingSession,
  getOnboardingSessionWithProgress,
  updateOnboardingSession,
  getUserActiveSession,
  deleteOnboardingSession,
  getOnboardingAnalytics
} from '@/lib/database/onboarding-queries';
import type {
  OnboardingSession,
  OnboardingSessionWithProgress,
  OnboardingProgress
} from '@/lib/database/onboarding-types';

export interface SessionMetrics {
  total_time_spent: number; // in milliseconds
  average_step_time: number;
  completion_velocity: number; // steps per hour
  current_momentum: 'high' | 'medium' | 'low';
  predicted_completion_time: number; // in minutes
}

export interface SessionInsights {
  progress_assessment: string;
  bottlenecks: string[];
  recommendations: string[];
  risk_factors: string[];
  success_indicators: string[];
}

export interface SessionState {
  is_active: boolean;
  can_resume: boolean;
  requires_refresh: boolean;
  has_expired: boolean;
  completion_status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
}

export class SessionService {

  /**
   * Get session state and validity
   */
  static async getSessionState(sessionId: string, userId: string): Promise<{
    state: SessionState;
    session?: OnboardingSession;
    time_remaining?: number;
  }> {
    const session = await getOnboardingSession(sessionId);

    if (!session) {
      return {
        state: {
          is_active: false,
          can_resume: false,
          requires_refresh: false,
          has_expired: false,
          completion_status: 'not_started'
        }
      };
    }

    // Verify ownership
    if (session.user_id !== userId) {
      throw new Error('No autorizado para acceder a esta sesión');
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const hasExpired = now > expiresAt;

    const state: SessionState = {
      is_active: session.status === 'in_progress' && !hasExpired,
      can_resume: session.status === 'in_progress' && !hasExpired,
      requires_refresh: hasExpired && session.status === 'in_progress',
      has_expired: hasExpired,
      completion_status: session.status as any
    };

    const timeRemaining = hasExpired ? 0 : expiresAt.getTime() - now.getTime();

    return {
      state,
      session,
      time_remaining: timeRemaining
    };
  }

  /**
   * Calculate detailed session metrics
   */
  static async calculateSessionMetrics(
    sessionId: string,
    userId: string
  ): Promise<SessionMetrics> {
    const sessionWithProgress = await getOnboardingSessionWithProgress(sessionId);

    if (!sessionWithProgress || sessionWithProgress.user_id !== userId) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    const progress = sessionWithProgress.progress;
    const completedSteps = progress.filter(p => p.completed);

    // Calculate total time spent
    const totalTimeSpent = completedSteps.reduce((total, step) => {
      if (step.completion_time) {
        const start = new Date(step.created_at).getTime();
        const end = new Date(step.completion_time).getTime();
        return total + (end - start);
      }
      return total;
    }, 0);

    // Calculate average step time
    const averageStepTime = completedSteps.length > 0
      ? totalTimeSpent / completedSteps.length
      : 0;

    // Calculate completion velocity (steps per hour)
    const sessionStart = new Date(sessionWithProgress.created_at).getTime();
    const sessionDuration = Date.now() - sessionStart;
    const hoursElapsed = sessionDuration / (1000 * 60 * 60);
    const completionVelocity = hoursElapsed > 0
      ? completedSteps.length / hoursElapsed
      : 0;

    // Determine current momentum
    const recentSteps = progress
      .filter(p => p.completed)
      .sort((a, b) => new Date(b.completion_time!).getTime() - new Date(a.completion_time!).getTime())
      .slice(0, 2);

    let currentMomentum: 'high' | 'medium' | 'low' = 'low';

    if (recentSteps.length >= 2) {
      const timesBetweenSteps = recentSteps.map((step, index) => {
        if (index === recentSteps.length - 1) return 0;
        const current = new Date(step.completion_time!).getTime();
        const next = new Date(recentSteps[index + 1].completion_time!).getTime();
        return current - next;
      }).filter(time => time > 0);

      const avgTimeBetween = timesBetweenSteps.reduce((sum, time) => sum + time, 0) / timesBetweenSteps.length;

      if (avgTimeBetween < 5 * 60 * 1000) { // Less than 5 minutes between steps
        currentMomentum = 'high';
      } else if (avgTimeBetween < 15 * 60 * 1000) { // Less than 15 minutes
        currentMomentum = 'medium';
      }
    }

    // Predict completion time
    const remainingSteps = sessionWithProgress.total_steps - completedSteps.length;
    const predictedCompletionTime = remainingSteps * (averageStepTime / (1000 * 60)); // in minutes

    return {
      total_time_spent: totalTimeSpent,
      average_step_time: averageStepTime,
      completion_velocity: completionVelocity,
      current_momentum: currentMomentum,
      predicted_completion_time: Math.max(predictedCompletionTime, 5) // Minimum 5 minutes
    };
  }

  /**
   * Generate session insights and recommendations
   */
  static async generateSessionInsights(
    sessionId: string,
    userId: string
  ): Promise<SessionInsights> {
    const sessionWithProgress = await getOnboardingSessionWithProgress(sessionId);
    const metrics = await this.calculateSessionMetrics(sessionId, userId);

    if (!sessionWithProgress) {
      throw new Error('Sesión no encontrada');
    }

    const completedSteps = sessionWithProgress.progress.filter(p => p.completed).length;
    const totalSteps = sessionWithProgress.total_steps;
    const completionRate = (completedSteps / totalSteps) * 100;

    const insights: SessionInsights = {
      progress_assessment: '',
      bottlenecks: [],
      recommendations: [],
      risk_factors: [],
      success_indicators: []
    };

    // Progress assessment
    if (completionRate >= 80) {
      insights.progress_assessment = '¡Excelente progreso! Estás muy cerca de completar el onboarding.';
      insights.success_indicators.push('Alta tasa de completación');
    } else if (completionRate >= 50) {
      insights.progress_assessment = 'Buen progreso. Vas por la mitad del proceso de configuración.';
      insights.success_indicators.push('Progreso constante y sostenido');
    } else if (completionRate >= 20) {
      insights.progress_assessment = 'Has comenzado bien. Continúa para obtener el máximo beneficio.';
    } else {
      insights.progress_assessment = 'Es un buen momento para avanzar con la configuración.';
      insights.risk_factors.push('Progreso inicial lento podría indicar falta de claridad');
    }

    // Analyze time patterns
    if (metrics.average_step_time > 10 * 60 * 1000) { // More than 10 minutes per step
      insights.bottlenecks.push('Tiempo excesivo por paso - considera revisar la claridad de las instrucciones');
      insights.recommendations.push('Usa las sugerencias de IA para acelerar la completación');
    }

    if (metrics.total_time_spent < 5 * 60 * 1000) { // Less than 5 minutes total
      insights.risk_factors.push('Tiempo muy corto podría indicar información incompleta');
      insights.recommendations.push('Asegúrate de proporcionar información detallada para mejores recomendaciones');
    }

    // Momentum analysis
    if (metrics.current_momentum === 'high') {
      insights.success_indicators.push('Momentum alto - completación rápida y eficiente');
      insights.recommendations.push('Mantén el ritmo actual para completar pronto');
    } else if (metrics.current_momentum === 'low') {
      insights.bottlenecks.push('Momentum bajo en los últimos pasos');
      insights.recommendations.push('Considera tomar un descanso y continuar con energía renovada');
    }

    // Completion velocity analysis
    if (metrics.completion_velocity > 2) { // More than 2 steps per hour
      insights.success_indicators.push('Velocidad de completación excelente');
    } else if (metrics.completion_velocity < 0.5) { // Less than 0.5 steps per hour
      insights.bottlenecks.push('Velocidad de completación muy baja');
      insights.recommendations.push('Considera usar las opciones de auto-completado de IA');
    }

    // Session age analysis
    const sessionAge = Date.now() - new Date(sessionWithProgress.created_at).getTime();
    const daysOld = sessionAge / (1000 * 60 * 60 * 24);

    if (daysOld > 3) {
      insights.risk_factors.push('Sesión antigua - la información podría haber cambiado');
      insights.recommendations.push('Revisa y actualiza la información si es necesaria');
    }

    // Step skipping analysis
    const skippedSteps = sessionWithProgress.progress.filter(p => p.skipped).length;
    if (skippedSteps > 0) {
      insights.risk_factors.push(`${skippedSteps} paso(s) omitido(s) - podría afectar la calidad de recomendaciones`);
      insights.recommendations.push('Considera completar los pasos omitidos para mejores resultados');
    }

    return insights;
  }

  /**
   * Extend session expiration
   */
  static async extendSession(
    sessionId: string,
    userId: string,
    additionalHours: number = 24
  ): Promise<OnboardingSession> {
    const { state, session } = await this.getSessionState(sessionId, userId);

    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    if (state.completion_status === 'completed') {
      throw new Error('No se puede extender una sesión completada');
    }

    if (state.completion_status === 'abandoned') {
      throw new Error('No se puede extender una sesión abandonada');
    }

    const newExpirationTime = new Date();
    newExpirationTime.setHours(newExpirationTime.getHours() + additionalHours);

    return await updateOnboardingSession(sessionId, {
      expires_at: newExpirationTime.toISOString()
    });
  }

  /**
   * Pause session (extend expiration significantly)
   */
  static async pauseSession(
    sessionId: string,
    userId: string,
    pauseReason?: string
  ): Promise<OnboardingSession> {
    const session = await this.extendSession(sessionId, userId, 168); // 7 days

    return await updateOnboardingSession(sessionId, {
      ai_analysis: {
        ...session.ai_analysis,
        paused_at: new Date().toISOString(),
        pause_reason: pauseReason || 'Usuario pausó la sesión',
        pause_count: (session.ai_analysis?.pause_count || 0) + 1
      }
    });
  }

  /**
   * Resume paused session
   */
  static async resumeSession(
    sessionId: string,
    userId: string
  ): Promise<OnboardingSession> {
    const { session } = await this.getSessionState(sessionId, userId);

    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    // Reset expiration to normal duration
    const newExpirationTime = new Date();
    newExpirationTime.setDate(newExpirationTime.getDate() + 7); // 7 days from now

    return await updateOnboardingSession(sessionId, {
      expires_at: newExpirationTime.toISOString(),
      ai_analysis: {
        ...session.ai_analysis,
        resumed_at: new Date().toISOString(),
        pause_duration: session.ai_analysis?.paused_at
          ? Date.now() - new Date(session.ai_analysis.paused_at).getTime()
          : 0
      }
    });
  }

  /**
   * Transfer session to another user
   */
  static async transferSession(
    sessionId: string,
    currentUserId: string,
    newUserId: string,
    transferReason?: string
  ): Promise<OnboardingSession> {
    const { session } = await this.getSessionState(sessionId, currentUserId);

    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    if (session.status === 'completed') {
      throw new Error('No se puede transferir una sesión completada');
    }

    return await updateOnboardingSession(sessionId, {
      user_id: newUserId,
      ai_analysis: {
        ...session.ai_analysis,
        transferred_at: new Date().toISOString(),
        transferred_from: currentUserId,
        transferred_to: newUserId,
        transfer_reason: transferReason || 'Transferencia de sesión'
      }
    });
  }

  /**
   * Get session history for a user
   */
  static async getUserSessionHistory(
    userId: string,
    limit: number = 10
  ): Promise<Array<OnboardingSession & {
    metrics?: SessionMetrics;
    final_completion_rate?: number;
  }>> {
    // This would require a database query to get user's session history
    // For now, we'll return an empty array as placeholder

    return [];
  }

  /**
   * Generate session performance report
   */
  static async generateSessionReport(
    sessionId: string,
    userId: string
  ): Promise<{
    session: OnboardingSessionWithProgress;
    metrics: SessionMetrics;
    insights: SessionInsights;
    timeline: Array<{
      timestamp: string;
      event: string;
      duration?: number;
      details?: Record<string, any>;
    }>;
  }> {
    const session = await getOnboardingSessionWithProgress(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    const metrics = await this.calculateSessionMetrics(sessionId, userId);
    const insights = await this.generateSessionInsights(sessionId, userId);

    // Build timeline
    const timeline = [
      {
        timestamp: session.created_at,
        event: 'Sesión iniciada',
        details: { initial_step: 1 }
      }
    ];

    session.progress.forEach(progress => {
      timeline.push({
        timestamp: progress.created_at,
        event: `Paso ${progress.step_number} (${progress.step_name}) iniciado`
      });

      if (progress.completion_time) {
        const duration = new Date(progress.completion_time).getTime() - new Date(progress.created_at).getTime();
        timeline.push({
          timestamp: progress.completion_time,
          event: `Paso ${progress.step_number} ${progress.completed ? 'completado' : 'omitido'}`,
          duration,
          details: {
            step_name: progress.step_name,
            completed: progress.completed,
            skipped: progress.skipped
          }
        });
      }
    });

    if (session.completed_at) {
      timeline.push({
        timestamp: session.completed_at,
        event: 'Onboarding completado',
        details: { completion_percentage: session.completion_percentage }
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      session,
      metrics,
      insights,
      timeline
    };
  }

  /**
   * Cleanup and archive old sessions
   */
  static async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    // This would typically be run as a background job
    // Returns number of sessions cleaned up

    return 0; // Placeholder
  }
}