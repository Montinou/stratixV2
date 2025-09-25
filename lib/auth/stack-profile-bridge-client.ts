"use client"

import type { User } from "@stackframe/stack"
import type { Profile } from "@/lib/database/queries/profiles"

/**
 * Client-side bridge between Stack authentication and database profile management
 * Uses API calls instead of direct database access to avoid importing server-side code
 */
export class StackProfileBridge {
  /**
   * Get or create user profile based on Stack authentication
   * Uses API endpoints to avoid server-side database imports
   */
  static async getOrCreateProfile(stackUser: User, defaultCompanyId: string): Promise<Profile | null> {
    try {
      // First try to get existing profile
      const existingProfile = await this.getProfileFromAPI(stackUser.id);
      
      if (existingProfile) {
        // Check if profile needs updating with Stack data
        const shouldUpdate = this.shouldSyncProfile(existingProfile, stackUser);
        
        if (shouldUpdate) {
          return await this.updateProfileViaAPI(stackUser.id, stackUser, existingProfile);
        }
        
        return existingProfile;
      }

      // Profile doesn't exist, create new one
      return await this.createProfileViaAPI(stackUser, defaultCompanyId);
      
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      return null;
    }
  }

  /**
   * Fetch profile from API endpoint
   */
  private static async getProfileFromAPI(userId: string): Promise<Profile | null> {
    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Profile not found - normal for new users
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching profile from API:', error);
      return null;
    }
  }

  /**
   * Create new profile via API endpoint
   */
  private static async createProfileViaAPI(stackUser: User, companyId: string): Promise<Profile | null> {
    try {
      const profileData = {
        fullName: stackUser.displayName || stackUser.primaryEmail || 'Unknown User',
        roleType: 'empleado' as const, // Default role
        department: 'General', // Default department
        companyId: companyId,
      };

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating profile via API:', error);
      return null;
    }
  }

  /**
   * Update profile via API endpoint
   */
  private static async updateProfileViaAPI(
    userId: string, 
    stackUser: User, 
    existingProfile: Profile
  ): Promise<Profile | null> {
    try {
      const updates = this.getProfileUpdates(existingProfile, stackUser);
      
      if (Object.keys(updates).length === 0) {
        return existingProfile; // No updates needed
      }

      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return existingProfile; // Return existing if update fails
    } catch (error) {
      console.error('Error updating profile via API:', error);
      return existingProfile; // Return existing profile on error
    }
  }

  /**
   * Check if profile needs to be updated based on Stack user data
   */
  private static shouldSyncProfile(profile: Profile, stackUser: User): boolean {
    const stackName = stackUser.displayName || stackUser.primaryEmail || 'Unknown User';
    
    // Check if name needs updating
    if (profile.fullName !== stackName) {
      return true;
    }

    // Add more sync conditions as needed
    return false;
  }

  /**
   * Get profile updates needed to sync with Stack user data
   */
  private static getProfileUpdates(profile: Profile, stackUser: User): Partial<Profile> {
    const updates: any = {};
    const stackName = stackUser.displayName || stackUser.primaryEmail || 'Unknown User';

    if (profile.fullName !== stackName) {
      updates.fullName = stackName;
    }

    return updates;
  }

  /**
   * Create fallback profile data from Stack user when API is unavailable
   */
  static createFallbackProfile(stackUser: User): Profile {
    return {
      id: `fallback-${stackUser.id}`,
      userId: stackUser.id,
      fullName: stackUser.displayName || stackUser.primaryEmail || 'Unknown User',
      roleType: 'empleado',
      department: 'General',
      companyId: 'fallback-company',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Profile;
  }

  /**
   * Handle user profile cleanup on logout
   */
  static async handleLogout(userId: string): Promise<void> {
    try {
      // For now, just log the logout event
      // In the future, this could call an API endpoint for cleanup
      console.log('User logout handled:', userId);
      
      // Could call: await fetch(`/api/auth/logout`, { method: 'POST', body: JSON.stringify({ userId }) });
    } catch (error) {
      console.error('Error in logout cleanup:', error);
    }
  }

  /**
   * Validate that a profile has required fields for the application
   */
  static isValidProfile(profile: Profile | null): boolean {
    if (!profile) {
      return false;
    }

    return Boolean(
      profile.userId &&
      profile.fullName &&
      profile.roleType &&
      profile.companyId
    );
  }
}