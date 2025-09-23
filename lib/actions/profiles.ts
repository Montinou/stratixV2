'use server'

import { ProfilesService, type Profile } from '@/lib/database/services';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function getProfiles(): Promise<{ data: Profile[] | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // For now, get all profiles (you might want to filter by company)
    const profiles = await ProfilesService.getAll();
    return { data: profiles };
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return { data: null, error: 'Failed to fetch profiles' };
  }
}

export async function getCurrentProfile(): Promise<{ data: Profile | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const profile = await ProfilesService.getByUserId(user.id);
    return { data: profile };
  } catch (error) {
    console.error('Error fetching current profile:', error);
    return { data: null, error: 'Failed to fetch profile' };
  }
}

export async function updateProfile(
  updates: Partial<Profile>
): Promise<{ data: Profile | null; error?: string }> {
  try {
    const user = await neonServerClient.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const profile = await ProfilesService.update(user.id, updates);
    return { data: profile };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { data: null, error: 'Failed to update profile' };
  }
}