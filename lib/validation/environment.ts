/**
 * Environment Variable Validation
 * Critical security and configuration validation for Stack Auth, AI Gateway, and Neon database
 */

import { z } from 'zod';

// Define the environment schema with all required variables
const environmentSchema = z.object({
  // Stack Auth Configuration
  NEXT_PUBLIC_STACK_PROJECT_ID: z.string().min(1, 'Stack project ID is required'),
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: z.string().min(1, 'Stack publishable client key is required'),
  STACK_SECRET_SERVER_KEY: z.string().min(1, 'Stack secret server key is required'),

  // AI Gateway Configuration
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI Gateway API key is required'),

  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DATABASE_URL_UNPOOLED: z.string().url('DATABASE_URL_UNPOOLED must be a valid URL').optional(),

  // Neon Configuration
  NEON_API_KEY: z.string().min(1, 'Neon API key is required').optional(),
  NEON_PROJECT_ID: z.string().min(1, 'Neon project ID is required').optional(),

  // Postgres Configuration (for direct access)
  PGDATABASE: z.string().min(1, 'Postgres database name is required').optional(),
  PGHOST: z.string().min(1, 'Postgres host is required').optional(),
  PGUSER: z.string().min(1, 'Postgres user is required').optional(),
  PGPASSWORD: z.string().min(1, 'Postgres password is required').optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Optional configurations
  VERCEL_OIDC_TOKEN: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

/**
 * Validate environment variables and throw detailed errors for missing/invalid values
 */
export function validateEnvironment(): Environment {
  try {
    return environmentSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => {
        return `${err.path.join('.')}: ${err.message}`;
      });

      console.error('Environment validation failed:');
      missingVars.forEach(varError => {
        console.error(`  ❌ ${varError}`);
      });

      throw new Error(`Environment validation failed. Missing or invalid variables:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Check if authentication is properly configured
 */
export function validateAuthConfig(): boolean {
  try {
    const requiredAuthVars = [
      'NEXT_PUBLIC_STACK_PROJECT_ID',
      'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
      'STACK_SECRET_SERVER_KEY'
    ];

    for (const varName of requiredAuthVars) {
      if (!process.env[varName]) {
        console.error(`❌ Missing required auth variable: ${varName}`);
        return false;
      }
    }

    console.log('✅ Authentication configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Auth configuration validation failed:', error);
    return false;
  }
}

/**
 * Check if AI Gateway is properly configured
 */
export function validateAIGatewayConfig(): boolean {
  try {
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.error('❌ Missing AI_GATEWAY_API_KEY');
      return false;
    }

    if (!process.env.AI_GATEWAY_API_KEY.startsWith('vck_')) {
      console.error('❌ AI_GATEWAY_API_KEY should start with "vck_"');
      return false;
    }

    console.log('✅ AI Gateway configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ AI Gateway configuration validation failed:', error);
    return false;
  }
}

/**
 * Check if database configuration is properly set up
 */
export function validateDatabaseConfig(): boolean {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ Missing DATABASE_URL');
      return false;
    }

    // Validate DATABASE_URL format
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      console.error('❌ DATABASE_URL is not a valid URL');
      return false;
    }

    // Check for Neon database pattern
    if (!process.env.DATABASE_URL.includes('neon.tech')) {
      console.warn('⚠️ DATABASE_URL does not appear to be a Neon database URL');
    }

    console.log('✅ Database configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Database configuration validation failed:', error);
    return false;
  }
}

/**
 * Perform comprehensive environment validation
 */
export function performFullValidation(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate full environment
    validateEnvironment();
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
  }

  // Check individual configurations
  if (!validateAuthConfig()) {
    errors.push('Authentication configuration is invalid');
  }

  if (!validateAIGatewayConfig()) {
    errors.push('AI Gateway configuration is invalid');
  }

  if (!validateDatabaseConfig()) {
    errors.push('Database configuration is invalid');
  }

  // Check for missing authenticated database URL (used for RLS)
  if (!process.env.DATABASE_AUTHENTICATED_URL) {
    warnings.push('DATABASE_AUTHENTICATED_URL is missing - RLS features may not work');
  }

  if (!process.env.NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL) {
    warnings.push('NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL is missing - client-side RLS may not work');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get environment configuration status for debugging
 */
export function getEnvironmentStatus() {
  const validation = performFullValidation();

  return {
    validation,
    environment: process.env.NODE_ENV,
    hasAuthConfig: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    hasAIGateway: !!process.env.AI_GATEWAY_API_KEY,
    hasDatabase: !!process.env.DATABASE_URL,
    hasNeonConfig: !!(process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID),
    timestamp: new Date().toISOString()
  };
}

/**
 * Runtime environment validation that can be called from API routes
 */
export function validateRuntimeEnvironment(): void {
  const validation = performFullValidation();

  if (!validation.isValid) {
    console.error('🚨 Runtime environment validation failed:');
    validation.errors.forEach(error => console.error(`  ❌ ${error}`));
    validation.warnings.forEach(warning => console.warn(`  ⚠️ ${warning}`));

    throw new Error('Environment validation failed - check console for details');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    validation.warnings.forEach(warning => console.warn(`  ⚠️ ${warning}`));
  }

  console.log('✅ Runtime environment validation passed');
}