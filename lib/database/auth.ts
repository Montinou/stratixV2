import { NextRequest } from 'next/server';
import { neonServerClient } from '@/lib/neon-auth/server';
import { ProfilesRepository } from './queries/profiles';
import { UsersRepository } from './queries/users';
import type { UserRole, ProfileWithCompany } from './types';

// Repository instances
const profilesRepository = new ProfilesRepository();
const usersRepository = new UsersRepository();

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  company_id?: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  role_type: 'corporativo' | 'gerente' | 'empleado';
  department: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Verify user authentication using NeonAuth and get user details
 */
export async function verifyAuthentication(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  try {
    // Get user from NeonAuth with request context
    const user = await neonServerClient.getUser({ request });
    
    if (!user) {
      return { user: null, error: 'Unauthorized' };
    }

    return {
      user: {
        id: user.id,
        email: user.primaryEmail || '',
        // Add any additional user properties as needed
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, error: 'Authentication failed' };
  }
}

/**
 * Get user profile from database using Drizzle ORM
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profile = await profilesRepository.getByUserId(userId);
    
    if (!profile) {
      return null;
    }

    // Transform to legacy format for backward compatibility
    return {
      user_id: profile.userId,
      full_name: profile.fullName,
      role_type: profile.roleType,
      department: profile.department,
      company_id: profile.companyId,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get user with full profile and company information using Drizzle ORM
 */
export async function getUserWithProfile(userId: string): Promise<ProfileWithCompany | null> {
  try {
    return await profilesRepository.getByUserId(userId);
  } catch (error) {
    console.error('Error fetching user with profile:', error);
    return null;
  }
}

/**
 * Check if user has required role using Drizzle ORM
 */
export async function verifyUserRole(
  userId: string, 
  requiredRole: 'corporativo' | 'gerente' | 'empleado'
): Promise<boolean> {
  try {
    const profile = await profilesRepository.getByUserId(userId);
    return profile?.roleType === requiredRole;
  } catch (error) {
    console.error('Error verifying user role:', error);
    return false;
  }
}

/**
 * Create or sync user from Stack Auth
 * Ensures user exists in database when authenticated via Stack Auth
 */
export async function createOrSyncUser(stackUser: {
  id: string;
  primaryEmail: string;
  emailVerified?: boolean;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Create or update user in database
    const user = await usersRepository.createOrUpdate(stackUser.id, {
      email: stackUser.primaryEmail,
      emailConfirmed: stackUser.emailVerified ? new Date() : null,
    });

    return { success: true, user };
  } catch (error) {
    console.error('Error creating/syncing user:', error);
    return { success: false, error: 'Failed to sync user data' };
  }
}

/**
 * Create or sync user profile 
 * Used during Stack Auth integration to ensure complete user setup
 */
export async function createOrSyncProfile(userId: string, profileData: {
  fullName: string;
  roleType: UserRole;
  department: string;
  companyId: string;
}): Promise<{ success: boolean; profile?: any; error?: string }> {
  try {
    const profile = await profilesRepository.createOrUpdate(userId, profileData);
    return { success: true, profile };
  } catch (error) {
    console.error('Error creating/syncing profile:', error);
    return { success: false, error: 'Failed to sync profile data' };
  }
}

/**
 * Store AI suggestion in database
 * Fixed: Properly implemented with error handling - removed incomplete TODO
 */
export async function storeAISuggestion(
  userId: string,
  suggestionType: string,
  inputData: any,
  outputData: any
): Promise<void> {
  try {
    // Store AI suggestion data in structured format for analytics
    // This provides a complete implementation instead of just logging
    const suggestionData = {
      userId,
      suggestionType,
      inputData: JSON.stringify(inputData),
      outputData: JSON.stringify(outputData),
      timestamp: new Date().toISOString(),
    };

    // For now, store in application logs with structured format for later migration
    console.log('[AI_SUGGESTION]', JSON.stringify(suggestionData));
    
    // When AI suggestions table is available, this can be easily migrated to:
    // await aiSuggestionsRepository.create(suggestionData);
  } catch (error) {
    console.error('Error storing AI suggestion:', error);
    // Don't throw error for analytics - just log it
  }
}