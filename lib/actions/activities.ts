'use server'

import { revalidatePath } from 'next/cache';
import { ActivitiesService, type Activity } from '@/lib/database/services';
import { stackServerApp } from '@/stack';

export async function getActivities(): Promise<{ data: Activity[] | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Note: Profile fetching should be handled by the activities service
    // or through direct database queries with the Stack Auth user ID

    const activities = await ActivitiesService.getAll(
      user.id,
      profile.role_type,
      profile.department
    );

    return { data: activities };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { data: null, error: 'Failed to fetch activities' };
  }
}

export async function getActivitiesByInitiative(initiativeId: string): Promise<{ data: Activity[] | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const activities = await ActivitiesService.getByInitiativeId(initiativeId);
    return { data: activities };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { data: null, error: 'Failed to fetch activities' };
  }
}

export async function createActivity(
  activityData: Omit<Activity, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Activity | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const activity = await ActivitiesService.create(activityData);

    revalidatePath('/activities');
    return { data: activity };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { data: null, error: 'Failed to create activity' };
  }
}

export async function updateActivity(
  id: string,
  updates: Partial<Activity>
): Promise<{ data: Activity | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const activity = await ActivitiesService.update(id, updates);

    revalidatePath('/activities');
    return { data: activity };
  } catch (error) {
    console.error('Error updating activity:', error);
    return { data: null, error: 'Failed to update activity' };
  }
}

export async function deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    await ActivitiesService.delete(id);

    revalidatePath('/activities');
    return { success: true };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: 'Failed to delete activity' };
  }
}