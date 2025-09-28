/**
 * Session State Manager for Multi-Step Onboarding Wizard
 * Manages user session state across the onboarding process with
 * Redis persistence, automatic cleanup, and state recovery
 */

import { randomUUID } from 'crypto';
import { onboardingCache } from '@/lib/cache/redis';
import { getOnboardingStepsFromEdge, isFeatureEnabled } from '@/lib/cache/edge-config';
import { ONBOARDING_STEPS, isValidStep, getNextStepNumber, isOnboardingComplete } from '@/lib/config/onboarding-config';
import type { OnboardingStepInfo } from '@/lib/database/onboarding-types';

export interface SessionState {
  sessionId: string;
  userId: string;
  currentStep: number;
  completedSteps: number[];
  stepData: Record<number, Record<string, any>>;
  startedAt: number;
  lastActivity: number;
  estimatedTimeRemaining: number;
  preferences: SessionPreferences;
  flags: SessionFlags;
  metadata: SessionMetadata;
}

export interface SessionPreferences {
  language: 'es' | 'en';
  communicationStyle: 'formal' | 'informal';
  aiAssistanceLevel: 'minimal' | 'moderate' | 'extensive';
  autoSave: boolean;
  notifications: boolean;
}

export interface SessionFlags {
  isPaused: boolean;
  isCompleted: boolean;
  hasErrors: boolean;
  needsValidation: boolean;
  isExpired: boolean;
  forceRefresh: boolean;
}

export interface SessionMetadata {
  userAgent: string;
  ipAddress: string;
  referrer?: string;
  utm?: Record<string, string>;
  experimentGroup?: string;
  version: string;
}

export interface StepTransition {
  fromStep: number;
  toStep: number;
  direction: 'forward' | 'backward';
  triggeredBy: 'user' | 'system' | 'timeout';
  timestamp: number;
  reason?: string;
}

export interface SessionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
  suggestions: string[];
}

