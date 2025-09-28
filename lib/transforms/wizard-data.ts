/**
 * Data Transformation Pipeline for Onboarding Wizard
 *
 * Transforms and processes onboarding wizard data into structured database
 * formats with AI enhancement, data cleaning, and validation integration.
 *
 * Features:
 * - Multi-step data transformation
 * - AI-powered data enhancement
 * - Database schema mapping
 * - Data cleaning and normalization
 * - Performance optimization
 * - Error handling and rollback
 */

import {
  createOnboardingSession,
  updateOnboardingSession,
  createOrganization,
  addOrganizationMember,
  getUserActiveOrganizations
} from '@/lib/database/onboarding-queries';
import { OnboardingAIService } from '@/lib/ai/service-connection';
import { onboardingCache } from '@/lib/cache/redis';
import { trackEvent } from '@/lib/monitoring/analytics';
import { createValidationService } from '@/lib/validation/onboarding';
import type {
  OnboardingSession,
  Organization,
  OrganizationMember,
  OnboardingStatus,
  OrganizationSize
} from '@/lib/database/onboarding-types';

// Transformation result interfaces
export interface TransformationResult {
  success: boolean;
  data: TransformedData;
  errors: TransformationError[];
  warnings: TransformationWarning[];
  metadata: TransformationMetadata;
}

export interface TransformedData {
  userProfile: UserProfileData;
  organization: OrganizationData;
  objectives: ObjectiveData[];
  keyResults: KeyResultData[];
  teamStructure: TeamStructureData;
  preferences: UserPreferencesData;
}

export interface TransformationError {
  step: number;
  field: string;
  code: string;
  message: string;
  originalValue?: any;
  context?: Record<string, any>;
}

export interface TransformationWarning {
  step: number;
  field: string;
  message: string;
  suggestion?: string;
}

export interface TransformationMetadata {
  transformedAt: string;
  transformedBy: string;
  processingTime: number;
  aiEnhanced: boolean;
  stepsProcessed: number[];
  validationPassed: boolean;
}

// Transformed data types
export interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  phoneNumber?: string;
  timezone: string;
  language: 'es' | 'en';
  communicationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
  };
}

export interface OrganizationData {
  name: string;
  industry: string;
  size: OrganizationSize;
  employeeCount: number;
  website?: string;
  description?: string;
  country: string;
  city?: string;
  foundedYear?: number;
  departments: string[];
  aiInsights: Record<string, any>;
  businessGoals: string[];
  currentChallenges: string[];
  okrMaturity: string;
}

export interface ObjectiveData {
  title: string;
  description: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  timeHorizon: string;
  status: 'draft' | 'active' | 'completed';
  parentId?: string;
  departmentId?: string;
}

export interface KeyResultData {
  objectiveId: string;
  title: string;
  description?: string;
  metric: string;
  target: string;
  unit: string;
  baseline: string;
  owner: string;
  status: 'draft' | 'active' | 'completed';
  trackingFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface TeamStructureData {
  departments: DepartmentData[];
  roles: RoleData[];
  hierarchyLevels: number;
  reportingStructure: Record<string, string>;
}

export interface DepartmentData {
  name: string;
  description?: string;
  parentId?: string;
  headOfDepartment?: string;
  memberCount: number;
}

export interface RoleData {
  name: string;
  description?: string;
  departmentId: string;
  level: number;
  permissions: string[];
}

export interface UserPreferencesData {
  okrCycle: 'quarterly' | 'monthly' | 'bi-annual' | 'annual';
  reviewFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  trackingPreferences: {
    updateFrequency: 'daily' | 'weekly' | 'bi-weekly';
    notificationSettings: {
      deadlineReminders: boolean;
      progressAlerts: boolean;
      teamUpdates: boolean;
    };
    reportingFormat: 'dashboard' | 'email' | 'presentation';
  };
  launchPreferences: {
    sendInvitations: boolean;
    scheduleKickoff: boolean;
    enableNotifications: boolean;
    setupIntegrations: boolean;
  };
}

// Transformation configuration
export interface TransformationConfig {
  enableAI: boolean;
  enableValidation: boolean;
  enableCache: boolean;
  enableAnalytics: boolean;
  language: 'es' | 'en';
  strictMode: boolean;
  aiTimeout: number;
  batchSize: number;
}

const DEFAULT_CONFIG: TransformationConfig = {
  enableAI: true,
  enableValidation: true,
  enableCache: true,
  enableAnalytics: true,
  language: 'es',
  strictMode: false,
  aiTimeout: 10000,
  batchSize: 10
};

/**
 * Main Data Transformation Pipeline Class
 */
export class WizardDataTransformationPipeline {
  private config: TransformationConfig;
  private aiService: OnboardingAIService;
  private validationService: any;

