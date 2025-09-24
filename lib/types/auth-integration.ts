import type { User } from "@stackframe/stack";
import type { Profile } from "@/lib/database/queries/profiles";

/**
 * Stack Authentication Integration Types
 * 
 * Type definitions for integrating Stack authentication with database profiles.
 * Provides type safety between Stack user data and database schema.
 */

/**
 * Stack user data that gets synced to database profile
 */
export interface StackUserSync {
  id: string;
  displayName?: string | null;
  primaryEmail?: string | null;
  profileImageUrl?: string | null;
}

/**
 * Profile creation data from Stack user
 */
export interface StackProfileData extends Omit<Profile, 'created_at' | 'updated_at'> {
  user_id: string;
  full_name: string;
  role_type: Profile['role_type'];
  department: string;
  company_id: string;
}

/**
 * Profile sync operation result
 */
export interface ProfileSyncResult {
  success: boolean;
  profile: Profile | null;
  created: boolean; // true if profile was created, false if updated
  error?: string;
}

/**
 * Profile sync configuration
 */
export interface ProfileSyncConfig {
  defaultRole: Profile['role_type'];
  defaultDepartment: string;
  syncFields: (keyof StackUserSync)[];
  autoCreateProfile: boolean;
}

/**
 * Stack user validation result
 */
export interface StackUserValidation {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

/**
 * Profile upsert options
 */
export interface ProfileUpsertOptions {
  companyId: string;
  role?: Profile['role_type'];
  department?: string;
  forceUpdate?: boolean;
}

/**
 * Database transaction context for profile operations
 */
export interface ProfileTransactionContext {
  userId: string;
  operation: 'create' | 'update' | 'upsert';
  rollbackOnError: boolean;
}

/**
 * Stack authentication event types
 */
export type StackAuthEvent = 'signIn' | 'signOut' | 'sessionRefresh' | 'profileUpdate';

/**
 * Stack authentication event data
 */
export interface StackAuthEventData {
  event: StackAuthEvent;
  user: User | null;
  timestamp: Date;
  sessionId?: string;
}

/**
 * Profile synchronization strategy
 */
export type ProfileSyncStrategy = 
  | 'stack_authoritative'  // Stack data takes precedence
  | 'database_authoritative'  // Database data takes precedence
  | 'merge_latest'  // Use most recently updated data
  | 'manual_resolve';  // Require manual conflict resolution

/**
 * Profile field mapping configuration
 */
export interface ProfileFieldMapping {
  stackField: keyof StackUserSync;
  profileField: keyof Profile;
  transform?: (value: any) => any;
  required?: boolean;
}

/**
 * Stack integration error types
 */
export interface StackIntegrationError {
  code: 'STACK_USER_NOT_FOUND' | 'PROFILE_CREATION_FAILED' | 'PROFILE_SYNC_FAILED' | 'DATABASE_ERROR' | 'VALIDATION_ERROR';
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

/**
 * Profile audit log entry for Stack operations
 */
export interface ProfileAuditEntry {
  userId: string;
  operation: 'created' | 'updated' | 'synced' | 'merged';
  changedFields: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  stackEventId?: string;
  timestamp: Date;
}

/**
 * Stack integration health check result
 */
export interface StackIntegrationHealth {
  stackConnected: boolean;
  databaseConnected: boolean;
  lastSyncTimestamp?: Date;
  pendingSyncs: number;
  errors: StackIntegrationError[];
}