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
    const objectiveId = searchParams.get('objectiveId');

    let initiatives;
    if (objectiveId) {
      initiatives = await sql`
        SELECT
          i.*,
          p.display_name as owner_name,
          o.title as objective_title,
          COUNT(DISTINCT a.id) as activity_count
        FROM initiatives i
        LEFT JOIN profiles p ON i.owner_id = p.id
        LEFT JOIN objectives o ON i.objective_id = o.id
        LEFT JOIN activities a ON a.initiative_id = i.id
        WHERE i.objective_id = ${objectiveId}
        GROUP BY i.id, p.display_name, o.title
        ORDER BY i.created_at DESC
      `;
    } else {
      initiatives = await sql`
        SELECT
          i.*,
          p.display_name as owner_name,
          o.title as objective_title,
          COUNT(DISTINCT a.id) as activity_count
        FROM initiatives i
        LEFT JOIN profiles p ON i.owner_id = p.id
        LEFT JOIN objectives o ON i.objective_id = o.id
        LEFT JOIN activities a ON a.initiative_id = i.id
        WHERE i.owner_id = ${user.id}
        GROUP BY i.id, p.display_name, o.title
        ORDER BY i.created_at DESC
      `;
    }

    return NextResponse.json(initiatives);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives' },
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
    const { title, description, objective_id, start_date, end_date, status } = body;

    // Get user's company_id from profile
    const profile = await sql`
      SELECT company_id, tenant_id FROM profiles WHERE id = ${user.id}
    `;

    const initiative = await sql`
      INSERT INTO initiatives (
        title,
        description,
        objective_id,
        owner_id,
        status,
        start_date,
        end_date,
        company_id,
        tenant_id
      )
      VALUES (
        ${title},
        ${description || null},
        ${objective_id},
        ${user.id},
        ${status || 'no_iniciado'},
        ${start_date},
        ${end_date},
        ${profile[0]?.company_id || null},
        ${profile[0]?.tenant_id || null}
      )
      RETURNING *
    `;

    return NextResponse.json(initiative[0]);
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative' },
      { status: 500 }
    );
  }
}