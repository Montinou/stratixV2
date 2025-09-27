import { NextResponse } from 'next/server';
import { getAllPerformanceData } from '@/lib/database/client';

export async function GET() {
  try {
    const performanceData = getAllPerformanceData();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...performanceData
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to get performance data' },
      { status: 500 }
    );
  }
}