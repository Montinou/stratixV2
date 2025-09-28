'use server'

import { ProfilesService, type Profile } from '@/lib/database/services';
import { stackServerApp } from '@/stack';

export async function getProfiles(): Promise<{ data: Profile[] | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
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
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return { data: null, error: 'Unauthorized' };
    }

    // Use Stack Auth user ID directly with Neon Auth standard approach
    // The neon_auth.users_sync table automatically syncs with Stack Auth
    const profile = await ProfilesService.getByUserId(stackUser.id);
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
    const user = await stackServerApp.getUser();
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