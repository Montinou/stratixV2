import type { User } from "@stackframe/stack"

/**
 * Shared type definitions for Stack Auth integration across all streams
 * This file coordinates between Stream A (Database), Stream B (Hooks), and Stream C (Events)
 */

// Core Profile types (aligned with database schema)
export interface DatabaseProfile {
  userId: string
  fullName: string
  roleType: "corporativo" | "gerente" | "empleado"
  department: string
  companyId: string
  createdAt: string
  updatedAt: string
}

// Legacy interface for backward compatibility with current use-auth hook
export interface AuthProfile {
  id: string
  email: string
  full_name: string
  role: "corporativo" | "gerente" | "empleado"
  department: string | null
  manager_id: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

// Company interface (aligned with database schema)
export interface Company {
  id: string
  name: string
  slug?: string
  description?: string | null
  industry?: string | null
  size?: string | null
  logoUrl?: string | null
  settings?: any
  createdAt: string
  updatedAt: string
}

// Stack Auth event types
export type StackAuthEvent = "signIn" | "signOut" | "userUpdate"

export interface StackAuthEventPayload {
  type: StackAuthEvent
  user: User | null
  timestamp: Date
}

// Profile sync status
export type ProfileSyncStatus = "pending" | "syncing" | "synced" | "error"

export interface ProfileSyncResult {
  status: ProfileSyncStatus
  profile: DatabaseProfile | null
  company: Company | null
  error?: string
}

// Event handler types
export type StackEventHandler = (payload: StackAuthEventPayload) => Promise<void>

export interface StackEventHandlers {
  onSignIn?: StackEventHandler
  onSignOut?: StackEventHandler
  onUserUpdate?: StackEventHandler
}

// Profile lifecycle management
export interface ProfileLifecycleManager {
  createProfile: (user: User, companyId: string) => Promise<ProfileSyncResult>
  updateProfile: (userId: string, updates: Partial<DatabaseProfile>) => Promise<ProfileSyncResult>
  syncProfile: (user: User) => Promise<ProfileSyncResult>
  deleteProfile: (userId: string) => Promise<void>
}

// Session management
export interface SessionManager {
  refreshSession: (userId: string) => Promise<ProfileSyncResult>
  clearSession: () => void
  isSessionValid: () => boolean
}

// Error types for auth operations
export class AuthIntegrationError extends Error {
  constructor(
    message: string,
    public code: 'DATABASE_ERROR' | 'STACK_ERROR' | 'SYNC_ERROR' | 'SESSION_ERROR',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AuthIntegrationError'
  }
}

// Configuration for auth integration
export interface AuthIntegrationConfig {
  enableAutoProfileCreation: boolean
  defaultCompanyId?: string
  enableProfileSync: boolean
  enableSessionPersistence: boolean
  retryAttempts: number
  retryDelayMs: number
}

// Utility function to convert between profile formats
export function toAuthProfile(dbProfile: DatabaseProfile, email: string): AuthProfile {
  return {
    id: dbProfile.userId,
    email,
    full_name: dbProfile.fullName,
    role: dbProfile.roleType,
    department: dbProfile.department,
    manager_id: null, // Not implemented in current schema
    company_id: dbProfile.companyId,
    created_at: dbProfile.createdAt,
    updated_at: dbProfile.updatedAt,
  }
}

export function toDatabaseProfile(authProfile: AuthProfile): Omit<DatabaseProfile, 'createdAt' | 'updatedAt'> {
  return {
    userId: authProfile.id,
    fullName: authProfile.full_name,
    roleType: authProfile.role,
    department: authProfile.department || '',
    companyId: authProfile.company_id || '',
  }
}

// Stack user data extraction utilities
export function extractUserMetadata(user: User): {
  email: string
  displayName: string
  userId: string
} {
  return {
    email: user.primaryEmail || '',
    displayName: user.displayName || user.primaryEmail || '',
    userId: user.id,
  }
}

// Default configuration
export const DEFAULT_AUTH_CONFIG: AuthIntegrationConfig = {
  enableAutoProfileCreation: true,
  enableProfileSync: true,
  enableSessionPersistence: true,
  retryAttempts: 3,
  retryDelayMs: 1000,

}