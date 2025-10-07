/**
 * Migration script: Remove tenantId from AI tables
 *
 * This migration removes the tenant_id column from all AI tables
 * as we only use company_id for data isolation in StratixV2.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or DATABASE_URL_UNPOOLED not found in environment');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔄 Starting migration: Remove tenantId from AI tables...');

    // Read migration SQL
    const migrationPath = path.join(__dirname, '../drizzle/0008_ai_tenantid_optional.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Changes applied:');
    console.log('  - Removed tenant_id from ai_usage_tracking');
    console.log('  - Removed tenant_id from ai_performance_benchmarks');
    console.log('  - Removed tenant_id from conversations');
    console.log('  - Removed tenant_id from conversation_messages');
    console.log('  - Removed tenant_id from ai_insights');
    console.log('  - Removed tenant_id from knowledge_base');
    console.log('  - Removed tenant_id from ai_configuration');
    console.log('');
    console.log('💡 All tables now use only company_id for data isolation');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
