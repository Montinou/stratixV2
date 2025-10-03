/**
 * Organization Service
 *
 * Handles multi-tenant operations including:
 * - Organization creation
 * - Tenant-specific invitations
 * - User onboarding flows
 * - Profile management per tenant
 */

import { withRLSContext } from '@/lib/database/rls-client';
import {
  companies,
  profiles,
  companyInvitations,
  onboardingSessions,
  companyProfile
} from '@/db/okr-schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import crypto from 'crypto';

export type UserRole = 'corporativo' | 'gerente' | 'empleado';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  creatorUserId: string;
  creatorEmail: string;
  creatorFullName?: string;
  description?: string;
  profileData?: {
    industry?: string | null;
    companySize?: string | null;
    website?: string | null;
    headquartersLocation?: string | null;
    missionStatement?: string | null;
    visionStatement?: string | null;
    businessModel?: string | null;
    targetMarket?: string[] | null;
    keyProductsServices?: string[] | null;
    coreValues?: string[] | null;
    foundedYear?: number | null;
    employeeCount?: number | null;
    annualRevenue?: number | null;
    fiscalYearStart?: string | null;
    timezone?: string | null;
    currency?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
  };
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  companyId: string;
  invitedBy: string;
}

export interface AcceptInvitationInput {
  token: string;
  userId: string;
  fullName?: string;
}

export interface CreateOnboardingSessionInput {
  userId: string;
  email: string;
  step: 'create_org' | 'accept_invite' | 'complete_profile';
  invitationToken?: string;
  partialData?: Record<string, any>;
}

/**
 * Generate a unique, secure invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a unique organization slug from name
 * Note: This function doesn't need RLS as it's checking global slug uniqueness
 */
export async function generateOrganizationSlug(name: string, userId: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await withRLSContext(userId, async (db) => {
      return await db.query.companies.findFirst({
        where: eq(companies.slug, slug),
      });
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Create a new organization with initial corporate user
 */
export async function createOrganization(input: CreateOrganizationInput) {
  const { name, slug, creatorUserId, creatorEmail, creatorFullName, description, profileData } = input;

  return await withRLSContext(creatorUserId, async (db) => {
    // Check if user already has a profile
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, creatorUserId),
    });

    if (existingProfile) {
      throw new Error('El usuario ya tiene un perfil y organización');
    }

    // Verify slug is available
    const existingOrg = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });

    if (existingOrg) {
      throw new Error('El slug de la organización ya existe');
    }

    // Create organization
    const [organization] = await db.insert(companies).values({
      name,
      slug,
      description: description || null,
      logoUrl: null,
      settings: {},
    }).returning();

    // Create company profile if profile data provided
    if (profileData) {
      await db.insert(companyProfile).values({
        companyId: organization.id,
        ...profileData,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      });
    }

    // Create creator profile as corporativo
    const [profile] = await db.insert(profiles).values({
      id: creatorUserId,
      email: creatorEmail,
      fullName: creatorFullName || creatorEmail.split('@')[0],
      role: 'corporativo',
      areaId: null,
      companyId: organization.id,
    }).returning();

    return {
      organization,
      profile,
    };
  });
}

/**
 * Create invitation for a user to join a company
 */
export async function createInvitation(userId: string, input: CreateInvitationInput) {
  const { email, role, companyId, invitedBy } = input;

  return await withRLSContext(userId, async (db) => {
    // Verify company exists
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      throw new Error('Compañía no encontrada');
    }

    // Check if user already has profile in this company
    const existingProfile = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.email, email),
        eq(profiles.companyId, companyId)
      ),
    });

    if (existingProfile) {
      throw new Error('El usuario ya existe en esta compañía');
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.companyInvitations.findFirst({
      where: and(
        eq(companyInvitations.email, email),
        eq(companyInvitations.companyId, companyId),
        eq(companyInvitations.status, 'pending'),
        gte(companyInvitations.expiresAt, new Date())
      ),
    });

    if (existingInvitation) {
      return existingInvitation; // Return existing valid invitation
    }

    // Create new invitation
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const [invitation] = await db.insert(companyInvitations).values({
      email,
      token,
      role,
      companyId,
      invitedBy,
      status: 'pending',
      expiresAt,
    }).returning();

    return invitation;
  });
}

/**
 * Get invitation by token
 * Note: Uses a system user context since the user might not be authenticated yet
 */
export async function getInvitation(userId: string, token: string) {
  return await withRLSContext(userId, async (db) => {
    const invitation = await db.query.companyInvitations.findFirst({
      where: eq(companyInvitations.token, token),
      with: {
        company: true,
        inviter: true,
      },
    });

    return invitation;
  });
}

