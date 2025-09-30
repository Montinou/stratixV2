/**
 * Simplified Tenant Management
 *
 * For now, all whitelisted users belong to a single default organization.
 * This allows us to implement RLS while keeping the onboarding simple.
 */

import db from '@/db';
import { companies, profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

// Default organization ID - all whitelisted users belong here
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_ORG_NAME = 'StratixV2 Organization';

/**
 * Ensure default organization exists
 */
export async function ensureDefaultOrganization() {
  const existing = await db.query.companies.findFirst({
    where: eq(companies.id, DEFAULT_ORG_ID),
  });

  if (!existing) {
    await db.insert(companies).values({
      id: DEFAULT_ORG_ID,
      name: DEFAULT_ORG_NAME,
      slug: 'default-org',
      logoUrl: null,
      settings: {},
    });
  }

  return DEFAULT_ORG_ID;
}

/**
 * Create or update user profile in default organization
 * All whitelisted users get 'corporativo' role by default
 *
 * Note: profiles.id = Stack Auth user ID
 */
export async function ensureUserProfile(userId: string, userEmail: string, fullName?: string) {
  await ensureDefaultOrganization();

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (existing) {
    // Update tenant_id if not set
    if (!existing.tenantId) {
      await db.update(profiles)
        .set({ tenantId: DEFAULT_ORG_ID })
        .where(eq(profiles.id, userId));
    }
    return existing;
  }

  // Create new profile in default organization
  const [profile] = await db.insert(profiles).values({
    id: userId, // Stack Auth user ID
    email: userEmail,
    fullName: fullName || userEmail.split('@')[0], // Use email prefix as fallback
    role: 'corporativo', // All users are corporativo for now
    department: 'General',
    companyId: DEFAULT_ORG_ID,
    tenantId: DEFAULT_ORG_ID, // tenantId = companyId for now
  }).returning();

  return profile;
}

/**
 * Check if user has access to organization
 */
export async function hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!profile) {
    return false;
  }

  return profile.companyId === organizationId;
}

/**
 * Get user's profile with organization info
 */
export async function getUserProfile(userId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  return profile;
}
