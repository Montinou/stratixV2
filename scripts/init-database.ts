import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query, testConnection } from '@/lib/database/client';

// Load environment variables
config({ path: '.env.local' });

async function initDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Read and execute schema files
    const schemaFiles = [
      '@scripts/init/001_initial_schema_neondb.sql',
      '@scripts/migrations/002_add_multitenant_support_neondb.sql',
      '@scripts/migrations/003_add_ai_suggestions_neondb.sql',
      '@scripts/init/004_seed_sample_data_neondb.sql'
    ];
    
    for (const schemaFile of schemaFiles) {
      try {
        console.log(`📜 Executing ${schemaFile}...`);
        const schemaPath = join(process.cwd(), schemaFile);
        const schemaSQL = readFileSync(schemaPath, 'utf-8');
        
        await query(schemaSQL);
        console.log(`✅ Successfully executed ${schemaFile}`);
      } catch (error) {
        console.warn(`⚠️  Warning executing ${schemaFile}:`, error);
        // Continue with other files - some might fail due to existing objects
      }
    }
    
    console.log('🎉 Database initialization completed!');
    console.log('📊 Database is ready for use');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

export { initDatabase };