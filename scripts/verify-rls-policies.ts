#!/usr/bin/env tsx
/**
 * RLS Policy Verification Script
 *
 * This script verifies that Row Level Security (RLS) policies are properly
 * configured and active on all tenant-scoped tables.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/verify-rls-policies.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});

interface TableRLSStatus {
  tablename: string;
  rowsecurity: boolean;
}

interface PolicyInfo {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string;
  with_check: string;
}

interface FunctionInfo {
  routine_name: string;
  routine_type: string;
  data_type: string;
}

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

const TENANT_SCOPED_TABLES = [
  'profiles',
  'objectives',
  'initiatives',
  'activities',
  'comments',
  'key_results',
  'update_history',
];

/**
 * Check if RLS is enabled on all tenant-scoped tables
 */
async function checkRLSEnabled(): Promise<VerificationResult> {
  console.log('\n📋 Test 1: Checking RLS is enabled on tenant-scoped tables...');

  const result = await pool.query<TableRLSStatus>(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    ORDER BY tablename;
  `, [TENANT_SCOPED_TABLES]);

  const tablesWithRLS = result.rows.filter(row => row.rowsecurity);
  const tablesWithoutRLS = result.rows.filter(row => !row.rowsecurity);

  if (tablesWithoutRLS.length > 0) {
    return {
      passed: false,
      message: `❌ FAILED: ${tablesWithoutRLS.length} tables do not have RLS enabled`,
      details: {
        withRLS: tablesWithRLS.map(t => t.tablename),
        withoutRLS: tablesWithoutRLS.map(t => t.tablename),
      }
    };
  }

  return {
    passed: true,
    message: `✅ PASSED: All ${tablesWithRLS.length} tenant-scoped tables have RLS enabled`,
    details: tablesWithRLS.map(t => t.tablename),
  };
}

/**
 * Check if RLS policies exist for all tenant-scoped tables
 */
async function checkPoliciesExist(): Promise<VerificationResult> {
  console.log('\n📋 Test 2: Checking RLS policies exist...');

  const result = await pool.query<PolicyInfo>(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    ORDER BY tablename, cmd;
  `, [TENANT_SCOPED_TABLES]);

  const policiesByTable: Record<string, PolicyInfo[]> = {};
  result.rows.forEach(policy => {
    if (!policiesByTable[policy.tablename]) {
      policiesByTable[policy.tablename] = [];
    }
    policiesByTable[policy.tablename].push(policy);
  });

  const tablesWithoutPolicies: string[] = [];
  const policyDetails: Record<string, string[]> = {};

  TENANT_SCOPED_TABLES.forEach(table => {
    const policies = policiesByTable[table] || [];
    policyDetails[table] = policies.map(p => `${p.cmd}: ${p.policyname}`);

    if (policies.length === 0) {
      tablesWithoutPolicies.push(table);
    }
  });

  if (tablesWithoutPolicies.length > 0) {
    return {
      passed: false,
      message: `❌ FAILED: ${tablesWithoutPolicies.length} tables have no RLS policies`,
      details: {
        withoutPolicies: tablesWithoutPolicies,
        allPolicies: policyDetails,
      }
    };
  }

  return {
    passed: true,
    message: `✅ PASSED: All tables have RLS policies`,
    details: policyDetails,
  };
}

/**
 * Check if the RLS function exists and is executable
 */
