import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');

    let activities;
    if (initiativeId) {
      activities = await sql`
        SELECT
          a.*,
          p.display_name as owner_name,
          i.title as initiative_title
        FROM activities a
        LEFT JOIN profiles p ON a.owner_id = p.id
        LEFT JOIN initiatives i ON a.initiative_id = i.id
        WHERE a.initiative_id = ${initiativeId}
        ORDER BY a.created_at DESC
      `;
    } else {
      activities = await sql`
        SELECT
          a.*,
          p.display_name as owner_name,
          i.title as initiative_title
        FROM activities a
        LEFT JOIN profiles p ON a.owner_id = p.id
        LEFT JOIN initiatives i ON a.initiative_id = i.id
        WHERE a.owner_id = ${user.id}
        ORDER BY a.created_at DESC
      `;
    }

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, initiative_id, start_date, end_date, status, progress } = body;

    // Get user's company_id from profile
    const profile = await sql`
      SELECT company_id, tenant_id FROM profiles WHERE id = ${user.id}
    `;

    const activity = await sql`
      INSERT INTO activities (
        title,
        description,
        initiative_id,
        owner_id,
        status,
        progress,
        start_date,
        end_date,
        company_id,
        tenant_id
      )
      VALUES (
        ${title},
        ${description || null},
        ${initiative_id},
        ${user.id},
        ${status || 'no_iniciado'},
        ${progress || 0},
        ${start_date},
        ${end_date},
        ${profile[0]?.company_id || null},
        ${profile[0]?.tenant_id || null}
      )
      RETURNING *
    `;

    return NextResponse.json(activity[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}