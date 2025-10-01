/**
 * Check Test Data Script
 *
 * Verifies that the database has sufficient test data for performance benchmarking
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});

async function checkTestData() {
  console.log('🔍 Checking test data availability...\n');

  const client = await pool.connect();
  try {
    // Get a test user ID
    const userResult = await client.query(`
      SELECT id, name, email FROM neon_auth.users_sync
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (userResult.rows.length === 0) {
      console.error('❌ No users found in database');
      return false;
    }

    console.log(`✅ Found ${userResult.rows.length} users`);
    console.log(`   First user: ${userResult.rows[0].name || userResult.rows[0].email} (${userResult.rows[0].id})\n`);

    const testUserId = userResult.rows[0].id;

    // Check profiles and get tenant_id
    const profileResult = await client.query(`
      SELECT id, tenant_id FROM profiles WHERE id = $1
    `, [testUserId]);

    if (profileResult.rows.length === 0) {
      console.error('❌ No profile found for test user');
      return false;
    }

    const tenantId = profileResult.rows[0].tenant_id;
    console.log(`✅ Tenant ID: ${tenantId}\n`);

    // Set RLS context
    await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', testUserId]);

    // Check objectives
    const objectivesResult = await client.query(`
      SELECT COUNT(*) as count FROM objectives
      WHERE tenant_id = $1
    `, [tenantId]);
    const objectivesCount = parseInt(objectivesResult.rows[0].count);
    console.log(`${objectivesCount >= 100 ? '✅' : '⚠️ '} Objectives: ${objectivesCount} (target: 100+)`);

    // Check initiatives
    const initiativesResult = await client.query(`
      SELECT COUNT(*) as count FROM initiatives
      WHERE tenant_id = $1
    `, [tenantId]);
    const initiativesCount = parseInt(initiativesResult.rows[0].count);
    console.log(`${initiativesCount >= 100 ? '✅' : '⚠️ '} Initiatives: ${initiativesCount} (target: 100+)`);

    // Check activities
    const activitiesResult = await client.query(`
      SELECT COUNT(*) as count FROM activities
      WHERE tenant_id = $1
    `, [tenantId]);
    const activitiesCount = parseInt(activitiesResult.rows[0].count);
    console.log(`${activitiesCount >= 200 ? '✅' : '⚠️ '} Activities: ${activitiesCount} (target: 200+)`);

    // Check profiles count
    const profilesResult = await client.query(`
      SELECT COUNT(*) as count FROM profiles
      WHERE tenant_id = $1
    `, [tenantId]);
    const profilesCount = parseInt(profilesResult.rows[0].count);
    console.log(`${profilesCount >= 10 ? '✅' : '⚠️ '} Profiles: ${profilesCount} (target: 10+)\n`);

    // Summary
    const hasEnoughData = objectivesCount >= 100 &&
                          initiativesCount >= 100 &&
                          activitiesCount >= 200 &&
                          profilesCount >= 10;

    if (hasEnoughData) {
      console.log('✅ Database has sufficient test data for benchmarking');
      console.log(`\nTest user credentials needed:`);
      console.log(`   User ID: ${testUserId}`);
      console.log(`   Email: ${userResult.rows[0].email}`);
      console.log(`\nSet these environment variables before running benchmarks:`);
      console.log(`   export TEST_USER_EMAIL="${userResult.rows[0].email}"`);
      console.log(`   export TEST_USER_PASSWORD="<your-password>"`);
    } else {
      console.log('⚠️  Database does NOT have sufficient test data');
      console.log('\nYou can seed test data using:');
      console.log('   tsx scripts/seed-test-data.ts');
    }

    return hasEnoughData;

  } finally {
    client.release();
    await pool.end();
  }
}

checkTestData()
  .then((hasData) => {
    process.exit(hasData ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