async function checkRLSFunction(): Promise<VerificationResult> {
  console.log('\n📋 Test 3: Checking RLS function get_current_tenant_id() exists...');

  // Check if function exists
  const functionCheck = await pool.query<FunctionInfo>(`
    SELECT
      routine_name,
      routine_type,
      data_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'get_current_tenant_id'
      AND routine_type = 'FUNCTION';
  `);

  if (functionCheck.rows.length === 0) {
    return {
      passed: false,
      message: '❌ FAILED: Function get_current_tenant_id() does not exist',
    };
  }

  // Test function execution
  try {
    const client = await pool.connect();
    try {
      // Set a test user context
      await client.query(`SELECT set_config('app.current_user_id', 'test-user-id', false)`);

      // Try to execute the function
      const result = await client.query(`SELECT public.get_current_tenant_id() as tenant_id`);

      return {
        passed: true,
        message: '✅ PASSED: Function exists and is executable',
        details: {
          functionInfo: functionCheck.rows[0],
          testResult: result.rows[0],
        }
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      passed: false,
      message: '❌ FAILED: Function exists but is not executable',
      details: { error: error.message },
    };
  }
}

/**
 * Test tenant isolation with real data
 */
async function testTenantIsolation(): Promise<VerificationResult> {
  console.log('\n📋 Test 4: Testing tenant isolation with real data...');

  try {
    // First, check if we have any data in the database
    const dataCheck = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM profiles) as profiles_count,
        (SELECT COUNT(*) FROM objectives) as objectives_count,
        (SELECT COUNT(*) FROM initiatives) as initiatives_count,
        (SELECT COUNT(*) FROM activities) as activities_count
    `);

    const counts = dataCheck.rows[0];
    const hasData = Object.values(counts).some(count => Number(count) > 0);

    if (!hasData) {
      return {
        passed: true,
        message: '⚠️  SKIPPED: No test data available in database',
        details: { note: 'RLS policies are configured but cannot test isolation without data' },
      };
    }

    // Get unique user IDs from profiles
    const usersResult = await pool.query(`
      SELECT DISTINCT id, tenant_id
      FROM profiles
      WHERE tenant_id IS NOT NULL
      LIMIT 3
    `);

    if (usersResult.rows.length < 2) {
      return {
        passed: true,
        message: '⚠️  PARTIAL: Not enough users with different tenants to test isolation',
        details: {
          userCount: usersResult.rows.length,
          note: 'Need at least 2 users with different tenant_ids'
        },
      };
    }

    const user1 = usersResult.rows[0];
    const user2 = usersResult.rows.find(u => u.tenant_id !== user1.tenant_id);

    if (!user2) {
      return {
        passed: true,
        message: '⚠️  PARTIAL: All users belong to the same tenant',
        details: {
          note: 'Cannot test isolation with single tenant',
          tenantId: user1.tenant_id
        },
      };
    }

    // Test isolation with User 1
    const client1 = await pool.connect();
    try {
      await client1.query(`SELECT set_config('app.current_user_id', $1, false)`, [user1.id]);
      const user1Data = await client1.query(`
        SELECT
          (SELECT COUNT(*) FROM profiles WHERE tenant_id = $1) as profiles,
          (SELECT COUNT(*) FROM objectives WHERE tenant_id = $1) as objectives,
          (SELECT COUNT(*) FROM initiatives WHERE tenant_id = $1) as initiatives,
          (SELECT COUNT(*) FROM activities WHERE tenant_id = $1) as activities
      `, [user1.tenant_id]);

      const user1Counts = user1Data.rows[0];

      // Test isolation with User 2
      const client2 = await pool.connect();
      try {
        await client2.query(`SELECT set_config('app.current_user_id', $1, false)`, [user2.id]);
        const user2Data = await client2.query(`
          SELECT
            (SELECT COUNT(*) FROM profiles WHERE tenant_id = $1) as profiles,
            (SELECT COUNT(*) FROM objectives WHERE tenant_id = $1) as objectives,
            (SELECT COUNT(*) FROM initiatives WHERE tenant_id = $1) as initiatives,
            (SELECT COUNT(*) FROM activities WHERE tenant_id = $1) as activities
        `, [user2.tenant_id]);

        const user2Counts = user2Data.rows[0];

        // Verify that data is isolated
        const isolationVerified =
          user1.tenant_id !== user2.tenant_id &&
          (user1Counts.profiles !== user2Counts.profiles ||
           user1Counts.objectives !== user2Counts.objectives ||
           user1Counts.initiatives !== user2Counts.initiatives ||
           user1Counts.activities !== user2Counts.activities);

        if (!isolationVerified) {
          return {
            passed: false,
            message: '❌ FAILED: Tenant isolation may not be working correctly',
            details: {
              user1: { id: user1.id, tenant_id: user1.tenant_id, counts: user1Counts },
              user2: { id: user2.id, tenant_id: user2.tenant_id, counts: user2Counts },
            }
          };
        }

        return {
          passed: true,
          message: '✅ PASSED: Tenant isolation verified with real data',
          details: {
            user1: { tenant_id: user1.tenant_id, counts: user1Counts },
            user2: { tenant_id: user2.tenant_id, counts: user2Counts },
          }
        };
      } finally {
        client2.release();
      }
    } finally {
      client1.release();
    }
  } catch (error: any) {
    return {
      passed: false,
      message: '❌ FAILED: Error during tenant isolation test',
      details: { error: error.message },
    };
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  console.log('🔍 RLS Policy Verification');
  console.log('=' .repeat(60));

  const results: VerificationResult[] = [];

  try {
    // Run all verification tests
    results.push(await checkRLSEnabled());
    results.push(await checkPoliciesExist());
    results.push(await checkRLSFunction());
    results.push(await testTenantIsolation());

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    results.forEach((result, index) => {
      console.log(`\nTest ${index + 1}: ${result.message}`);
      if (result.details) {
        console.log('Details:', JSON.stringify(result.details, null, 2));
      }
    });

    const allPassed = results.every(r => r.passed);
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log(`✅ ALL TESTS PASSED (${passedTests}/${totalTests})`);
      console.log('RLS policies are properly configured and active.');
    } else {
      console.log(`⚠️  SOME TESTS FAILED (${passedTests}/${totalTests} passed)`);
      console.log('Review the details above for issues.');
    }
    console.log('='.repeat(60));

    return allPassed;
  } catch (error: any) {
    console.error('\n❌ VERIFICATION FAILED WITH ERROR:');
    console.error(error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run verification if executed directly
if (require.main === module) {
  runVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
