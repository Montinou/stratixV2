'use server';

import { OKRDatabaseClient } from './database-client';
import { stackServerApp } from '@/stack/server';
import { revalidatePath } from 'next/cache';

/**
 * OKR Services adapted for internal tooling template
 * Uses Stack Auth for authorization and follows template patterns
 */

export class ObjectiveService {
  /**
   * Get objectives for current user's company
   */
  static async getObjectives(filters?: {
    department?: string;
    status?: string;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return await OKRDatabaseClient.getObjectives({
      companyId: userProfile.companyId,
      ...filters,
    });
  }

  /**
   * Create new objective
   */
  static async createObjective(data: {
    title: string;
    description?: string;
    department: string;
    priority: 'low' | 'medium' | 'high';
    targetValue?: string;
    unit?: string;
    startDate: Date;
    endDate: Date;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check permissions - only corporativo and gerente can create objectives
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      throw new Error('Insufficient permissions to create objectives');
    }

    const result = await OKRDatabaseClient.createObjective({
      ...data,
      companyId: userProfile.companyId!,
    });

    revalidatePath('/tools/objectives');
    revalidatePath('/tools/okr');

    return result;
  }

  /**
   * Update objective
   */
  static async updateObjective(objectiveId: string, data: Partial<{
    title: string;
    description: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    progressPercentage: string;
    targetValue: string;
    currentValue: string;
    assignedTo: string;
  }>) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check permissions - users can only update their assigned objectives
    // unless they are corporativo or gerente
    if (userProfile.role === 'empleado' && data.assignedTo !== user.id) {
      throw new Error('Insufficient permissions to update this objective');
    }

    const result = await OKRDatabaseClient.updateObjective(objectiveId, data);

    // Record update history
    if (Object.keys(data).length > 0) {
      await OKRDatabaseClient.recordUpdate({
        entityType: 'objective',
        entityId: objectiveId,
        field: Object.keys(data)[0],
        newValue: Object.values(data)[0]?.toString(),
        companyId: userProfile.companyId!,
      });
    }

    revalidatePath('/tools/objectives');
    revalidatePath('/tools/okr');

    return result;
  }
}

export class InitiativeService {
  /**
   * Get initiatives for current user's company
   */
  static async getInitiatives(filters?: {
    objectiveId?: string;
    status?: string;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return await OKRDatabaseClient.getInitiatives({
      companyId: userProfile.companyId,
      ...filters,
    });
  }

  /**
   * Create new initiative
   */
  static async createInitiative(data: {
    title: string;
    description?: string;
    objectiveId: string;
    priority: 'low' | 'medium' | 'high';
    budget?: string;
    startDate: Date;
    endDate: Date;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check permissions
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      throw new Error('Insufficient permissions to create initiatives');
    }

    // TODO: Implement initiative creation
    revalidatePath('/tools/initiatives');
    revalidatePath('/tools/okr');

    return { success: true };
  }
}

export class ActivityService {
  /**
   * Get activities for current user's company
   */
  static async getActivities(filters?: {
    initiativeId?: string;
    status?: string;
    assignedTo?: string;
    overdue?: boolean;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return await OKRDatabaseClient.getActivities({
      companyId: userProfile.companyId,
      ...filters,
    });
  }

  /**
   * Create new activity
   */
  static async createActivity(data: {
    title: string;
    description?: string;
    initiativeId: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours?: string;
    dueDate?: Date;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // All users can create activities
    // TODO: Implement activity creation
    revalidatePath('/tools/activities');
    revalidatePath('/tools/okr');

    return { success: true };
  }

  /**
   * Mark activity as completed
   */
  static async completeActivity(activityId: string) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // TODO: Implement activity completion
    revalidatePath('/tools/activities');
    revalidatePath('/tools/okr');

    return { success: true };
  }
}

export class AnalyticsService {
  /**
   * Get dashboard analytics
   */
  static async getDashboardAnalytics() {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return await OKRDatabaseClient.getAnalytics({
      companyId: userProfile.companyId!,
    });
  }

  /**
   * Get user dashboard summary
   */
  static async getUserDashboard() {
    const user = await stackServerApp.getUser({ or: 'throw' });

    return await OKRDatabaseClient.getDashboardSummary(user.id);
  }

  /**
   * Get area progress
   */
  static async getAreaProgress(areaId?: string) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const objectives = await OKRDatabaseClient.getObjectives({
      companyId: userProfile.companyId,
      areaId,
    });

    // Calculate progress statistics
    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter(obj => obj.status === 'completado').length;
    const averageProgress = objectives.reduce((acc, obj) => {
      return acc + (parseFloat(obj.progressPercentage || '0'));
    }, 0) / totalObjectives;

    return {
      totalObjectives,
      completedObjectives,
      averageProgress,
      objectives,
    };
  }
}

export class ProfileService {
  /**
   * Get current user profile
   */
  static async getCurrentProfile() {
    const user = await stackServerApp.getUser({ or: 'throw' });
    return await OKRDatabaseClient.getUserProfile(user.id);
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: {
    fullName?: string;
    department?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const currentProfile = await OKRDatabaseClient.getUserProfile(user.id);

    if (!currentProfile) {
      throw new Error('User profile not found');
    }

    // Only allow updating certain fields
    const updateData = {
      userId: user.id,
      fullName: data.fullName || currentProfile.fullName,
      role: currentProfile.role, // Keep existing role
      department: data.department || currentProfile.department || '',
      companyId: currentProfile.companyId!,
    };

    const result = await OKRDatabaseClient.upsertUserProfile(updateData);

    revalidatePath('/tools/profile');

    return result;
  }

  /**
   * Initialize user profile for new users
   */
  static async initializeProfile(data: {
    fullName: string;
    role: 'corporativo' | 'gerente' | 'empleado';
    department: string;
    companyId: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });

    return await OKRDatabaseClient.upsertUserProfile({
      userId: user.id,
      ...data,
    });
  }
}