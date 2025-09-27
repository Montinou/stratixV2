import { NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function GET() {
  try {
    // Test basic database connection
    const result = await sql`SELECT NOW() as current_time, 'Database connected!' as message`;

    return NextResponse.json({
      success: true,
      data: result[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}