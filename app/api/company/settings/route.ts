import { NextRequest, NextResponse } from 'next/server';
import { getSafeUser } from '@/lib/stack-auth';
import db from '@/db';
import { companies, profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

// GET company settings
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

    // Get company with settings
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    );
  }
}

// PATCH company settings (update)
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
        role: profiles.role
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile?.companyId) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 404 });
    }

    // Only corporate users can update company settings
    if (profile.role !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can update company settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { logoUrl, settings } = body;

    // Validate theme settings if provided
    if (settings?.theme) {
      const { primaryColor, secondaryColor, accentColor } = settings.theme;
      const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

      if (primaryColor && !hexColorRegex.test(primaryColor)) {
        return NextResponse.json({ error: 'Invalid primary color format' }, { status: 400 });
      }
      if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
        return NextResponse.json({ error: 'Invalid secondary color format' }, { status: 400 });
      }
      if (accentColor && !hexColorRegex.test(accentColor)) {
        return NextResponse.json({ error: 'Invalid accent color format' }, { status: 400 });
      }
    }

    // Update company settings
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl;
    }

    if (settings) {
      // Fetch current settings to merge with new ones
      const [current] = await db
        .select({ settings: companies.settings })
        .from(companies)
        .where(eq(companies.id, profile.companyId))
        .limit(1);

      const currentSettings = (current?.settings || {}) as any;
      updateData.settings = {
        ...currentSettings,
        ...settings,
        theme: {
          ...currentSettings.theme,
          ...settings.theme,
        },
      };
    }

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, profile.companyId))
      .returning({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        settings: companies.settings,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating company settings:', error);
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    );
  }
}