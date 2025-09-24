import { defineConfig } from 'drizzle-kit';


const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

export default defineConfig({
  // Database configuration
  dialect: 'postgresql',
  dbCredentials: {
    // Use unpooled connection for migrations in production
    url: isProduction || isStaging 
      ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!
      : process.env.DATABASE_URL!,
  },
  
  // Schema configuration
  schema: './lib/database/schema.ts',
  
  // Migration configuration
  out: './drizzle',
  
  // Environment-specific logging
  verbose: !isProduction, // Disable verbose logging in production
  
  // Enable strict mode for better type safety
  strict: true,
  
  // Production-optimized migration configuration
  migrations: {
    prefix: 'neondb', // Updated prefix for NeonDB
    table: '__drizzle_migrations',
    schema: 'public',
  },
  
  // Introspection configuration for schema generation
  introspect: {
    casing: 'snake_case',
  },
  
  // Production performance optimizations
  ...(isProduction && {
    // Production-specific configuration
    breakpoints: true, // Enable migration breakpoints for safer deployments
    
    // Migration safety features
    migrations: {
      prefix: 'neondb',
      table: '__drizzle_migrations',
      schema: 'public',
    },
  }),
  
  // Staging configuration
  ...(isStaging && {
    // More verbose in staging for testing
    verbose: true,
    
    // Use breakpoints in staging too
    breakpoints: true,
  }),
});