/**
 * Accept an invitation and create user profile in company
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const { token, userId, fullName } = input;

  return await withRLSContext(userId, async (db) => {
    // Get invitation
    const invitation = await db.query.companyInvitations.findFirst({
      where: eq(companyInvitations.token, token),
      with: {
        company: true,
        inviter: true,
      },
    });

    if (!invitation) {
      throw new Error('Invitación no encontrada');
    }

    if (invitation.status !== 'pending') {
      throw new Error('La invitación ya no es válida');
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await db.update(companyInvitations)
        .set({ status: 'expired' })
        .where(eq(companyInvitations.id, invitation.id));
      throw new Error('La invitación ha expirado');
    }

    // Check if user already has profile in this company
    const existingProfile = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.id, userId),
        eq(profiles.companyId, invitation.companyId)
      ),
    });

    if (existingProfile) {
      throw new Error('El usuario ya existe en esta compañía');
    }

    // Create profile with invited role
    const [profile] = await db.insert(profiles).values({
      id: userId,
      email: invitation.email,
      fullName: fullName || invitation.email.split('@')[0],
      role: invitation.role,
      areaId: null,
      companyId: invitation.companyId,
    }).returning();

    // Mark invitation as accepted
    await db.update(companyInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(companyInvitations.id, invitation.id));

    return {
      profile,
      company: invitation.company,
    };
  });
}

/**
 * Create or update onboarding session
 */
export async function createOnboardingSession(input: CreateOnboardingSessionInput) {
  const { userId, email, step, invitationToken, partialData } = input;

  return await withRLSContext(userId, async (db) => {
    // Check if session exists
    const existingSession = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.userId, userId),
    });

    if (existingSession) {
      // Update existing session
      const [updated] = await db.update(onboardingSessions)
        .set({
          currentStep: step,
          invitationToken: invitationToken || existingSession.invitationToken,
          partialData: partialData ? sql`${partialData}` : existingSession.partialData,
          lastActivity: new Date(),
        })
        .where(eq(onboardingSessions.id, existingSession.id))
        .returning();

      return updated;
    }

    // Create new session
    const [session] = await db.insert(onboardingSessions).values({
      userId,
      email,
      status: 'in_progress',
      currentStep: step,
      invitationToken,
      partialData: partialData || {},
    }).returning();

    return session;
  });
}

/**
 * Get onboarding session for user
 */
export async function getOnboardingSession(userId: string) {
  return await withRLSContext(userId, async (db) => {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.userId, userId),
    });

    return session;
  });
}

/**
 * Update onboarding session partial data (draft save)
 */
export async function updateOnboardingDraft(userId: string, partialData: Record<string, any>) {
  return await withRLSContext(userId, async (db) => {
    const [updated] = await db.update(onboardingSessions)
      .set({
        partialData: sql`${partialData}`,
        lastActivity: new Date(),
      })
      .where(eq(onboardingSessions.userId, userId))
      .returning();

    return updated;
  });
}

/**
 * Complete onboarding session
 */
export async function completeOnboardingSession(userId: string) {
  return await withRLSContext(userId, async (db) => {
    const [completed] = await db.update(onboardingSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(onboardingSessions.userId, userId))
      .returning();

    return completed;
  });
}

/**
 * Get pending invitation for email
 */
export async function getPendingInvitation(userId: string, email: string) {
  return await withRLSContext(userId, async (db) => {
    const invitation = await db.query.companyInvitations.findFirst({
      where: and(
        eq(companyInvitations.email, email),
        eq(companyInvitations.status, 'pending'),
        gte(companyInvitations.expiresAt, new Date())
      ),
      with: {
        company: true,
      },
    });

    return invitation;
  });
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  return await withRLSContext(userId, async (db) => {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      with: {
        company: true,
      },
    });

    return profile;
  });
}

/**
 * Check if user has access to company
 */
export async function hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
  return await withRLSContext(userId, async (db) => {
    const profile = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.id, userId),
        eq(profiles.companyId, companyId)
      ),
    });

    return Boolean(profile);
  });
}

/**
 * Cleanup expired invitations (should be run periodically)
 * Note: This is a system-level operation that needs admin userId
 */
export async function cleanupExpiredInvitations(adminUserId: string) {
  return await withRLSContext(adminUserId, async (db) => {
    const result = await db.update(companyInvitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(companyInvitations.status, 'pending'),
          sql`${companyInvitations.expiresAt} < now()`
        )
      );

    return result;
  });
}

/**
 * Cleanup abandoned onboarding sessions (should be run periodically)
 * Note: This is a system-level operation that needs admin userId
 */
export async function cleanupAbandonedSessions(adminUserId: string) {
  return await withRLSContext(adminUserId, async (db) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db.update(onboardingSessions)
      .set({ status: 'abandoned' })
      .where(
        and(
          eq(onboardingSessions.status, 'in_progress'),
          sql`${onboardingSessions.lastActivity} < ${sevenDaysAgo}`
        )
      );

    return result;
  });
}
