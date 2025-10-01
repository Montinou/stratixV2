/**
 * Seed Test Data Script
 *
 * Generates realistic test data for performance benchmarking:
 * - 100+ objectives
 * - 100+ initiatives
 * - 200+ activities
 * - Additional profiles for team simulation
 */

import { Pool } from 'pg';
import { faker } from '@faker-js/faker';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});

// Configuration
const TARGET_OBJECTIVES = 120;
const TARGET_INITIATIVES = 150;
const TARGET_ACTIVITIES = 250;
const TARGET_PROFILES = 12;

const DEPARTMENTS = ['Engineering', 'Product', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR'];
const STATUSES = ['draft', 'in_progress', 'completed', 'cancelled'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

/**
 * Generate a random date within a range
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate random progress percentage based on status
 */
function progressForStatus(status: typeof STATUSES[number]): string {
  switch (status) {
    case 'draft': return '0';
    case 'completed': return '100';
    case 'cancelled': return String(Math.floor(Math.random() * 50));
    case 'in_progress': return String(Math.floor(Math.random() * 80) + 10);
  }
}

/**
 * Create additional test profiles
 */
async function seedProfiles(client: any, tenantId: string, existingUserId: string): Promise<string[]> {
  console.log('\n📊 Seeding profiles...');

  const existingProfiles = await client.query(
    'SELECT id FROM profiles WHERE tenant_id = $1',
    [tenantId]
  );

  const existingCount = existingProfiles.rows.length;
  const neededProfiles = Math.max(0, TARGET_PROFILES - existingCount);

  if (neededProfiles === 0) {
    console.log(`   ✅ Already have ${existingCount} profiles`);
    return existingProfiles.rows.map((r: any) => r.id);
  }

  console.log(`   Creating ${neededProfiles} additional profiles...`);

  // Get existing users from neon_auth.users_sync with their info
  const usersResult = await client.query(`
    SELECT id, email, name FROM neon_auth.users_sync
    WHERE id NOT IN (SELECT id::text FROM profiles WHERE tenant_id = $1::uuid)
    LIMIT $2
  `, [tenantId, neededProfiles]);

  const profileIds = existingProfiles.rows.map((r: any) => r.id);

  const roles = ['corporativo', 'gerente', 'empleado'];

  for (const user of usersResult.rows) {
    await client.query(`
      INSERT INTO profiles (id, tenant_id, full_name, email, role, department, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [
      user.id,
      tenantId,
      user.name || faker.person.fullName(),
      user.email || `user-${user.id}@test.com`,
      roles[Math.floor(Math.random() * roles.length)],
      DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]
    ]);
    profileIds.push(user.id);
  }

  console.log(`   ✅ Created ${neededProfiles} profiles (total: ${profileIds.length})`);
  return profileIds;
}

/**
 * Seed objectives
 */
async function seedObjectives(client: any, tenantId: string, userIds: string[]): Promise<string[]> {
  console.log('\n🎯 Seeding objectives...');

  const existingCount = await client.query(
    'SELECT COUNT(*) as count FROM objectives WHERE tenant_id = $1',
    [tenantId]
  );

  const current = parseInt(existingCount.rows[0].count);
  const needed = Math.max(0, TARGET_OBJECTIVES - current);

  if (needed === 0) {
    console.log(`   ✅ Already have ${current} objectives`);
    const existing = await client.query('SELECT id FROM objectives WHERE tenant_id = $1', [tenantId]);
    return existing.rows.map((r: any) => r.id);
  }

  console.log(`   Creating ${needed} objectives...`);
  const objectiveIds: string[] = [];

  for (let i = 0; i < needed; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    const assignedTo = userIds[Math.floor(Math.random() * userIds.length)];
    const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

    const startDate = randomDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      new Date()
    );
    const endDate = randomDate(
      new Date(),
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days ahead
    );

    const result = await client.query(`
      INSERT INTO objectives (
        tenant_id, title, description, department, status, priority,
        progress_percentage, target_value, current_value, unit,
        start_date, end_date, assigned_to, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      ) RETURNING id
    `, [
      tenantId,
      faker.company.catchPhrase(),
      faker.lorem.paragraph(),
      department,
      status,
      priority,
      progressForStatus(status),
      String(Math.floor(Math.random() * 900) + 100),
      String(Math.floor(Math.random() * 500)),
      ['units', 'revenue', 'customers', 'deals', '%'][Math.floor(Math.random() * 5)],
      startDate,
      endDate,
      assignedTo
    ]);

    objectiveIds.push(result.rows[0].id);

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${needed}`);
    }
  }

  console.log(`\r   ✅ Created ${needed} objectives (total: ${current + needed})`);
  return objectiveIds;
}

/**
 * Seed initiatives
 */
async function seedInitiatives(
  client: any,
  tenantId: string,
  userIds: string[],
  objectiveIds: string[]
): Promise<string[]> {
  console.log('\n🚀 Seeding initiatives...');

  const existingCount = await client.query(
    'SELECT COUNT(*) as count FROM initiatives WHERE tenant_id = $1',
    [tenantId]
  );

  const current = parseInt(existingCount.rows[0].count);
  const needed = Math.max(0, TARGET_INITIATIVES - current);

  if (needed === 0) {
    console.log(`   ✅ Already have ${current} initiatives`);
    const existing = await client.query('SELECT id FROM initiatives WHERE tenant_id = $1', [tenantId]);
    return existing.rows.map((r: any) => r.id);
  }

  console.log(`   Creating ${needed} initiatives...`);
  const initiativeIds: string[] = [];

  for (let i = 0; i < needed; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    const assignedTo = userIds[Math.floor(Math.random() * userIds.length)];
    const objectiveId = objectiveIds[Math.floor(Math.random() * objectiveIds.length)];

    const startDate = randomDate(
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      new Date()
    );
    const endDate = randomDate(
      new Date(),
      new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    );

    const result = await client.query(`
      INSERT INTO initiatives (
        tenant_id, objective_id, title, description, status, priority,
        progress_percentage, start_date, end_date, budget, actual_cost,
        assigned_to, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING id
    `, [
      tenantId,
      objectiveId,
      faker.commerce.productName(),
      faker.lorem.sentences(2),
      status,
      priority,
      progressForStatus(status),
      startDate,
      endDate,
      String(Math.floor(Math.random() * 90000) + 10000),
      String(Math.floor(Math.random() * 60000)),
      assignedTo
    ]);

    initiativeIds.push(result.rows[0].id);

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${needed}`);
    }
  }

  console.log(`\r   ✅ Created ${needed} initiatives (total: ${current + needed})`);
  return initiativeIds;
}

/**
 * Seed activities
 */
async function seedActivities(
  client: any,
  tenantId: string,
  userIds: string[],
  initiativeIds: string[]
): Promise<void> {
  console.log('\n📋 Seeding activities...');

  const existingCount = await client.query(
    'SELECT COUNT(*) as count FROM activities WHERE tenant_id = $1',
    [tenantId]
  );

  const current = parseInt(existingCount.rows[0].count);
  const needed = Math.max(0, TARGET_ACTIVITIES - current);

  if (needed === 0) {
    console.log(`   ✅ Already have ${current} activities`);
    return;
  }

  console.log(`   Creating ${needed} activities...`);

  for (let i = 0; i < needed; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    const assignedTo = userIds[Math.floor(Math.random() * userIds.length)];
    const initiativeId = initiativeIds[Math.floor(Math.random() * initiativeIds.length)];

    const dueDate = randomDate(
      new Date(),
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    );

    await client.query(`
      INSERT INTO activities (
        tenant_id, initiative_id, title, description, status, priority,
        due_date, estimated_hours, actual_hours, assigned_to,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
    `, [
      tenantId,
      initiativeId,
      faker.hacker.phrase(),
      faker.lorem.sentences(1),
      status,
      priority,
      dueDate,
      String(Math.floor(Math.random() * 40) + 1),
      status === 'completed' ? String(Math.floor(Math.random() * 50)) : null,
      assignedTo
    ]);

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${needed}`);
    }
  }

  console.log(`\r   ✅ Created ${needed} activities (total: ${current + needed})`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Seeding test data for performance benchmarking');
  console.log('==================================================\n');
  console.log('Targets:');
  console.log(`  - ${TARGET_OBJECTIVES} objectives`);
  console.log(`  - ${TARGET_INITIATIVES} initiatives`);
  console.log(`  - ${TARGET_ACTIVITIES} activities`);
  console.log(`  - ${TARGET_PROFILES} profiles`);

  const client = await pool.connect();

  try {
    // Get existing user and tenant
    const userResult = await client.query(`
      SELECT id FROM neon_auth.users_sync
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      throw new Error('No users found. Please create a user first through the application.');
    }

    const userId = userResult.rows[0].id;
    console.log(`\n✅ Using test user: ${userId}`);

    // Get tenant ID
    const profileResult = await client.query(
      'SELECT tenant_id FROM profiles WHERE id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('No profile found for user. Please complete onboarding first.');
    }

    const tenantId = profileResult.rows[0].tenant_id;
    console.log(`✅ Using tenant: ${tenantId}`);

    // Set RLS context
    await client.query('SELECT set_config($1, $2, false)', [
      'app.current_user_id',
      userId
    ]);

    // Seed data
    const userIds = await seedProfiles(client, tenantId, userId);
    const objectiveIds = await seedObjectives(client, tenantId, userIds);
    const initiativeIds = await seedInitiatives(client, tenantId, userIds, objectiveIds);
    await seedActivities(client, tenantId, userIds, initiativeIds);

    console.log('\n✅ Test data seeding completed successfully!');
    console.log('\nYou can now run performance benchmarks with:');
    console.log('   tsx scripts/browser-performance-benchmark.ts');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
