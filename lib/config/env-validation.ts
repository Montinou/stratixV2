/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are present
 * and provides helpful error messages if they are missing.
 */

export interface RequiredEnvVars {
  // NeonDB Database Configuration
  DATABASE_URL: string
  DATABASE_URL_UNPOOLED: string
  NEON_PROJECT_ID: string
  
  // PostgreSQL Standard Variables (optional - for compatibility)
  PGDATABASE?: string
  PGHOST?: string
  PGUSER?: string
  PGPASSWORD?: string
  
  // NeonAuth (Stack) Configuration
  NEXT_PUBLIC_STACK_PROJECT_ID: string
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: string
  STACK_SECRET_SERVER_KEY: string
}

/**
 * Validates that all required environment variables are present
 * @throws Error if required environment variables are missing
 */
export function validateEnvironment(): RequiredEnvVars {
  const missingVars: string[] = []
  
  // Required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'NEON_PROJECT_ID',
    'NEXT_PUBLIC_STACK_PROJECT_ID',
    'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
    'STACK_SECRET_SERVER_KEY'
  ]
  
  // Check for missing required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.\n' +
      'See .env.example for the complete list of required variables.'
    )
  }
  
  // Validate NeonDB connection strings
  validateDatabaseUrls()
  
  // Validate NeonAuth configuration
  validateNeonAuthConfig()
  
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED!,
    NEON_PROJECT_ID: process.env.NEON_PROJECT_ID!,
    PGDATABASE: process.env.PGDATABASE,
    PGHOST: process.env.PGHOST,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY!,
  }
}

/**
 * Validates that DATABASE_URL environment variables are valid PostgreSQL connection strings
 */
function validateDatabaseUrls() {
  const dbUrl = process.env.DATABASE_URL
  const dbUrlUnpooled = process.env.DATABASE_URL_UNPOOLED
  
  if (dbUrl && !dbUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string (starting with postgresql://)')
  }
  
  if (dbUrlUnpooled && !dbUrlUnpooled.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL_UNPOOLED must be a valid PostgreSQL connection string (starting with postgresql://)')
  }
  
  // Validate that both URLs are for Neon (should contain neon.tech)
  if (dbUrl && !dbUrl.includes('neon.tech')) {
    console.warn('Warning: DATABASE_URL does not appear to be a Neon database URL')
  }
  
  if (dbUrlUnpooled && !dbUrlUnpooled.includes('neon.tech')) {
    console.warn('Warning: DATABASE_URL_UNPOOLED does not appear to be a Neon database URL')
  }
}

/**
 * Validates NeonAuth (Stack) configuration
 */
function validateNeonAuthConfig() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
  const secretKey = process.env.STACK_SECRET_SERVER_KEY
  
  if (publishableKey && !publishableKey.startsWith('pck_')) {
    throw new Error('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY must start with "pck_"')
  }
  
  if (secretKey && !secretKey.startsWith('ssk_')) {
    throw new Error('STACK_SECRET_SERVER_KEY must start with "ssk_"')
  }
  
  if (projectId && projectId.length < 10) {
    throw new Error('NEXT_PUBLIC_STACK_PROJECT_ID appears to be invalid (too short)')
  }
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Checks if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Gets the current environment name
 */
export function getEnvironment(): 'development' | 'production' | 'test' | string {
  return process.env.NODE_ENV || 'development'
}

/**
 * Environment validation for use in Next.js configuration
 * This will run during build time and provide early feedback on missing variables
 */
export function validateEnvironmentForBuild(): void {
  try {
    validateEnvironment()
    console.log('✅ Environment validation passed')
  } catch (error) {
    console.error('❌ Environment validation failed:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}