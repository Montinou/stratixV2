/**
 * Centralized API Error Handling Utility
 * Provides consistent error responses across all API endpoints
 */

import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
  timestamp: string;
  details?: any;
}

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  AUTH_CONFIG_INVALID = 'AUTH_CONFIG_INVALID',
  AUTH_ERROR = 'AUTH_ERROR',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',

  // Database & Infrastructure
  DATABASE_ERROR = 'DATABASE_ERROR',
  DB_CONFIG_INVALID = 'DB_CONFIG_INVALID',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Validation & Input
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // External Services
  AI_GATEWAY_ERROR = 'AI_GATEWAY_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  code: ErrorCode,
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ApiErrorResponse = {
    error,
    code,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };

  return NextResponse.json(response, { status });
}

/**
 * Handle and categorize unknown errors
 */
export function handleUnknownError(error: unknown, context: string = 'API'): NextResponse {
  console.error(`${context} error:`, error);

  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('connection') ||
        error.message.includes('database') ||
        error.message.includes('ECONNREFUSED')) {
      return createErrorResponse(
        'Database connection error',
        ErrorCode.DATABASE_ERROR,
        'Unable to connect to the database. Please try again later.',
        503
      );
    }

    // Authentication errors
    if (error.message.includes('auth') ||
        error.message.includes('token') ||
        error.message.includes('unauthorized')) {
      return createErrorResponse(
        'Authentication error',
        ErrorCode.AUTH_ERROR,
        'Authentication session expired or invalid. Please sign in again.',
        401
      );
    }

    // Permission errors
    if (error.message.includes('permission') ||
        error.message.includes('access') ||
        error.message.includes('forbidden')) {
      return createErrorResponse(
        'Access denied',
        ErrorCode.ACCESS_DENIED,
        'Insufficient permissions to perform this action.',
        403
      );
    }

    // AI Gateway errors
    if (error.message.includes('AI_GATEWAY') ||
        error.message.includes('gateway') ||
        error.message.includes('model')) {
      return createErrorResponse(
        'AI Gateway error',
        ErrorCode.AI_GATEWAY_ERROR,
        'AI service is currently unavailable. Please try again later.',
        503
      );
    }

    // Rate limiting errors
    if (error.message.includes('rate limit') ||
        error.message.includes('too many requests')) {
      return createErrorResponse(
        'Rate limit exceeded',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please wait before trying again.',
        429
      );
    }

    // Validation errors
    if (error.message.includes('validation') ||
        error.message.includes('invalid') ||
        error.name === 'ZodError') {
      return createErrorResponse(
        'Validation error',
        ErrorCode.VALIDATION_ERROR,
        'Invalid input data provided.',
        400,
        error.message
      );
    }
  }

  // Generic server error
  return createErrorResponse(
    'Internal server error',
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred. Please try again later.',
    500
  );
}

/**
 * Common error responses for quick use
 */
export const CommonErrors = {
  unauthorized: () => createErrorResponse(
    'Authentication required',
    ErrorCode.UNAUTHORIZED,
    'You must be authenticated to access this resource.',
    401
  ),

  forbidden: () => createErrorResponse(
    'Access denied',
    ErrorCode.ACCESS_DENIED,
    'You do not have permission to access this resource.',
    403
  ),

  notFound: (resource: string = 'Resource') => createErrorResponse(
    'Not found',
    ErrorCode.NOT_FOUND,
    `${resource} not found.`,
    404
  ),

  methodNotAllowed: (method: string) => createErrorResponse(
    'Method not allowed',
    ErrorCode.METHOD_NOT_ALLOWED,
    `HTTP method ${method} is not allowed for this endpoint.`,
    405
  ),

  validationError: (details: any) => createErrorResponse(
    'Validation error',
    ErrorCode.VALIDATION_ERROR,
    'Invalid input data provided.',
    400,
    details
  ),

  rateLimitExceeded: () => createErrorResponse(
    'Rate limit exceeded',
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please wait before trying again.',
    429
  ),

  serviceUnavailable: (service: string = 'Service') => createErrorResponse(
    'Service unavailable',
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    `${service} is currently unavailable. Please try again later.`,
    503
  ),

  configurationError: (component: string) => createErrorResponse(
    'Configuration error',
    ErrorCode.DB_CONFIG_INVALID,
    `${component} configuration is invalid.`,
    500
  )
};

/**
 * Wrapper for API routes with automatic error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleUnknownError(error, 'API Handler');
    }
  };
}

/**
 * Environment validation wrapper for API routes
 */
export function withValidation(
  authRequired: boolean = true,
  databaseRequired: boolean = true
) {
  return function <T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      try {
        // Environment validation
        if (authRequired) {
          const { validateAuthConfig } = await import('@/lib/validation/environment');
          if (!validateAuthConfig()) {
            return CommonErrors.configurationError('Authentication');
          }
        }

        if (databaseRequired) {
          const { validateDatabaseConfig } = await import('@/lib/validation/environment');
          if (!validateDatabaseConfig()) {
            return CommonErrors.configurationError('Database');
          }
        }

        return await handler(...args);
      } catch (error) {
        return handleUnknownError(error, 'Validation Wrapper');
      }
    };
  };
}