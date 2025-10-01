/**
 * Organization Service
 *
 * Handles multi-tenant operations including:
 * - Organization creation
 * - Tenant-specific invitations
 * - User onboarding flows
 * - Profile management per tenant
 */

import db from '@/db';
import {
  companies,
  profiles,
  organizationInvitations,
  onboardingSessions
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
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  organizationId: string;
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
 */
export async function generateOrganizationSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
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
  const { name, slug, creatorUserId, creatorEmail, creatorFullName } = input;

  // Check if user already has a profile
  const existingProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, creatorUserId),
  });

  if (existingProfile) {
    throw new Error('User already has a profile and organization');
  }

  // Verify slug is available
  const existingOrg = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (existingOrg) {
    throw new Error('Organization slug already exists');
  }

  // Create organization
  const [organization] = await db.insert(companies).values({
    name,
    slug,
    logoUrl: null,
    settings: {},
  }).returning();

  // Create creator profile as corporativo
  const [profile] = await db.insert(profiles).values({
    id: creatorUserId,
    email: creatorEmail,
    fullName: creatorFullName || creatorEmail.split('@')[0],
    role: 'corporativo',
    department: 'General',
    companyId: organization.id,
    tenantId: organization.id, // tenant_id = organization_id
  }).returning();

  return {
    organization,
    profile,
  };
}

/**
 * Create invitation for a user to join an organization
 */
export async function createInvitation(input: CreateInvitationInput) {
  const { email, role, organizationId, invitedBy } = input;

  // Verify organization exists
  const organization = await db.query.companies.findFirst({
    where: eq(companies.id, organizationId),
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Check if user already has profile in this organization
  const existingProfile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.email, email),
      eq(profiles.tenantId, organizationId)
    ),
  });

  if (existingProfile) {
    throw new Error('User already exists in this organization');
  }

  // Check for existing pending invitation
  const existingInvitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.email, email),
      eq(organizationInvitations.organizationId, organizationId),
      eq(organizationInvitations.status, 'pending'),
      gte(organizationInvitations.expiresAt, new Date())
    ),
  });

  if (existingInvitation) {
    return existingInvitation; // Return existing valid invitation
  }

  // Create new invitation
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const [invitation] = await db.insert(organizationInvitations).values({
    email,
    token,
    role,
    organizationId,
    invitedBy,
    status: 'pending',
    expiresAt,
  }).returning();

  return invitation;
}

/**
 * Get invitation by token
 */
export async function getInvitation(token: string) {
  const invitation = await db.query.organizationInvitations.findFirst({
    where: eq(organizationInvitations.token, token),
    with: {
      organization: true,
      inviter: true,
    },
  });

  return invitation;
}

/**
 * Accept an invitation and create user profile in organization
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const { token, userId, fullName } = input;

  // Get invitation
  const invitation = await getInvitation(token);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await db.update(organizationInvitations)
      .set({ status: 'expired' })
      .where(eq(organizationInvitations.id, invitation.id));
    throw new Error('Invitation has expired');
  }

  // Check if user already has profile in this organization
  const existingProfile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.id, userId),
      eq(profiles.tenantId, invitation.organizationId)
    ),
  });

  if (existingProfile) {
    throw new Error('User already exists in this organization');
  }

  // Create profile with invited role
  const [profile] = await db.insert(profiles).values({
    id: userId,
    email: invitation.email,
    fullName: fullName || invitation.email.split('@')[0],
    role: invitation.role,
    department: 'General',
    companyId: invitation.organizationId,
    tenantId: invitation.organizationId,
  }).returning();

  // Mark invitation as accepted
  await db.update(organizationInvitations)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(organizationInvitations.id, invitation.id));

  return {
    profile,
    organization: invitation.organization,
  };
}

/**
 * Create or update onboarding session
 */
export async function createOnboardingSession(input: CreateOnboardingSessionInput) {
  const { userId, email, step, invitationToken, partialData } = input;

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
}

/**
 * Get onboarding session for user
 */
export async function getOnboardingSession(userId: string) {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.userId, userId),
  });

  return session;
}

/**
 * Update onboarding session partial data (draft save)
 */
export async function updateOnboardingDraft(userId: string, partialData: Record<string, any>) {
  const [updated] = await db.update(onboardingSessions)
    .set({
      partialData: sql`${partialData}`,
      lastActivity: new Date(),
    })
    .where(eq(onboardingSessions.userId, userId))
    .returning();

  return updated;
}

/**
 * Complete onboarding session
 */
export async function completeOnboardingSession(userId: string) {
  const [completed] = await db.update(onboardingSessions)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(onboardingSessions.userId, userId))
    .returning();

  return completed;
}

/**
 * Get pending invitation for email
 */
export async function getPendingInvitation(email: string) {
  const invitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.email, email),
      eq(organizationInvitations.status, 'pending'),
      gte(organizationInvitations.expiresAt, new Date())
    ),
    with: {
      organization: true,
    },
  });

  return invitation;
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    with: {
      company: true,
    },
  });

  return profile;
}

/**
 * Check if user has access to organization
 */
export async function hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  const profile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.id, userId),
      eq(profiles.tenantId, organizationId)
    ),
  });

  return Boolean(profile);
}

/**
 * Cleanup expired invitations (should be run periodically)
 */
export async function cleanupExpiredInvitations() {
  const result = await db.update(organizationInvitations)
    .set({ status: 'expired' })
    .where(
      and(
        eq(organizationInvitations.status, 'pending'),
        sql`${organizationInvitations.expiresAt} < now()`
      )
    );

  return result;
}

/**
 * Cleanup abandoned onboarding sessions (should be run periodically)
 */
export async function cleanupAbandonedSessions() {
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
}
