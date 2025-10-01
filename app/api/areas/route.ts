import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { getAreasForPage, createArea } from '@/lib/services/areas-service';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/areas
export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const areas = await getAreasForPage(user.id);
    return NextResponse.json(areas);
  } catch (error) {
    console.error('Error fetching areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch areas' },
      { status: 500 }
    );
  }
}

// POST /api/areas
export async function POST(request: Request) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company_id from profile
    const profile = await sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `;

    if (!profile[0]?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const area = await createArea({
      ...body,
      createdBy: user.id,
      companyId: profile[0].company_id
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error('Error creating area:', error);
    return NextResponse.json(
      { error: 'Failed to create area' },
      { status: 500 }
    );
  }
}