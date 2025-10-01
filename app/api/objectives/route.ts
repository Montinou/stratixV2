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

    // Get user's company_id from profile
    const profile = await sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `;

    if (!profile[0]?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 });
    }

    const objectives = await sql`
      SELECT
        o.*,
        p.full_name as owner_name,
        COUNT(DISTINCT i.id) as initiative_count
      FROM objectives o
      LEFT JOIN profiles p ON o.owner_id = p.id
      LEFT JOIN initiatives i ON i.objective_id = o.id
      WHERE o.company_id = ${profile[0].company_id}
      GROUP BY o.id, p.full_name
      ORDER BY o.created_at DESC
    `;

    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch objectives' },
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
    const { title, description, department, start_date, end_date, status } = body;

    // Get user's company_id from profile
    const profile = await sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `;

    if (!profile[0]?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 });
    }

    const objective = await sql`
      INSERT INTO objectives (
        title,
        description,
        owner_id,
        department,
        status,
        start_date,
        end_date,
        company_id
      )
      VALUES (
        ${title},
        ${description || null},
        ${user.id},
        ${department || null},
        ${status || 'no_iniciado'},
        ${start_date},
        ${end_date},
        ${profile[0].company_id}
      )
      RETURNING *
    `;

    return NextResponse.json(objective[0]);
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Failed to create objective' },
      { status: 500 }
    );
  }
}