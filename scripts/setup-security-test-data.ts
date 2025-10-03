#!/usr/bin/env tsx
/**
 * Setup Security Test Data
 *
 * Creates two test organizations with test data for security audit:
 * - Organization A: 5 objectives, 3 initiatives, 10 activities
 * - Organization B: 3 objectives, 2 initiatives, 5 activities
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface Organization {
  id: string;
  name: string;
  tenantId: string;
  userId: string;
  email: string;
}

class TestDataSetup {
  private pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL_UNPOOLED) {
      throw new Error('DATABASE_URL_UNPOOLED environment variable is required');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL_UNPOOLED,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  /**
   * Check existing organizations
   */
  async checkExistingOrganizations(): Promise<Organization[]> {
    const query = `
      SELECT
        c.id,
        c.name,
        p.tenant_id as "tenantId",
        u.id as "userId",
        u.email
      FROM companies c
      JOIN profiles p ON c.id = p.company_id
      JOIN neon_auth.users_sync u ON p.id::text = u.id
      WHERE p.role = 'corporativo'
      ORDER BY c.created_at;
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Create a test organization (if needed)
   */
  async createTestOrganization(name: string, slug: string): Promise<Organization> {
    console.log(`Creating test organization: ${name}...`);

    // For this audit, we'll use existing organization and just create test data
    // In production, you would create via the onboarding flow
    throw new Error('Organization creation should be done via the onboarding flow in the UI');
  }

  /**
   * Create test objectives for an organization
   */
  async createTestObjectives(
    org: Organization,
    count: number,
    areaNames: string[]
  ): Promise<void> {
    console.log(`Creating ${count} test objectives for ${org.name}...`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get or create areas for this organization
      const areaIds: string[] = [];
      for (const areaName of areaNames) {
        // Check if area exists
        let areaResult = await client.query(
          `SELECT id FROM areas WHERE company_id = $1 AND name = $2`,
          [org.id, areaName]
        );

        if (areaResult.rows.length === 0) {
          // Create new area
          areaResult = await client.query(
            `INSERT INTO areas (name, company_id, created_by, status)
             VALUES ($1, $2, $3, 'active')
             RETURNING id`,
            [areaName, org.id, org.userId]
          );
        }

        areaIds.push(areaResult.rows[0].id);
      }

      for (let i = 1; i <= count; i++) {
        const areaId = areaIds[i % areaIds.length];
        const status = ['no_iniciado', 'en_progreso', 'completado'][i % 3] as any;

        await client.query(
          `
          INSERT INTO objectives (
            title,
            description,
            area_id,
            status,
            progress,
            start_date,
            end_date,
            company_id,
            owner_id,
            tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            `Test Objective ${i} - ${org.name}`,
            `Description for test objective ${i}`,
            areaId,
            status,
            i * 10, // progress (0-50)
            '2025-01-01',
            '2025-12-31',
            org.id,
            org.userId,
            org.tenantId,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Created ${count} objectives`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create test initiatives for an organization
   */
  async createTestInitiatives(
    org: Organization,
    count: number,
    objectiveIds: string[]
  ): Promise<string[]> {
    console.log(`Creating ${count} test initiatives for ${org.name}...`);

    const client = await this.pool.connect();
    const initiativeIds: string[] = [];

    try {
      await client.query('BEGIN');

      for (let i = 1; i <= count; i++) {
        const objectiveId = objectiveIds[i % objectiveIds.length];
        const status = ['no_iniciado', 'en_progreso', 'completado'][i % 3] as any;

        const result = await client.query(
          `
          INSERT INTO initiatives (
            title,
            description,
            status,
            progress,
            start_date,
            end_date,
            objective_id,
            company_id,
            owner_id,
            tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `,
          [
            `Test Initiative ${i} - ${org.name}`,
            `Description for test initiative ${i}`,
            status,
            i * 15, // progress
            '2025-02-01',
            '2025-11-30',
            objectiveId,
            org.id,
            org.userId,
            org.tenantId,
          ]
        );

        initiativeIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');
      console.log(`✅ Created ${count} initiatives`);
      return initiativeIds;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create test activities for an organization
   */
  async createTestActivities(
    org: Organization,
    count: number,
    initiativeIds: string[]
  ): Promise<void> {
    console.log(`Creating ${count} test activities for ${org.name}...`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 1; i <= count; i++) {
        const initiativeId = initiativeIds[i % initiativeIds.length];
        const status = ['no_iniciado', 'en_progreso', 'completado'][i % 3] as any;

        await client.query(
          `
          INSERT INTO activities (
            title,
            description,
            status,
            progress,
            start_date,
            end_date,
            initiative_id,
            company_id,
            owner_id,
            tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            `Test Activity ${i} - ${org.name}`,
            `Description for test activity ${i}`,
            status,
            i * 5, // progress
            new Date().toISOString().split('T')[0], // today
            new Date(Date.now() + i * 86400000).toISOString().split('T')[0], // i days from now
            initiativeId,
            org.id,
            org.userId,
            org.tenantId,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Created ${count} activities`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get objective IDs for an organization
   */
  async getObjectiveIds(tenantId: string): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT id FROM objectives WHERE tenant_id = $1 ORDER BY created_at',
      [tenantId]
    );
    return result.rows.map(r => r.id);
  }

  /**
   * Delete existing test data for an organization
   */
  async cleanupTestData(tenantId: string): Promise<void> {
    console.log(`Cleaning up existing test data for tenant ${tenantId}...`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Delete in reverse order of dependencies
      await client.query('DELETE FROM activities WHERE tenant_id = $1', [tenantId]);
      await client.query('DELETE FROM initiatives WHERE tenant_id = $1', [tenantId]);
      await client.query('DELETE FROM objectives WHERE tenant_id = $1', [tenantId]);

      await client.query('COMMIT');
      console.log('✅ Test data cleaned up');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Main setup function
   */
  async setup(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔧 Setting Up Security Test Data');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      // Check existing organizations
      const orgs = await this.checkExistingOrganizations();

      console.log(`Found ${orgs.length} existing organization(s)\n`);

      if (orgs.length < 2) {
        console.error('❌ Need at least 2 organizations with corporativo users');
        console.error('Please create a second organization via the UI onboarding flow');
        console.error('Current organizations:', orgs);
        throw new Error('Insufficient organizations for security testing');
      }

      const [orgA, orgB] = orgs.slice(0, 2);

      console.log('Organization A:', orgA.name);
      console.log('Organization B:', orgB.name);
      console.log('');

      // Clean up any existing test data
      await this.cleanupTestData(orgA.tenantId);
      await this.cleanupTestData(orgB.tenantId);

      console.log('');

      // Setup Organization A: 5 objectives, 3 initiatives, 10 activities
      console.log('Setting up Organization A test data...\n');
      await this.createTestObjectives(orgA, 5, ['Sales', 'Marketing', 'Engineering']);
      const orgAObjectiveIds = await this.getObjectiveIds(orgA.tenantId);
      const orgAInitiativeIds = await this.createTestInitiatives(orgA, 3, orgAObjectiveIds);
      await this.createTestActivities(orgA, 10, orgAInitiativeIds);

      console.log('');

      // Setup Organization B: 3 objectives, 2 initiatives, 5 activities
      console.log('Setting up Organization B test data...\n');
      await this.createTestObjectives(orgB, 3, ['HR', 'Finance']);
      const orgBObjectiveIds = await this.getObjectiveIds(orgB.tenantId);
      const orgBInitiativeIds = await this.createTestInitiatives(orgB, 2, orgBObjectiveIds);
      await this.createTestActivities(orgB, 5, orgBInitiativeIds);

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  ✅ Test Data Setup Complete');
      console.log('═══════════════════════════════════════════════════════════\n');

      console.log('Organization A:');
      console.log(`  - Name: ${orgA.name}`);
      console.log(`  - Objectives: 5`);
      console.log(`  - Initiatives: 3`);
      console.log(`  - Activities: 10\n`);

      console.log('Organization B:');
      console.log(`  - Name: ${orgB.name}`);
      console.log(`  - Objectives: 3`);
      console.log(`  - Initiatives: 2`);
      console.log(`  - Activities: 5\n`);

      console.log('Ready to run security audit with:\n');
      console.log('  npx tsx scripts/security-audit-test.ts\n');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

async function main() {
  const setup = new TestDataSetup();
  await setup.setup();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
