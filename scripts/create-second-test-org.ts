#!/usr/bin/env tsx
/**
 * Create Second Test Organization
 *
 * This script creates a second test organization directly in the database for security audit purposes.
 * Note: In production, organizations should only be created through the onboarding flow.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

class OrgCreator {
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

  async createTestOrganization(): Promise<void> {
    console.log('Creating second test organization for security audit...\n');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create a test user ID (UUID format that will be stored as text in Stack Auth)
      const testUserId = randomUUID(); // Stack Auth IDs are UUID formatted
      const testEmail = `test-user-${Date.now()}@securityaudit.test`;

      await client.query(
        `
        INSERT INTO neon_auth.users_sync (raw_json, updated_at)
        VALUES (
          $1::jsonb,
          NOW()
        )
      `,
        [
          JSON.stringify({
            id: testUserId,
            display_name: 'Test User Security Audit',
            primary_email: testEmail,
            signed_up_at_millis: Date.now(),
          }),
        ]
      );

      console.log(`✅ Created test user: ${testEmail} (${testUserId})`);

      // Create company
      const companyId = randomUUID();
      const companySlug = `test-org-${Date.now()}`;

      await client.query(
        `
        INSERT INTO companies (id, name, slug, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `,
        [companyId, 'Test Organization B', companySlug]
      );

      console.log(`✅ Created company: Test Organization B (${companyId})`);

      // Create profile (use same UUID as Stack Auth user)
      const profileId = testUserId; // profiles.id matches Stack Auth user ID (both UUIDs)
      const tenantId = companyId; // Tenant ID is same as company ID

      await client.query(
        `
        INSERT INTO profiles (id, email, full_name, role, company_id, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
        [profileId, testEmail, 'Test User Security Audit', 'corporativo', companyId, tenantId]
      );

      console.log(`✅ Created profile for test user with corporativo role`);

      await client.query('COMMIT');

      console.log('\n✅ Second test organization created successfully\n');
      console.log('Organization Details:');
      console.log(`  - ID: ${companyId}`);
      console.log(`  - Name: Test Organization B`);
      console.log(`  - Slug: ${companySlug}`);
      console.log(`  - User: ${testEmail}`);
      console.log(`  - User ID: ${testUserId}`);
      console.log(`  - Tenant ID: ${tenantId}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await this.pool.end();
    }
  }
}

async function main() {
  const creator = new OrgCreator();
  await creator.createTestOrganization();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