export class OnboardingSessionManager {
  private static instance: OnboardingSessionManager;
  private readonly SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours
  private readonly INACTIVITY_WARNING = 15 * 60 * 1000; // 15 minutes
  private readonly AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds
  private activeSessions = new Map<string, NodeJS.Timeout>();
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.startCleanupScheduler();
  }

  public static getInstance(): OnboardingSessionManager {
    if (!OnboardingSessionManager.instance) {
      OnboardingSessionManager.instance = new OnboardingSessionManager();
    }
    return OnboardingSessionManager.instance;
  }

  /**
   * Create new onboarding session
   */
  public async createSession(
    userId: string,
    metadata: SessionMetadata,
    preferences?: Partial<SessionPreferences>
  ): Promise<SessionState> {
    try {
      // Check if user has an existing active session
      const existingSessionId = await onboardingCache.getUserCurrentSession(userId);
      if (existingSessionId) {
        const existing = await this.getSession(existingSessionId);
        if (existing && !existing.flags.isExpired) {
          console.log(`Returning existing session for user: ${userId}`);
          return existing;
        }
      }

      const sessionId = randomUUID();
      const now = Date.now();

      const defaultPreferences: SessionPreferences = {
        language: 'es',
        communicationStyle: 'informal',
        aiAssistanceLevel: 'moderate',
        autoSave: true,
        notifications: true,
        ...preferences
      };

      const session: SessionState = {
        sessionId,
        userId,
        currentStep: 1,
        completedSteps: [],
        stepData: {},
        startedAt: now,
        lastActivity: now,
        estimatedTimeRemaining: this.calculateEstimatedTime(),
        preferences: defaultPreferences,
        flags: {
          isPaused: false,
          isCompleted: false,
          hasErrors: false,
          needsValidation: false,
          isExpired: false,
          forceRefresh: false
        },
        metadata: {
          ...metadata,
          version: '1.0'
        }
      };

      // Store in cache
      await onboardingCache.setOnboardingSession(sessionId, userId, session);

      // Set up auto-save if enabled
      if (defaultPreferences.autoSave) {
        this.setupAutoSave(sessionId);
      }

      // Set up session cleanup timer
      this.scheduleSessionCleanup(sessionId);

      console.log(`Created new onboarding session: ${sessionId} for user: ${userId}`);
      return session;
    } catch (error) {
      console.error('Failed to create onboarding session:', error);
      throw new Error('Failed to create onboarding session');
    }
  }

  /**
   * Get existing session
   */
  public async getSession(sessionId: string): Promise<SessionState | null> {
    try {
      const cached = await onboardingCache.getOnboardingSession(sessionId);
      if (!cached) return null;

      // Convert cache entry to session state
      const session: SessionState = {
        sessionId: cached.sessionId,
        userId: cached.userId,
        currentStep: cached.currentStep,
        completedSteps: cached.completedSteps,
        stepData: this.parseStepData(cached.stepData),
        startedAt: cached.timestamp,
        lastActivity: cached.timestamp,
        estimatedTimeRemaining: this.calculateRemainingTime(cached.completedSteps, cached.currentStep),
        preferences: this.getDefaultPreferences(),
        flags: this.determineFlags(cached),
        metadata: {
          userAgent: '',
          ipAddress: '',
          version: cached.version || '1.0'
        }
      };

      // Check if session is expired
      if (this.isSessionExpired(session)) {
        session.flags.isExpired = true;
        await this.expireSession(sessionId);
        return session;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session with new step data
   */
  public async updateSession(
    sessionId: string,
    updates: {
      currentStep?: number;
      stepData?: Record<string, any>;
      preferences?: Partial<SessionPreferences>;
      flags?: Partial<SessionFlags>;
    }
  ): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.flags.isExpired) {
        throw new Error('Session not found or expired');
      }

      const now = Date.now();

      // Update current step if provided
      if (updates.currentStep !== undefined) {
        if (!isValidStep(updates.currentStep)) {
          throw new Error(`Invalid step number: ${updates.currentStep}`);
        }
        session.currentStep = updates.currentStep;
      }

      // Update step data
      if (updates.stepData && session.currentStep) {
        session.stepData[session.currentStep] = {
          ...session.stepData[session.currentStep],
          ...updates.stepData
        };

        // Mark step as completed if it has required data
        if (!session.completedSteps.includes(session.currentStep)) {
          const isComplete = await this.validateStepCompletion(session.currentStep, updates.stepData);
          if (isComplete) {
            session.completedSteps.push(session.currentStep);
            session.completedSteps.sort((a, b) => a - b);
          }
        }
      }

      // Update preferences
      if (updates.preferences) {
        session.preferences = { ...session.preferences, ...updates.preferences };
      }

      // Update flags
      if (updates.flags) {
        session.flags = { ...session.flags, ...updates.flags };
      }

      // Update timestamps and estimated time
      session.lastActivity = now;
      session.estimatedTimeRemaining = this.calculateRemainingTime(session.completedSteps, session.currentStep);

      // Check if onboarding is complete
      if (isOnboardingComplete(session.completedSteps)) {
        session.flags.isCompleted = true;
      }

      // Store updated session
      await onboardingCache.updateSessionProgress(
        sessionId,
        session.userId,
        session.currentStep,
        session.stepData,
        session.completedSteps
      );

      console.debug(`Session updated: ${sessionId}, current step: ${session.currentStep}`);
      return session;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }

  /**
   * Navigate to next step
   */
  public async goToNextStep(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.flags.isExpired) {
        throw new Error('Session not found or expired');
      }

      const nextStep = getNextStepNumber(session.currentStep);
      if (!nextStep) {
        session.flags.isCompleted = true;
        await this.updateSession(sessionId, { flags: { isCompleted: true } });
        return session;
      }

      // Validate current step before proceeding
      const currentStepData = session.stepData[session.currentStep] || {};
      const validation = await this.validateStep(session.currentStep, currentStepData);

      if (!validation.canProceed) {
        session.flags.hasErrors = true;
        session.flags.needsValidation = true;
        await this.updateSession(sessionId, {
          flags: { hasErrors: true, needsValidation: true }
        });
        throw new Error(`Cannot proceed: ${validation.errors.join(', ')}`);
      }

      // Record transition
      await this.recordStepTransition(sessionId, {
        fromStep: session.currentStep,
        toStep: nextStep,
        direction: 'forward',
        triggeredBy: 'user',
        timestamp: Date.now()
      });

      return await this.updateSession(sessionId, { currentStep: nextStep });
    } catch (error) {
      console.error('Failed to go to next step:', error);
      throw error;
    }
  }

  /**
   * Navigate to previous step
   */
  public async goToPreviousStep(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.flags.isExpired) {
        throw new Error('Session not found or expired');
      }

      const previousStep = session.currentStep - 1;
      if (previousStep < 1) {
        throw new Error('Already at first step');
      }

      // Record transition
      await this.recordStepTransition(sessionId, {
        fromStep: session.currentStep,
        toStep: previousStep,
        direction: 'backward',
        triggeredBy: 'user',
        timestamp: Date.now()
      });

      return await this.updateSession(sessionId, { currentStep: previousStep });
    } catch (error) {
      console.error('Failed to go to previous step:', error);
      throw error;
    }
  }

  /**
   * Pause session
   */
  public async pauseSession(sessionId: string, reason?: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      await this.updateSession(sessionId, {
        flags: { isPaused: true }
      });

      // Stop auto-save
      this.stopAutoSave(sessionId);

      console.log(`Session paused: ${sessionId}, reason: ${reason || 'user request'}`);
      return true;
    } catch (error) {
      console.error('Failed to pause session:', error);
      return false;
    }
  }

  /**
   * Resume session
   */
  public async resumeSession(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return null;

      if (this.isSessionExpired(session)) {
        await this.expireSession(sessionId);
        throw new Error('Session has expired');
      }

      const updated = await this.updateSession(sessionId, {
        flags: { isPaused: false }
      });

      // Restart auto-save if enabled
      if (updated && updated.preferences.autoSave) {
        this.setupAutoSave(sessionId);
      }

      console.log(`Session resumed: ${sessionId}`);
      return updated;
    } catch (error) {
      console.error('Failed to resume session:', error);
      throw error;
    }
  }

  /**
   * Complete session
   */
  public async completeSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      // Validate all steps are completed
      if (!isOnboardingComplete(session.completedSteps)) {
        throw new Error('Cannot complete session: not all steps are completed');
      }

      await this.updateSession(sessionId, {
        flags: { isCompleted: true }
      });

      // Clean up timers
      this.stopAutoSave(sessionId);
      this.clearSessionCleanup(sessionId);

      console.log(`Session completed: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to complete session:', error);
      return false;
    }
  }

  /**
   * Expire session
   */
  public async expireSession(sessionId: string): Promise<void> {
    try {
      await this.updateSession(sessionId, {
        flags: { isExpired: true }
      });

      // Clean up timers
      this.stopAutoSave(sessionId);
      this.clearSessionCleanup(sessionId);

      console.log(`Session expired: ${sessionId}`);
    } catch (error) {
      console.error('Failed to expire session:', error);
    }
  }

  /**
   * Delete session completely
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      await onboardingCache.deleteOnboardingSession(sessionId, session.userId);

      // Clean up timers
      this.stopAutoSave(sessionId);
      this.clearSessionCleanup(sessionId);

      console.log(`Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Update session activity timestamp
   */
  public static async updateActivity(sessionId: string): Promise<void> {
    try {
      const instance = OnboardingSessionManager.getInstance();
      const session = await instance.getSession(sessionId);

      if (session) {
        await instance.updateSession(sessionId, {
          lastActivity: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Validate step completion
   */
  private async validateStepCompletion(stepNumber: number, stepData: Record<string, any>): Promise<boolean> {
    try {
      const steps = await getOnboardingStepsFromEdge();
      const stepInfo = steps[stepNumber];

      if (!stepInfo) return false;

      // Check required fields
      const requiredFields = stepInfo.fields.filter(field => field.required);
      return requiredFields.every(field => {
        const value = stepData[field.name];
        return value !== undefined && value !== null && value !== '';
      });
    } catch (error) {
      console.error('Failed to validate step completion:', error);
      return false;
    }
  }

  /**
   * Validate step data
   */
  public async validateStep(stepNumber: number, stepData: Record<string, any>): Promise<SessionValidation> {
    try {
      const steps = await getOnboardingStepsFromEdge();
      const stepInfo = steps[stepNumber];

      if (!stepInfo) {
        return {
          isValid: false,
          errors: [`Invalid step number: ${stepNumber}`],
          warnings: [],
          canProceed: false,
          suggestions: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Validate required fields
      const requiredFields = stepInfo.fields.filter(field => field.required);
      for (const field of requiredFields) {
        const value = stepData[field.name];
        if (value === undefined || value === null || value === '') {
          errors.push(`Field '${field.label}' is required`);
        }
      }

      // Validate field types and constraints
      for (const field of stepInfo.fields) {
        const value = stepData[field.name];
        if (value === undefined || value === null) continue;

        if (field.type === 'email' && !/\S+@\S+\.\S+/.test(value)) {
          errors.push(`Field '${field.label}' must be a valid email`);
        }

        if (field.type === 'number' && isNaN(Number(value))) {
          errors.push(`Field '${field.label}' must be a number`);
        }

        if (field.validation) {
          if (field.validation.min !== undefined && Number(value) < field.validation.min) {
            errors.push(`Field '${field.label}' must be at least ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && Number(value) > field.validation.max) {
            errors.push(`Field '${field.label}' must be at most ${field.validation.max}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        canProceed: errors.length === 0,
        suggestions
      };
    } catch (error) {
      console.error('Failed to validate step:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: [],
        canProceed: false,
        suggestions: []
      };
    }
  }

  /**
   * Private utility methods
   */

  private parseStepData(stepData: Record<string, any>): Record<number, Record<string, any>> {
    const parsed: Record<number, Record<string, any>> = {};
    for (const [key, value] of Object.entries(stepData)) {
      const stepNumber = parseInt(key);
      if (!isNaN(stepNumber)) {
        parsed[stepNumber] = value;
      }
    }
    return parsed;
  }

  private getDefaultPreferences(): SessionPreferences {
    return {
      language: 'es',
      communicationStyle: 'informal',
      aiAssistanceLevel: 'moderate',
      autoSave: true,
      notifications: true
    };
  }

  private determineFlags(cached: any): SessionFlags {
    return {
      isPaused: false,
      isCompleted: false,
      hasErrors: false,
      needsValidation: false,
      isExpired: cached.expiresAt <= Date.now(),
      forceRefresh: false
    };
  }

  private isSessionExpired(session: SessionState): boolean {
    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    return timeSinceLastActivity > this.SESSION_TTL;
  }

  private calculateEstimatedTime(): number {
    // Calculate based on step estimates from config
    const steps = Object.values(ONBOARDING_STEPS);
    return steps.reduce((total, step) => total + (step.estimated_time || 5), 0);
  }

  private calculateRemainingTime(completedSteps: number[], currentStep: number): number {
    const steps = Object.values(ONBOARDING_STEPS);
    const remaining = steps.slice(currentStep - 1);
    return remaining.reduce((total, step) => total + (step.estimated_time || 5), 0);
  }

  private async recordStepTransition(sessionId: string, transition: StepTransition): Promise<void> {
    try {
      // This could be expanded to store transition history for analytics
      console.debug(`Step transition recorded for ${sessionId}:`, transition);
    } catch (error) {
      console.error('Failed to record step transition:', error);
    }
  }

  private setupAutoSave(sessionId: string): void {
    if (this.autoSaveTimers.has(sessionId)) {
      clearInterval(this.autoSaveTimers.get(sessionId)!);
    }

    const timer = setInterval(async () => {
      try {
        const session = await this.getSession(sessionId);
        if (session && !session.flags.isExpired && !session.flags.isPaused) {
          // Auto-save is handled by updateSession calls
          console.debug(`Auto-save check for session: ${sessionId}`);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.AUTO_SAVE_INTERVAL);

    this.autoSaveTimers.set(sessionId, timer);
  }

  private stopAutoSave(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  private scheduleSessionCleanup(sessionId: string): void {
    const timer = setTimeout(async () => {
      await this.expireSession(sessionId);
    }, this.SESSION_TTL);

    this.activeSessions.set(sessionId, timer);
  }

  private clearSessionCleanup(sessionId: string): void {
    const timer = this.activeSessions.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeSessions.delete(sessionId);
    }
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      console.log('Running expired session cleanup...');
      // This would require querying Redis for expired sessions
      // For now, we rely on Redis TTL for cleanup
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = OnboardingSessionManager.getInstance();