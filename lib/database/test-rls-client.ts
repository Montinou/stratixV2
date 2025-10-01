/**
 * Test script for RLS Client Infrastructure
 *
 * This script validates that the RLS context is properly set before queries
 * and that the database connection works correctly.
 *
 * Run with: npx tsx lib/database/test-rls-client.ts
 */

import { setUserContext, withRLSContext, getDb, closePool } from './rls-client';
import { companies } from '@/db/okr-schema';
import { sql } from 'drizzle-orm';

async function testRLSClient(): Promise<void> {
  console.log('🧪 Testing RLS Client Infrastructure\n');

  try {
    // Test 1: Validate error handling for invalid user IDs
    console.log('Test 1: Validating error handling...');
    try {
      await setUserContext('');
      console.log('❌ FAILED: Should have thrown error for empty user ID');
      process.exit(1);
    } catch (error) {
      if (error instanceof Error && error.message.includes('User ID is required')) {
        console.log('✅ PASSED: Correctly rejects empty user ID\n');
      } else {
        console.log('❌ FAILED: Wrong error message');
        process.exit(1);
      }
    }

    // Test 2: Verify database connection
    console.log('Test 2: Verifying database connection...');
    const db = getDb();
    const result = await db.execute(sql`SELECT 1 as test`);
    if (result.rows.length === 1) {
      console.log('✅ PASSED: Database connection successful\n');
    } else {
      console.log('❌ FAILED: Database connection issue');
      process.exit(1);
    }

    // Test 3: Verify RLS context setting
    console.log('Test 3: Testing RLS context setting...');
    const testUserId = 'test-user-123';
    await setUserContext(testUserId);

    // Verify the context was set by querying the config
    const contextResult = await db.execute(
      sql`SELECT current_setting('app.current_user_id', true) as user_id`
    );

    if (contextResult.rows[0]?.user_id === testUserId) {
      console.log('✅ PASSED: RLS context set correctly\n');
    } else {
      console.log('❌ FAILED: RLS context not set properly');
      console.log('Expected:', testUserId);
      console.log('Got:', contextResult.rows[0]?.user_id);
      process.exit(1);
    }

    // Test 4: Test withRLSContext wrapper
    console.log('Test 4: Testing withRLSContext wrapper...');
    const testUserId2 = 'test-user-456';

    const companyCount = await withRLSContext(testUserId2, async (db) => {
      // Verify context is set within the callback
      const contextCheck = await db.execute(
        sql`SELECT current_setting('app.current_user_id', true) as user_id`
      );

      if (contextCheck.rows[0]?.user_id !== testUserId2) {
        throw new Error('Context not set correctly in withRLSContext');
      }

      // Perform a real query (this will work even if there are no companies)
      const companies_result = await db.execute(
        sql`SELECT COUNT(*) as count FROM companies`
      );
      return companies_result.rows[0]?.count || 0;
    });

    console.log('✅ PASSED: withRLSContext works correctly');
    console.log(`   Found ${companyCount} companies in database\n`);

    // Test 5: Verify connection cleanup
    console.log('Test 5: Testing connection pool cleanup...');
    await closePool();
    console.log('✅ PASSED: Connection pool closed successfully\n');

    console.log('🎉 All tests passed!');
    console.log('\n✅ RLS Client Infrastructure is ready for use');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    await closePool();
    process.exit(1);
  }
}

// Run tests
testRLSClient();
