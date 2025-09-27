import { NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function GET() {
  try {
    // Test the OKR schema tables
    const companies = await sql`SELECT COUNT(*) as count FROM companies`;
    const objectives = await sql`SELECT COUNT(*) as count FROM objectives`;
    const keyResults = await sql`SELECT COUNT(*) as count FROM key_results`;
    const users = await sql`SELECT COUNT(*) as count FROM neon_auth.users_sync`;

    return NextResponse.json({
      success: true,
      schema: {
        companies: companies[0].count,
        objectives: objectives[0].count,
        key_results: keyResults[0].count,
        users: users[0].count
      },
      message: 'OKR schema is working!'
    });
  } catch (error) {
    console.error('Schema test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}