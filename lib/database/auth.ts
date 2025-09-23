import { NextRequest } from 'next/server';
import { neonServerClient } from '@/lib/neon-auth/server';
import { query } from './client';

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
    // Get user from NeonAuth
    const user = await neonServerClient.getUser();
    
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
 * Get user profile from database
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await query<UserProfile>(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export async function verifyUserRole(
  userId: string, 
  requiredRole: 'corporativo' | 'gerente' | 'empleado'
): Promise<boolean> {
  try {
    const profile = await getUserProfile(userId);
    return profile?.role_type === requiredRole;
  } catch (error) {
    console.error('Error verifying user role:', error);
    return false;
  }
}

/**
 * Store AI suggestion in database
 */
export async function storeAISuggestion(
  userId: string,
  suggestionType: string,
  inputData: any,
  outputData: any
): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_suggestions (user_id, suggestion_type, input_data, output_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, suggestionType, JSON.stringify(inputData), JSON.stringify(outputData)]
    );
  } catch (error) {
    console.error('Error storing AI suggestion:', error);
    // Don't throw error for analytics - just log it
  }
}