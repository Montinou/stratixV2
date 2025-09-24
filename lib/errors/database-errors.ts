import { DatabaseError as PgError } from 'pg';
import { dbLogger, LogLevel } from '../logging/database-logger';

export enum DatabaseErrorCode {
  // Connection errors
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  POOL_EXHAUSTED = 'POOL_EXHAUSTED',
  
  // Query errors
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',
  CHECK_VIOLATION = 'CHECK_VIOLATION',
  
  // Transaction errors
  TRANSACTION_DEADLOCK = 'TRANSACTION_DEADLOCK',
  TRANSACTION_ROLLBACK = 'TRANSACTION_ROLLBACK',
  SERIALIZATION_FAILURE = 'SERIALIZATION_FAILURE',
  
  // Permission errors
  INSUFFICIENT_PRIVILEGE = 'INSUFFICIENT_PRIVILEGE',
  INVALID_AUTHORIZATION = 'INVALID_AUTHORIZATION',
  
  // Data errors
  DATA_EXCEPTION = 'DATA_EXCEPTION',
  NUMERIC_VALUE_OUT_OF_RANGE = 'NUMERIC_VALUE_OUT_OF_RANGE',
  INVALID_TEXT_REPRESENTATION = 'INVALID_TEXT_REPRESENTATION',
  
  // System errors
  DISK_FULL = 'DISK_FULL',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Custom application errors
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface DatabaseErrorContext {
  operation: string;
  query?: string;
  params?: any[];
  connectionId?: string;
  retryCount?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class DatabaseError extends Error {
  public readonly code: DatabaseErrorCode;
  public readonly context: DatabaseErrorContext;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    code: DatabaseErrorCode,
    message: string,
    context: DatabaseErrorContext,
    isRetryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.context = context;
    this.isRetryable = isRetryable;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }

    // Log the error
    dbLogger.log({
      operation: {
        operation: context.operation,
        query: context.query,
        params: context.params,
        timestamp: context.timestamp
      },
      level: LogLevel.ERROR,
      error: this,
      metadata: {
        errorCode: code,
        isRetryable,
        retryCount: context.retryCount,
        ...context.metadata
      }
    });
  }
}

export class DatabaseErrorMapper {
  private static readonly pgErrorCodeMap: Record<string, DatabaseErrorCode> = {
    // Connection errors
    '08000': DatabaseErrorCode.CONNECTION_REFUSED,
    '08006': DatabaseErrorCode.CONNECTION_LOST,
    '08001': DatabaseErrorCode.CONNECTION_TIMEOUT,
    
    // Constraint violation errors
    '23000': DatabaseErrorCode.CONSTRAINT_VIOLATION,
    '23001': DatabaseErrorCode.CONSTRAINT_VIOLATION,
    '23502': DatabaseErrorCode.NOT_NULL_VIOLATION,
    '23503': DatabaseErrorCode.FOREIGN_KEY_VIOLATION,
    '23505': DatabaseErrorCode.UNIQUE_VIOLATION,
    '23514': DatabaseErrorCode.CHECK_VIOLATION,
    
    // Transaction errors
    '40001': DatabaseErrorCode.SERIALIZATION_FAILURE,
    '40P01': DatabaseErrorCode.TRANSACTION_DEADLOCK,
    '25P02': DatabaseErrorCode.TRANSACTION_ROLLBACK,
    
    // Permission errors
    '42501': DatabaseErrorCode.INSUFFICIENT_PRIVILEGE,
    '28000': DatabaseErrorCode.INVALID_AUTHORIZATION,
    
    // Syntax errors
    '42601': DatabaseErrorCode.SYNTAX_ERROR,
    '42000': DatabaseErrorCode.SYNTAX_ERROR,
    
    // Data errors
    '22000': DatabaseErrorCode.DATA_EXCEPTION,
    '22003': DatabaseErrorCode.NUMERIC_VALUE_OUT_OF_RANGE,
    '22P02': DatabaseErrorCode.INVALID_TEXT_REPRESENTATION,
    
    // System errors
    '53100': DatabaseErrorCode.DISK_FULL,
    '53200': DatabaseErrorCode.OUT_OF_MEMORY,
    '42P01': DatabaseErrorCode.CONFIGURATION_ERROR,
  };

  public static mapError(
    error: Error,
    context: DatabaseErrorContext
  ): DatabaseError {
    // Handle PostgreSQL errors
    if (this.isPgError(error)) {
      const pgError = error as PgError;
      const code = this.pgErrorCodeMap[pgError.code] || DatabaseErrorCode.UNKNOWN_ERROR;
      const isRetryable = this.isRetryableError(code, pgError.code);
      
      return new DatabaseError(
        code,
        `Database error: ${pgError.message}`,
        context,
        isRetryable,
        error
      );
    }

    // Handle connection errors
    if (this.isConnectionError(error)) {
      return new DatabaseError(
        DatabaseErrorCode.CONNECTION_REFUSED,
        `Connection error: ${error.message}`,
        context,
        true,
        error
      );
    }

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      return new DatabaseError(
        DatabaseErrorCode.CONNECTION_TIMEOUT,
        `Operation timeout: ${error.message}`,
        context,
        true,
        error
      );
    }

