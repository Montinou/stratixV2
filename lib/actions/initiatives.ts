'use server'

import { revalidatePath } from 'next/cache';
import { InitiativesService, type Initiative } from '@/lib/database/services';
import { getUserProfile } from '@/lib/database/auth';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function getInitiatives(): Promise<{ data: Initiative[] | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const initiatives = await InitiativesService.getAll(
      user.id,
      profile.role_type,
      profile.department
    );

    return { data: initiatives };
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return { data: null, error: 'Failed to fetch initiatives' };
  }
}

export async function getInitiativesByObjective(objectiveId: string): Promise<{ data: Initiative[] | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const initiatives = await InitiativesService.getByObjectiveId(objectiveId);
    return { data: initiatives };
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return { data: null, error: 'Failed to fetch initiatives' };
  }
}

export async function createInitiative(
  initiativeData: Omit<Initiative, 'id' | 'created_at' | 'updated_at' | 'owner_id'>
): Promise<{ data: Initiative | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const initiative = await InitiativesService.create({
      ...initiativeData,
      owner_id: user.id,
    });

    revalidatePath('/initiatives');
    return { data: initiative };
  } catch (error) {
    console.error('Error creating initiative:', error);
    return { data: null, error: 'Failed to create initiative' };
  }
}

export async function updateInitiative(
  id: string,
  updates: Partial<Initiative>
): Promise<{ data: Initiative | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const initiative = await InitiativesService.update(id, updates);

    revalidatePath('/initiatives');
    return { data: initiative };
  } catch (error) {
    console.error('Error updating initiative:', error);
    return { data: null, error: 'Failed to update initiative' };
  }
}

export async function deleteInitiative(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    await InitiativesService.delete(id);

    revalidatePath('/initiatives');
    return { success: true };
  } catch (error) {
    console.error('Error deleting initiative:', error);
    return { success: false, error: 'Failed to delete initiative' };
  }
}