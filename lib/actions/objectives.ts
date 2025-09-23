'use server'

import { revalidatePath } from 'next/cache';
import { ObjectivesService, type Objective } from '@/lib/database/services';
import { verifyAuthentication, getUserProfile } from '@/lib/database/auth';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function getObjectives(): Promise<{ data: Objective[] | null; error?: string }> {
  try {
    // Get current user from NeonAuth
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Get user profile to apply role-based filtering
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const objectives = await ObjectivesService.getAll(
      user.id,
      profile.role_type,
      profile.department
    );

    return { data: objectives };
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return { data: null, error: 'Failed to fetch objectives' };
  }
}

export async function getObjective(id: string): Promise<{ data: Objective | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const objective = await ObjectivesService.getById(id, user.id);
    return { data: objective };
  } catch (error) {
    console.error('Error fetching objective:', error);
    return { data: null, error: 'Failed to fetch objective' };
  }
}

export async function createObjective(
  objectiveData: Omit<Objective, 'id' | 'created_at' | 'updated_at' | 'owner_id' | 'company_id'>
): Promise<{ data: Objective | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const objective = await ObjectivesService.create({
      ...objectiveData,
      owner_id: user.id,
      company_id: profile.company_id,
    });

    revalidatePath('/objectives');
    return { data: objective };
  } catch (error) {
    console.error('Error creating objective:', error);
    return { data: null, error: 'Failed to create objective' };
  }
}

export async function updateObjective(
  id: string,
  updates: Partial<Objective>
): Promise<{ data: Objective | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const objective = await ObjectivesService.update(id, updates);

    revalidatePath('/objectives');
    return { data: objective };
  } catch (error) {
    console.error('Error updating objective:', error);
    return { data: null, error: 'Failed to update objective' };
  }
}

export async function deleteObjective(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    await ObjectivesService.delete(id);

    revalidatePath('/objectives');
    return { success: true };
  } catch (error) {
    console.error('Error deleting objective:', error);
    return { success: false, error: 'Failed to delete objective' };
  }
}