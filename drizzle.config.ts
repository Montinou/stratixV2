import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Database configuration
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  
  // Schema configuration
  schema: './lib/database/schema.ts',
  
  // Migration configuration
  out: './drizzle',
  
  // Verbose logging for development
  verbose: true,
  
  // Enable strict mode for better type safety
  strict: true,
  
  // Migration configuration options
  migrations: {
    prefix: 'supabase',
    table: '__drizzle_migrations',
    schema: 'public',
  },
  
  // Enable introspection for schema generation
  introspect: {
    casing: 'snake_case',
  },
});