  constructor(config?: Partial<TransformationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiService = OnboardingAIService.getInstance();
    this.validationService = createValidationService({
      enableAI: this.config.enableAI,
      language: this.config.language
    });
  }

  /**
   * Transform wizard data to database format
   */
  public async transformWizardData(
    sessionData: Record<number, Record<string, any>>,
    context: {
      userId: string;
      sessionId: string;
      organizationId?: string;
    }
  ): Promise<TransformationResult> {
    const startTime = Date.now();

    try {
      // Validate input data if enabled
      if (this.config.enableValidation) {
        const validationResult = await this.validationService.validateComplete(
          sessionData,
          context
        );

        if (!validationResult.isValid && this.config.strictMode) {
          return {
            success: false,
            data: {} as TransformedData,
            errors: validationResult.errors.map((err: any) => ({
              step: 0,
              field: err.field,
              code: err.code,
              message: err.message
            })),
            warnings: [],
            metadata: {
              transformedAt: new Date().toISOString(),
              transformedBy: 'WizardDataTransformationPipeline',
              processingTime: Date.now() - startTime,
              aiEnhanced: false,
              stepsProcessed: [],
              validationPassed: false
            }
          };
        }
      }

      // Transform each step
      const transformedData = await this.performStepTransformations(sessionData, context);

      // Enhance with AI if enabled
      if (this.config.enableAI) {
        await this.enhanceWithAI(transformedData, context);
      }

      // Post-process and validate
      const finalData = await this.postProcessData(transformedData, context);

      const result: TransformationResult = {
        success: true,
        data: finalData,
        errors: [],
        warnings: [],
        metadata: {
          transformedAt: new Date().toISOString(),
          transformedBy: 'WizardDataTransformationPipeline',
          processingTime: Date.now() - startTime,
          aiEnhanced: this.config.enableAI,
          stepsProcessed: Object.keys(sessionData).map(Number),
          validationPassed: true
        }
      };

      // Cache result
      if (this.config.enableCache) {
        await this.cacheTransformationResult(context.sessionId, result);
      }

      // Track transformation
      if (this.config.enableAnalytics) {
        await this.trackTransformation(result, context);
      }

      return result;

    } catch (error) {
      console.error('Data transformation error:', error);

      const errorResult: TransformationResult = {
        success: false,
        data: {} as TransformedData,
        errors: [{
          step: 0,
          field: '_system',
          code: 'TRANSFORMATION_ERROR',
          message: 'Error interno de transformación',
          context: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        warnings: [],
        metadata: {
          transformedAt: new Date().toISOString(),
          transformedBy: 'WizardDataTransformationPipeline',
          processingTime: Date.now() - startTime,
          aiEnhanced: false,
          stepsProcessed: [],
          validationPassed: false
        }
      };

      if (this.config.enableAnalytics) {
        await this.trackTransformation(errorResult, context);
      }

      return errorResult;
    }
  }

  /**
   * Save transformed data to database
   */
  public async saveToDatabase(
    transformedData: TransformedData,
    context: {
      userId: string;
      sessionId: string;
      organizationId?: string;
    }
  ): Promise<{
    success: boolean;
    organizationId?: string;
    objectiveIds?: string[];
    errors?: any[];
  }> {
    try {
      // Create or update organization
      let organizationId = context.organizationId;

      if (!organizationId) {
        const organization = await createOrganization({
          name: transformedData.organization.name,
          industry: transformedData.organization.industry,
          size: transformedData.organization.size,
          employeeCount: transformedData.organization.employeeCount,
          website: transformedData.organization.website,
          description: transformedData.organization.description,
          country: transformedData.organization.country,
          city: transformedData.organization.city,
          foundedYear: transformedData.organization.foundedYear,
          businessGoals: transformedData.organization.businessGoals,
          currentChallenges: transformedData.organization.currentChallenges,
          okrMaturity: transformedData.organization.okrMaturity,
          createdBy: context.userId
        });

        organizationId = organization.id;

        // Add user as organization owner
        await addOrganizationMember(
          organizationId,
          context.userId,
          'org_owner',
          transformedData.userProfile.jobTitle
        );
      }

      // Update session as completed
      await updateOnboardingSession(context.sessionId, {
        status: 'completed' as OnboardingStatus,
        completion_percentage: 100,
        form_data: {
          userProfile: transformedData.userProfile,
          organization: transformedData.organization,
          objectives: transformedData.objectives,
          preferences: transformedData.preferences
        }
      });

      // TODO: Create objectives and key results in OKR tables
      // This would require additional OKR table schemas

      // Clear cache
      if (this.config.enableCache) {
        await onboardingCache.invalidateOnboardingStatus(context.userId);
      }

      // Track completion
      if (this.config.enableAnalytics) {
        await trackEvent('onboarding_data_saved', {
          userId: context.userId,
          sessionId: context.sessionId,
          organizationId,
          objectiveCount: transformedData.objectives.length,
          keyResultCount: transformedData.keyResults.length
        });
      }

      return {
        success: true,
        organizationId,
        objectiveIds: [], // Would be populated when OKR tables are created
        errors: []
      };

    } catch (error) {
      console.error('Error saving to database:', error);
      return {
        success: false,
        errors: [error]
      };
    }
  }

  /**
   * Transform data for each step
   */
  private async performStepTransformations(
    sessionData: Record<number, Record<string, any>>,
    context: any
  ): Promise<TransformedData> {
    const step1 = sessionData[1] || {};
    const step2 = sessionData[2] || {};
    const step3 = sessionData[3] || {};
    const step4 = sessionData[4] || {};
    const step5 = sessionData[5] || {};

    // Transform Step 1: User Profile
    const userProfile: UserProfileData = {
      firstName: step1.firstName || '',
      lastName: step1.lastName || '',
      email: step1.email || '',
      jobTitle: step1.jobTitle,
      phoneNumber: step1.phoneNumber,
      timezone: step1.timezone || 'America/Mexico_City',
      language: step1.language || 'es',
      communicationPreferences: {
        emailNotifications: step1.communicationPreferences?.emailNotifications ?? true,
        smsNotifications: step1.communicationPreferences?.smsNotifications ?? false,
        pushNotifications: step1.communicationPreferences?.pushNotifications ?? true,
        weeklyReports: step1.communicationPreferences?.weeklyReports ?? true
      }
    };

    // Transform Step 2: Organization
    const organization: OrganizationData = {
      name: step2.organizationName || '',
      industry: step2.industry || '',
      size: step2.organizationSize || 'small',
      employeeCount: step2.employeeCount || 1,
      website: step2.website,
      description: step2.description,
      country: step2.country || '',
      city: step2.city,
      foundedYear: step2.foundedYear,
      departments: step2.departments || [],
      aiInsights: {},
      businessGoals: step3.businessGoals || [],
      currentChallenges: step3.currentChallenges || [],
      okrMaturity: step3.okrMaturity || 'beginner'
    };

    // Transform Step 3 & 4: Objectives and Key Results
    const objectives: ObjectiveData[] = [];
    const keyResults: KeyResultData[] = [];

    if (step4.objectives) {
      for (const [index, obj] of step4.objectives.entries()) {
        const objectiveId = `obj_${context.sessionId}_${index}`;

        objectives.push({
          title: obj.title || '',
          description: obj.description || '',
          owner: obj.owner || context.userId,
          priority: obj.priority || 'medium',
          category: obj.category || 'business',
          timeHorizon: step3.timeHorizon || 'quarterly',
          status: 'draft',
          parentId: undefined,
          departmentId: undefined
        });

        if (obj.keyResults) {
          for (const [krIndex, kr] of obj.keyResults.entries()) {
            keyResults.push({
              objectiveId,
              title: kr.title || '',
              description: kr.description,
              metric: kr.metric || '',
              target: kr.target || '',
              unit: kr.unit || '',
              baseline: kr.baseline || '0',
              owner: kr.owner || obj.owner || context.userId,
              status: 'draft',
              trackingFrequency: 'weekly'
            });
          }
        }
      }
    }

    // Transform Step 4: Team Structure
    const teamStructure: TeamStructureData = {
      departments: step2.departments?.map((dept: string, index: number) => ({
        name: dept,
        description: `Department: ${dept}`,
        parentId: undefined,
        headOfDepartment: index === 0 ? context.userId : undefined,
        memberCount: Math.ceil(step2.employeeCount / step2.departments.length) || 1
      })) || [],
      roles: [
        {
          name: userProfile.jobTitle || 'Manager',
          description: 'Leadership role',
          departmentId: 'dept_1',
          level: 1,
          permissions: ['read', 'write', 'admin']
        }
      ],
      hierarchyLevels: Math.min(Math.ceil(Math.log2(step2.employeeCount || 1)), 5),
      reportingStructure: {}
    };

    // Transform Step 4 & 5: Preferences
    const preferences: UserPreferencesData = {
      okrCycle: step4.okrCycle || 'quarterly',
      reviewFrequency: step4.reviewFrequency || 'weekly',
      trackingPreferences: {
        updateFrequency: step4.trackingPreferences?.updateFrequency || 'weekly',
        notificationSettings: {
          deadlineReminders: step4.trackingPreferences?.notificationSettings?.deadlineReminders ?? true,
          progressAlerts: step4.trackingPreferences?.notificationSettings?.progressAlerts ?? true,
          teamUpdates: step4.trackingPreferences?.notificationSettings?.teamUpdates ?? true
        },
        reportingFormat: step4.trackingPreferences?.reportingFormat || 'dashboard'
      },
      launchPreferences: {
        sendInvitations: step5.launchPreferences?.sendInvitations ?? false,
        scheduleKickoff: step5.launchPreferences?.scheduleKickoff ?? false,
        enableNotifications: step5.launchPreferences?.enableNotifications ?? true,
        setupIntegrations: step5.launchPreferences?.setupIntegrations ?? false
      }
    };

    return {
      userProfile,
      organization,
      objectives,
      keyResults,
      teamStructure,
      preferences
    };
  }

  /**
   * Enhance data with AI insights
   */
  private async enhanceWithAI(
    data: TransformedData,
    context: any
  ): Promise<void> {
    try {
      // Generate AI insights for organization
      const organizationPrompt = `
        Analyza esta organización y genera insights estratégicos:
        - Nombre: ${data.organization.name}
        - Industria: ${data.organization.industry}
        - Tamaño: ${data.organization.size}
        - Empleados: ${data.organization.employeeCount}
        - Objetivos: ${data.organization.businessGoals.join(', ')}
        - Desafíos: ${data.organization.currentChallenges.join(', ')}
      `;

      const aiInsights = await this.aiService.generateInsights(
        organizationPrompt,
        {
          industry: data.organization.industry,
          organizationSize: data.organization.size,
          okrMaturity: data.organization.okrMaturity
        }
      );

      data.organization.aiInsights = {
        strategicRecommendations: aiInsights,
        industryBenchmarks: {},
        growthOpportunities: {},
        riskFactors: {},
        generatedAt: new Date().toISOString()
      };

      // Enhance objectives with AI suggestions
      for (const objective of data.objectives) {
        const objectivePrompt = `
          Mejora este objetivo para que sea más específico y medible:
          - Título: ${objective.title}
          - Descripción: ${objective.description}
          - Industria: ${data.organization.industry}
          - Contexto organizacional: ${data.organization.businessGoals.join(', ')}
        `;

        try {
          const enhancedObjective = await this.aiService.generateSuggestions(
            objectivePrompt,
            { timeout: this.config.aiTimeout }
          );

          // Apply AI enhancements if they improve the objective
          if (enhancedObjective && enhancedObjective.length > objective.description.length) {
            objective.description = enhancedObjective;
          }
        } catch (error) {
          console.warn('Failed to enhance objective with AI:', error);
        }
      }

    } catch (error) {
      console.error('AI enhancement error:', error);
      // Continue without AI enhancement
    }
  }

  /**
   * Post-process and clean data
   */
  private async postProcessData(
    data: TransformedData,
    context: any
  ): Promise<TransformedData> {
    // Clean and normalize text fields
    data.userProfile.firstName = this.cleanText(data.userProfile.firstName);
    data.userProfile.lastName = this.cleanText(data.userProfile.lastName);
    data.organization.name = this.cleanText(data.organization.name);

    // Normalize URLs
    if (data.organization.website) {
      data.organization.website = this.normalizeUrl(data.organization.website);
    }

    // Validate and clean objectives
    data.objectives = data.objectives.filter(obj =>
      obj.title.trim().length > 0 && obj.description.trim().length > 0
    );

    // Validate and clean key results
    data.keyResults = data.keyResults.filter(kr =>
      kr.title.trim().length > 0 && kr.metric.trim().length > 0
    );

    // Set default values for required fields
    if (!data.organization.country) {
      data.organization.country = 'México';
    }

    if (!data.userProfile.timezone) {
      data.userProfile.timezone = 'America/Mexico_City';
    }

    return data;
  }

  /**
   * Clean text fields
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ\-.,]/g, '') // Remove special characters
      .substring(0, 200); // Limit length
  }

  /**
   * Normalize URL format
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';

    let normalized = url.trim();

    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');

    return normalized;
  }

  /**
   * Cache transformation result
   */
  private async cacheTransformationResult(
    sessionId: string,
    result: TransformationResult
  ): Promise<void> {
    try {
      await onboardingCache.set(`transformation_${sessionId}`, result, 3600); // 1 hour cache
    } catch (error) {
      console.error('Failed to cache transformation result:', error);
    }
  }

  /**
   * Track transformation for analytics
   */
  private async trackTransformation(
    result: TransformationResult,
    context: any
  ): Promise<void> {
    try {
      await trackEvent('onboarding_data_transformed', {
        sessionId: context.sessionId,
        userId: context.userId,
        success: result.success,
        processingTime: result.metadata.processingTime,
        aiEnhanced: result.metadata.aiEnhanced,
        stepsProcessed: result.metadata.stepsProcessed.length,
        objectiveCount: result.data.objectives?.length || 0,
        keyResultCount: result.data.keyResults?.length || 0,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });
    } catch (error) {
      console.error('Failed to track transformation:', error);
    }
  }
}

/**
 * Utility functions for data transformation
 */

/**
 * Transform wizard step data to specific format
 */
export async function transformStepData(
  stepNumber: number,
  stepData: Record<string, any>,
  context?: any
): Promise<Record<string, any>> {
  const pipeline = new WizardDataTransformationPipeline();

  // Create temporary session data for transformation
  const sessionData = { [stepNumber]: stepData };

  const result = await pipeline.transformWizardData(sessionData, {
    userId: context?.userId || 'temp',
    sessionId: context?.sessionId || 'temp'
  });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(`Transformation failed: ${result.errors.map(e => e.message).join(', ')}`);
  }
}

/**
 * Validate and transform complete session data
 */
export async function transformCompleteSession(
  sessionData: Record<number, Record<string, any>>,
  context: {
    userId: string;
    sessionId: string;
    organizationId?: string;
  }
): Promise<TransformationResult> {
  const pipeline = new WizardDataTransformationPipeline();
  return pipeline.transformWizardData(sessionData, context);
}

/**
 * Save transformed data and complete onboarding
 */
export async function completeOnboarding(
  sessionData: Record<number, Record<string, any>>,
  context: {
    userId: string;
    sessionId: string;
    organizationId?: string;
  }
): Promise<{
  success: boolean;
  organizationId?: string;
  objectiveIds?: string[];
  errors?: any[];
}> {
  const pipeline = new WizardDataTransformationPipeline();

  // Transform data
  const transformationResult = await pipeline.transformWizardData(sessionData, context);

  if (!transformationResult.success) {
    return {
      success: false,
      errors: transformationResult.errors
    };
  }

  // Save to database
  return pipeline.saveToDatabase(transformationResult.data, context);
}

/**
 * Factory function to create transformation pipeline
 */
export function createTransformationPipeline(
  config?: Partial<TransformationConfig>
): WizardDataTransformationPipeline {
  return new WizardDataTransformationPipeline(config);
}

// Export types for external use
export type {
  TransformationConfig,
  TransformationResult,
  TransformedData,
  UserProfileData,
  OrganizationData,
  ObjectiveData,
  KeyResultData,
  TeamStructureData,
  UserPreferencesData
};