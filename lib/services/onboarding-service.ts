import {
  createOnboardingSession,
  getUserActiveSession,
  getOnboardingSessionWithProgress,
  updateOnboardingSession,
  completeOnboardingSession,
  createOnboardingProgress,
  updateProgressStep,
  getProgressStep,
  cleanupExpiredSessions
} from '@/lib/database/onboarding-queries';
import type {
  OnboardingSession,
  OnboardingProgress,
  OnboardingFormData,
  OnboardingStepInfo,
  CreateOnboardingSessionRequest,
  UpdateProgressRequest,
  CompleteOnboardingRequest
} from '@/lib/database/onboarding-types';

export class OnboardingService {

  /**
   * Initialize a new onboarding session or resume existing one
   */
  static async initializeSession(
    userId: string,
    preferences?: CreateOnboardingSessionRequest
  ): Promise<{
    session: OnboardingSession;
    isResume: boolean;
    currentStep: OnboardingStepInfo;
  }> {
    // Check for existing active session
    const existingSession = await getUserActiveSession(userId);

    if (existingSession && !preferences?.restart) {
      // Resume existing session
      const currentStep = this.getStepInfo(existingSession.current_step);

      return {
        session: existingSession,
        isResume: true,
        currentStep
      };
    }

    // Create new session
    if (existingSession && preferences?.restart) {
      // Mark existing as abandoned
      await updateOnboardingSession(existingSession.id, { status: 'abandoned' });
    }

    const newSession = await createOnboardingSession(userId, 5);

    // Initialize first step
    await createOnboardingProgress(newSession.id, 1, 'welcome');

    // Store preferences if provided
    if (preferences?.user_preferences || preferences?.context) {
      await updateOnboardingSession(newSession.id, {
        form_data: {
          user_preferences: preferences.user_preferences,
          context: preferences.context
        }
      });
    }

    const currentStep = this.getStepInfo(1);

    return {
      session: newSession,
      isResume: false,
      currentStep
    };
  }

