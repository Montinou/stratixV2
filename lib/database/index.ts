// Database client exports
export { 
  query, 
  transaction, 
  testConnection, 
  closePool, 
  getPool 
} from './client';

// Database types
export type { QueryResult } from 'pg';

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