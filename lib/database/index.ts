// Database client exports
export { 
  query, 
  transaction, 
  testConnection, 
  closePool, 
  getPool,
  getDrizzleClient,
  db
} from './client';

// Repository exports - Clean access to all repositories
export { ProfilesRepository } from './queries/profiles';
export { ObjectivesRepository } from './queries/objectives';
export { InitiativesRepository } from './queries/initiatives';
export { ActivitiesRepository } from './queries/activities';

// Repository type exports
export type { Profile } from './queries/profiles';
export type { Objective, FilterParams } from './queries/objectives';
export type { InitiativeWithRelations } from './queries/initiatives';
export type { Activity } from './queries/activities';

// Database types
export type { QueryResult } from 'pg';

// Schema exports for direct access when needed
export * from './schema';

// Service layer exports - Maintained for API compatibility
export {
  ObjectivesService,
  InitiativesService,
  ActivitiesService,
  ProfilesService,
  CompaniesService,
  type Company
} from './services';

// Common database utilities
export const formatId = (id: string): string => {
  // Ensure UUID format for PostgreSQL
  return id;
};

export const formatTimestamp = (date: Date): string => {
  return date.toISOString();
};

// Error handling utilities
export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const handleDatabaseError = (error: unknown): DatabaseError => {
  if (error instanceof DatabaseError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new DatabaseError(error.message, error);
  }
  
  return new DatabaseError('Unknown database error', error);
};