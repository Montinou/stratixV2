import { NextRequest, NextResponse } from 'next/server';
import { getSafeUser } from '@/lib/stack-auth';
import db from '@/db';
import { companies, profiles, companyProfile } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const basicInfoSchema = z.object({
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  headquartersLocation: z.string().optional(),
  foundedYear: z.number().min(1800).max(2100).optional(),
  employeeCount: z.number().min(1).optional(),
});

// Financial info removed per user request

const strategySchema = z.object({
  businessModel: z.string().optional(),
  targetMarket: z.array(z.string()).optional(),
  keyProductsServices: z.array(z.string()).optional(),
});

const visionSchema = z.object({
  missionStatement: z.string().max(1000).optional(),
  visionStatement: z.string().max(1000).optional(),
  coreValues: z.array(z.string()).optional(),
});

const socialSchema = z.object({
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
});

// Combined schema for all company profile fields
const companyProfileSchema = basicInfoSchema
  .merge(strategySchema)
  .merge(visionSchema)
  .merge(socialSchema);

// GET company profile (companies + companyProfile)
export async function GET(request: NextRequest) {
  try {
    const user = await getSafeUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const [profile] = await db
      .select({ companyId: profiles.companyId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile?.companyId) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 404 });
    }

    // Get company basic info
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        slug: companies.slug,
        logoUrl: companies.logoUrl,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get company profile (may not exist yet)
    const [profileData] = await db
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.companyId, profile.companyId))
      .limit(1);

    // Merge company and profile data
    const response = {
      ...company,
      profile: profileData || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company profile' },
      { status: 500 }
    );
  }
}

// PATCH company profile (update or create)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSafeUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check permissions
    const [profile] = await db
      .select({
        companyId: profiles.companyId,
        role: profiles.role,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile?.companyId) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 404 });
    }

    // Only corporate users can update company profile
    if (profile.role !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can update company profile' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = companyProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if profile exists
    const [existingProfile] = await db
      .select({ id: companyProfile.id })
      .from(companyProfile)
      .where(eq(companyProfile.companyId, profile.companyId))
      .limit(1);

    let result;

    if (existingProfile) {
      // Update existing profile
      [result] = await db
        .update(companyProfile)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(companyProfile.companyId, profile.companyId))
        .returning();
    } else {
      // Create new profile
      [result] = await db
        .insert(companyProfile)
        .values({
          companyId: profile.companyId,
          ...updateData,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating company profile:', error);
    return NextResponse.json(
      { error: 'Failed to update company profile' },
      { status: 500 }
    );
  }
}
