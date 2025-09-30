/**
 * Multi-Tenant Migration Script
 *
 * Purpose: Migrate existing data to multi-tenant model
 *
 * What this script does:
 * 1. Creates default organization (if not exists)
 * 2. Creates profiles for all existing Stack Auth users
 * 3. Updates tenant_id for all existing records
 *
 * Run with: npx tsx scripts/migrate-existing-data.ts
 */

import db from '@/db';
import { companies, profiles, objectives, initiatives, activities } from '@/db/okr-schema';
import { DEFAULT_ORG_ID, DEFAULT_ORG_NAME } from '@/lib/organization/simple-tenant';
import { eq, isNull, sql } from 'drizzle-orm';

async function migrateToMultiTenant() {
  console.log('🚀 Starting multi-tenant migration...\n');

  try {
    // ========================================
    // Step 1: Create default organization
    // ========================================
    console.log('📦 Step 1: Creating default organization...');

    const existingOrg = await db.query.companies.findFirst({
      where: eq(companies.id, DEFAULT_ORG_ID),
    });

    if (existingOrg) {
      console.log('   ✓ Default organization already exists');
    } else {
      await db.insert(companies).values({
        id: DEFAULT_ORG_ID,
        name: DEFAULT_ORG_NAME,
        slug: 'default-org',
        logoUrl: null,
        settings: {},
      });
      console.log('   ✓ Created default organization');
    }

    // ========================================
    // Step 2: Update existing profiles with tenant_id
    // ========================================
    console.log('\n👥 Step 2: Updating existing profiles...');

    // Count total profiles
    const totalProfiles = await db.execute(sql`SELECT COUNT(*) as count FROM profiles`);
    console.log(`   Found ${totalProfiles.rows[0]?.count || 0} existing profiles`);

    // Update profiles without tenant_id
    const result = await db.execute(sql`
      UPDATE profiles
      SET tenant_id = ${DEFAULT_ORG_ID},
          company_id = COALESCE(company_id, ${DEFAULT_ORG_ID})
      WHERE tenant_id IS NULL
      RETURNING id
    `);

    console.log(`   ✓ Updated ${result.rowCount || 0} profiles with tenant_id`);

    // ========================================
    // Step 3: Update all tables with SQL directly
    // ========================================
    console.log('\n📦 Step 3: Updating all tables with tenant_id...');

    // Update objectives
    const objResult = await db.execute(sql`
      UPDATE objectives
      SET tenant_id = ${DEFAULT_ORG_ID}
      WHERE tenant_id IS NULL
    `);
    console.log(`   ✓ Updated ${objResult.rowCount || 0} objectives`);

    // Update initiatives
    const initResult = await db.execute(sql`
      UPDATE initiatives
      SET tenant_id = ${DEFAULT_ORG_ID}
      WHERE tenant_id IS NULL
    `);
    console.log(`   ✓ Updated ${initResult.rowCount || 0} initiatives`);

    // Update activities
    const actResult = await db.execute(sql`
      UPDATE activities
      SET tenant_id = ${DEFAULT_ORG_ID}
      WHERE tenant_id IS NULL
    `);
    console.log(`   ✓ Updated ${actResult.rowCount || 0} activities`);


    // ========================================
    // Summary
    // ========================================
    console.log('\n\n✅ Migration completed successfully!');
    console.log('================================================');
    console.log(`Default organization ID: ${DEFAULT_ORG_ID}`);
    console.log('All existing records now have tenant_id set');
    console.log('================================================\n');

    console.log('Next steps:');
    console.log('1. Apply RLS policies: psql $DATABASE_URL_UNPOOLED -f drizzle/0005_rls_policies.sql');
    console.log('2. Test authentication flow in development');
    console.log('3. Deploy to production');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateToMultiTenant()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