  /**
   * Update progress for a specific step
   */
  static async updateStepProgress(
    userId: string,
    sessionId: string,
    stepNumber: number,
    stepData: Record<string, any>,
    completed: boolean = false,
    skipped: boolean = false
  ): Promise<{
    progress: OnboardingProgress;
    session: OnboardingSession;
    nextStep?: OnboardingStepInfo;
    validationErrors?: string[];
  }> {
    // Verify session ownership
    const session = await getOnboardingSessionWithProgress(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    if (session.status !== 'in_progress') {
      throw new Error('La sesión no está activa');
    }

    // Validate step data
    const validation = this.validateStepData(stepNumber, stepData);
    const isValid = validation.errors.length === 0;

    // Get or create progress record
    const stepName = this.getStepName(stepNumber);
    let progress = await getProgressStep(sessionId, stepNumber);

    if (!progress) {
      progress = await createOnboardingProgress(
        sessionId,
        stepNumber,
        stepName,
        stepData,
        completed && isValid,
        skipped
      );
    } else {
      progress = await updateProgressStep(sessionId, stepNumber, {
        step_data: stepData,
        completed: completed && isValid,
        skipped,
        ai_validation: {
          is_valid: isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          validated_at: new Date().toISOString()
        }
      });
    }

    // Update session
    const updatedFormData = {
      ...session.form_data,
      [stepName]: stepData
    };

    let nextStepNumber = session.current_step;
    if ((completed || skipped) && isValid && stepNumber === session.current_step) {
      nextStepNumber = Math.min(stepNumber + 1, session.total_steps);
    }

    const completionPercentage = (stepNumber / session.total_steps) * 100;

    const updatedSession = await updateOnboardingSession(sessionId, {
      current_step: nextStepNumber,
      form_data: updatedFormData,
      completion_percentage: Math.max(session.completion_percentage, completionPercentage)
    });

    const result: any = {
      progress,
      session: updatedSession
    };

    if (nextStepNumber > stepNumber && nextStepNumber <= session.total_steps) {
      result.nextStep = this.getStepInfo(nextStepNumber);
    }

    if (!isValid) {
      result.validationErrors = validation.errors;
    }

    return result;
  }

  /**
   * Complete the onboarding process
   */
  static async completeOnboarding(
    userId: string,
    sessionId: string,
    finalData?: Record<string, any>
  ): Promise<{
    session: OnboardingSession;
    summary: string;
    recommendations: any[];
    nextSteps: string[];
  }> {
    // Get session with progress
    const sessionWithProgress = await getOnboardingSessionWithProgress(sessionId);
    if (!sessionWithProgress || sessionWithProgress.user_id !== userId) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    if (sessionWithProgress.status !== 'in_progress') {
      throw new Error('La sesión ya está completada');
    }

    // Verify all steps are completed
    const completedSteps = sessionWithProgress.progress.filter(p => p.completed).length;
    if (completedSteps < sessionWithProgress.total_steps) {
      throw new Error(`Faltan ${sessionWithProgress.total_steps - completedSteps} pasos por completar`);
    }

    // Merge final data
    const formData: OnboardingFormData = sessionWithProgress.form_data as OnboardingFormData;
    if (finalData) {
      Object.assign(formData, finalData);
    }

    // Complete the session
    const completedSession = await completeOnboardingSession(sessionId);

    // Generate completion summary and recommendations
    const summary = this.generateCompletionSummary(formData);
    const recommendations = this.generateRecommendations(formData);
    const nextSteps = this.generateNextSteps(formData);

    return {
      session: completedSession,
      summary,
      recommendations,
      nextSteps
    };
  }

  /**
   * Get session analytics and insights
   */
  static async getSessionAnalytics(
    userId: string,
    sessionId: string
  ): Promise<{
    completionRate: number;
    timeSpent: number;
    stepAnalytics: Array<{
      stepNumber: number;
      stepName: string;
      completed: boolean;
      timeSpent: number;
      attempts: number;
    }>;
    insights: string[];
  }> {
    const session = await getOnboardingSessionWithProgress(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    const completedSteps = session.progress.filter(p => p.completed).length;
    const completionRate = (completedSteps / session.total_steps) * 100;

    const totalTime = session.progress.reduce((total, progress) => {
      if (progress.completion_time) {
        const start = new Date(progress.created_at).getTime();
        const end = new Date(progress.completion_time).getTime();
        return total + (end - start);
      }
      return total;
    }, 0);

    const stepAnalytics = session.progress.map(progress => ({
      stepNumber: progress.step_number,
      stepName: progress.step_name,
      completed: progress.completed,
      timeSpent: progress.completion_time
        ? new Date(progress.completion_time).getTime() - new Date(progress.created_at).getTime()
        : 0,
      attempts: 1 // Could be enhanced to track multiple attempts
    }));

    const insights = this.generateSessionInsights(session, stepAnalytics);

    return {
      completionRate,
      timeSpent: totalTime,
      stepAnalytics,
      insights
    };
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    return await cleanupExpiredSessions();
  }

  /**
   * Get step configuration
   */
  static getStepInfo(stepNumber: number): OnboardingStepInfo {
    const stepConfigs: Record<number, OnboardingStepInfo> = {
      1: {
        step_number: 1,
        step_name: 'welcome',
        title: 'Bienvenido a StratixV2',
        description: 'Cuéntanos sobre ti y tu experiencia con OKRs.',
        fields: [
          { name: 'full_name', type: 'text', label: 'Nombre completo', required: true },
          { name: 'job_title', type: 'text', label: 'Cargo', required: true },
          { name: 'experience_with_okr', type: 'select', label: 'Experiencia con OKRs', required: true, options: [] },
          { name: 'primary_goal', type: 'textarea', label: 'Objetivo principal', required: true },
          { name: 'urgency_level', type: 'select', label: 'Nivel de urgencia', required: true, options: [] }
        ],
        estimated_time: 3
      },
      2: {
        step_number: 2,
        step_name: 'company',
        title: 'Información de tu empresa',
        description: 'Ayúdanos a entender tu contexto empresarial.',
        fields: [
          { name: 'company_name', type: 'text', label: 'Nombre de la empresa', required: true },
          { name: 'industry_id', type: 'select', label: 'Industria', required: false, options: [] },
          { name: 'company_size', type: 'select', label: 'Tamaño de empresa', required: true, options: [] },
          { name: 'description', type: 'textarea', label: 'Descripción', required: true },
          { name: 'country', type: 'text', label: 'País', required: true }
        ],
        estimated_time: 4
      },
      3: {
        step_number: 3,
        step_name: 'organization',
        title: 'Estructura organizacional',
        description: 'Información sobre tu organización y objetivos.',
        fields: [
          { name: 'okr_maturity', type: 'select', label: 'Madurez OKR', required: true, options: [] },
          { name: 'current_challenges', type: 'multiselect', label: 'Desafíos actuales', required: true, options: [] },
          { name: 'business_goals', type: 'multiselect', label: 'Objetivos de negocio', required: true, options: [] }
        ],
        estimated_time: 5
      },
      4: {
        step_number: 4,
        step_name: 'preferences',
        title: 'Preferencias del sistema',
        description: 'Personaliza tu experiencia.',
        fields: [
          { name: 'communication_style', type: 'select', label: 'Estilo de comunicación', required: true, options: [] },
          { name: 'language', type: 'select', label: 'Idioma', required: true, options: [] },
          { name: 'ai_assistance_level', type: 'select', label: 'Nivel de asistencia IA', required: true, options: [] }
        ],
        estimated_time: 3
      },
      5: {
        step_number: 5,
        step_name: 'review',
        title: 'Revisión y confirmación',
        description: 'Revisa y confirma tu información.',
        fields: [
          { name: 'confirmed', type: 'select', label: 'Confirmar información', required: true, options: [] },
          { name: 'additional_notes', type: 'textarea', label: 'Notas adicionales', required: false }
        ],
        estimated_time: 2
      }
    };

    const config = stepConfigs[stepNumber];
    if (!config) {
      throw new Error(`Configuración no encontrada para el paso ${stepNumber}`);
    }

    return config;
  }

  /**
   * Get step name by number
   */
  static getStepName(stepNumber: number): string {
    const names: Record<number, string> = {
      1: 'welcome',
      2: 'company',
      3: 'organization',
      4: 'preferences',
      5: 'review'
    };
    return names[stepNumber] || `step_${stepNumber}`;
  }

  /**
   * Validate step data
   */
  static validateStepData(stepNumber: number, stepData: Record<string, any>): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (stepNumber) {
      case 1:
        if (!stepData.full_name?.trim()) errors.push('Nombre completo requerido');
        if (!stepData.job_title?.trim()) errors.push('Cargo requerido');
        if (!stepData.experience_with_okr) errors.push('Experiencia con OKRs requerida');
        if (!stepData.primary_goal?.trim()) errors.push('Objetivo principal requerido');
        if (!stepData.urgency_level) errors.push('Nivel de urgencia requerido');
        break;

      case 2:
        if (!stepData.company_name?.trim()) errors.push('Nombre de empresa requerido');
        if (!stepData.company_size) errors.push('Tamaño de empresa requerido');
        if (!stepData.description?.trim()) errors.push('Descripción requerida');
        if (!stepData.country?.trim()) errors.push('País requerido');
        if (stepData.website && !stepData.website.match(/^https?:\/\/.+/)) {
          warnings.push('El sitio web debe incluir http:// o https://');
        }
        break;

      case 3:
        if (!stepData.okr_maturity) errors.push('Madurez OKR requerida');
        if (!stepData.current_challenges?.length) errors.push('Selecciona al menos un desafío');
        if (!stepData.business_goals?.length) errors.push('Selecciona al menos un objetivo');
        break;

      case 4:
        if (!stepData.communication_style) errors.push('Estilo de comunicación requerido');
        if (!stepData.language) errors.push('Idioma requerido');
        if (!stepData.ai_assistance_level) errors.push('Nivel de asistencia IA requerido');
        break;

      case 5:
        if (stepData.confirmed !== 'true') errors.push('Debe confirmar la información');
        break;
    }

    return { errors, warnings };
  }

  /**
   * Generate completion summary
   */
  private static generateCompletionSummary(formData: OnboardingFormData): string {
    const welcome = formData.welcome;
    const company = formData.company;

    return `¡Felicitaciones ${welcome?.full_name}! Has completado exitosamente la configuración de StratixV2 para ${company?.company_name}. Tu experiencia está personalizada según tus preferencias y objetivos empresariales.`;
  }

  /**
   * Generate recommendations based on form data
   */
  private static generateRecommendations(formData: OnboardingFormData): any[] {
    const recommendations = [];
    const experience = formData.welcome?.experience_with_okr;
    const companySize = formData.company?.company_size;

    if (experience === 'none') {
      recommendations.push({
        type: 'learning',
        title: 'Comienza con OKRs básicos',
        description: 'Te recomendamos empezar con 1-2 objetivos simples',
        priority: 'high'
      });
    }

    if (companySize === 'startup') {
      recommendations.push({
        type: 'strategy',
        title: 'Enfoque en métricas de crecimiento',
        description: 'Para startups, prioriza métricas de tracción y validación',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps
   */
  private static generateNextSteps(formData: OnboardingFormData): string[] {
    const steps = [
      'Revisa los OKRs sugeridos para tu industria',
      'Configura tu primer objetivo en el dashboard',
      'Invita a tu equipo a colaborar'
    ];

    if (formData.preferences?.ai_assistance_level === 'extensive') {
      steps.unshift('Activa las notificaciones de IA para sugerencias proactivas');
    }

    return steps;
  }

  /**
   * Generate session insights
   */
  private static generateSessionInsights(
    session: any,
    stepAnalytics: any[]
  ): string[] {
    const insights = [];
    const avgTime = stepAnalytics.reduce((sum, step) => sum + step.timeSpent, 0) / stepAnalytics.length;

    if (avgTime < 2 * 60 * 1000) { // Less than 2 minutes per step
      insights.push('Completaste el onboarding muy rápidamente. Asegúrate de haber proporcionado información detallada.');
    }

    if (session.completion_percentage === 100) {
      insights.push('¡Excelente! Completaste todos los pasos del onboarding.');
    }

    const skippedSteps = stepAnalytics.filter(step => !step.completed).length;
    if (skippedSteps > 0) {
      insights.push(`Hay ${skippedSteps} pasos sin completar que podrían mejorar tu experiencia.`);
    }

    return insights;
  }
}