    // Handle pool exhaustion
    if (this.isPoolExhaustedError(error)) {
      return new DatabaseError(
        DatabaseErrorCode.POOL_EXHAUSTED,
        `Connection pool exhausted: ${error.message}`,
        context,
        true,
        error
      );
    }

    // Default to unknown error
    return new DatabaseError(
      DatabaseErrorCode.UNKNOWN_ERROR,
      `Unknown database error: ${error.message}`,
      context,
      false,
      error
    );
  }

  private static isPgError(error: Error): error is PgError {
    return error.name === 'DatabaseError' && 'code' in error;
  }

  private static isConnectionError(error: Error): boolean {
    const connectionKeywords = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'connection refused',
      'connect ECONNREFUSED'
    ];
    
    return connectionKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isTimeoutError(error: Error): boolean {
    const timeoutKeywords = [
      'timeout',
      'ETIMEDOUT',
      'connection timeout',
      'query timeout'
    ];
    
    return timeoutKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isPoolExhaustedError(error: Error): boolean {
    return error.message.toLowerCase().includes('pool') &&
           (error.message.toLowerCase().includes('exhausted') ||
            error.message.toLowerCase().includes('timeout'));
  }

  private static isRetryableError(code: DatabaseErrorCode, pgCode?: string): boolean {
    const retryableCodes = new Set([
      DatabaseErrorCode.CONNECTION_REFUSED,
      DatabaseErrorCode.CONNECTION_TIMEOUT,
      DatabaseErrorCode.CONNECTION_LOST,
      DatabaseErrorCode.POOL_EXHAUSTED,
      DatabaseErrorCode.TRANSACTION_DEADLOCK,
      DatabaseErrorCode.SERIALIZATION_FAILURE,
      DatabaseErrorCode.OUT_OF_MEMORY
    ]);

    // PostgreSQL specific retryable errors
    const retryablePgCodes = new Set([
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '53200', // out_of_memory
      '08000', // connection_exception
      '08006', // connection_failure
    ]);

    return retryableCodes.has(code) || (pgCode && retryablePgCodes.has(pgCode));
  }
}

export class DatabaseErrorHandler {
  private static readonly maxRetries = 3;
  private static readonly baseRetryDelay = 1000; // 1 second

  public static async handleError<T>(
    error: Error,
    context: DatabaseErrorContext,
    retryFn?: () => Promise<T>
  ): Promise<never | T> {
    const databaseError = DatabaseErrorMapper.mapError(error, context);

    // If error is not retryable or no retry function provided, throw immediately
    if (!databaseError.isRetryable || !retryFn) {
      throw databaseError;
    }

    // If we've exceeded max retries, throw the error
    const retryCount = context.retryCount || 0;
    if (retryCount >= this.maxRetries) {
      throw new DatabaseError(
        databaseError.code,
        `Max retries (${this.maxRetries}) exceeded: ${databaseError.message}`,
        { ...context, retryCount },
        false,
        databaseError
      );
    }

    // Calculate retry delay with exponential backoff
    const delay = this.baseRetryDelay * Math.pow(2, retryCount);
    
    dbLogger.log({
      operation: {
        operation: `${context.operation}_retry`,
        timestamp: new Date()
      },
      level: LogLevel.WARN,
      metadata: {
        retryCount: retryCount + 1,
        maxRetries: this.maxRetries,
        delayMs: delay,
        errorCode: databaseError.code
      }
    });

    // Wait before retrying
    await this.sleep(delay);

    // Retry with incremented count
    try {
      return await retryFn();
    } catch (retryError) {
      return this.handleError(
        retryError as Error,
        { ...context, retryCount: retryCount + 1 },
        retryFn
      );
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static createContext(
    operation: string,
    query?: string,
    params?: any[],
    connectionId?: string,
    metadata?: Record<string, any>
  ): DatabaseErrorContext {
    return {
      operation,
      query,
      params,
      connectionId,
      timestamp: new Date(),
      metadata
    };
  }

  public static isRetryableError(error: Error): boolean {
    if (error instanceof DatabaseError) {
      return error.isRetryable;
    }
    
    // Check for common retryable error patterns
    return DatabaseErrorMapper.mapError(
      error,
      { operation: 'error_check', timestamp: new Date() }
    ).isRetryable;
  }
}

// Utility function to wrap database operations with error handling
export function withErrorHandling<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const context = DatabaseErrorHandler.createContext(
        operation,
        undefined,
        undefined,
        undefined,
        { args: args.length }
      );
      
      return DatabaseErrorHandler.handleError(
        error as Error,
        context,
        () => fn(...args)
      );
    }
  };
}

// Export commonly used error types
export { DatabaseError, DatabaseErrorHandler, DatabaseErrorMapper };