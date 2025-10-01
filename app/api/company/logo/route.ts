import { NextRequest, NextResponse } from 'next/server';
import { getSafeUser } from '@/lib/stack-auth';
import db from '@/db';
import { companies, profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

// POST - Upload logo (base64)
export async function POST(request: NextRequest) {
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

    // Only corporate users can upload logo
    if (profile.role !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can upload company logo' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and SVG are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Update company logo
    const [updated] = await db
      .update(companies)
      .set({
        logoUrl: base64,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, profile.companyId))
      .returning({
        id: companies.id,
        logoUrl: companies.logoUrl,
      });

    return NextResponse.json({
      success: true,
      logoUrl: updated.logoUrl
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove logo
export async function DELETE(request: NextRequest) {
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

    // Only corporate users can remove logo
    if (profile.role !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can remove company logo' },
        { status: 403 }
      );
    }

    // Remove logo (set to null)
    await db
      .update(companies)
      .set({
        logoUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, profile.companyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing logo:', error);
    return NextResponse.json(
      { error: 'Failed to remove logo' },
      { status: 500 }
    );
  }
}