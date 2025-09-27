import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

export const dynamic = 'force-dynamic'

interface CompletionRateData {
  week: string
  completionRate: number
  target: number
}

export async function GET(request: NextRequest) {
  try {
    // Check if we're in build time (static generation)
    if (!process.env.STACK_SECRET_SERVER_KEY) {
      console.warn('API route called during build time, returning mock data')
      const mockData = [
        { week: 'S1', completionRate: 75, target: 75 },
        { week: 'S2', completionRate: 80, target: 75 },
        { week: 'S3', completionRate: 70, target: 75 },
        { week: 'S4', completionRate: 85, target: 75 },
        { week: 'S5', completionRate: 78, target: 75 },
        { week: 'S6', completionRate: 82, target: 75 }
      ]
      return NextResponse.json(mockData)
    }

    // Check authentication
    let user
    try {
      user = await stackServerApp.getUser()
    } catch (error) {
      console.error('Error getting user:', error)
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with role information
    const { data: profile, error } = await getCurrentProfile()
    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Use Drizzle repository for objectives
    const objectivesRepo = new ObjectivesRepository()
    const objectivesData = await objectivesRepo.getAll(
      user.id, 
      profile.role_type, 
      profile.department
    )

    // Get status counts
    const statusCounts = await objectivesRepo.getCountByStatus(
      user.id,
      profile.role_type,
      profile.department
    )

    // Calculate current completion rate
    const totalObjectives = objectivesData.length
    const completedObjectives = statusCounts['completed'] || 0
    const currentCompletionRate = totalObjectives > 0 
      ? Math.round((completedObjectives / totalObjectives) * 100)
      : 0

    // Real weekly completion rate data can be added when database schema supports time-based tracking
    // For now, using current completion rate as placeholder
    const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
    const baseTarget = 75 // Standard target completion rate
    
    const completionRateData: CompletionRateData[] = weeks.map((week) => {
      // Using current completion rate as baseline - this should be replaced with
      // actual weekly historical data when time-based tracking is implemented
      return {
        week,
        completionRate: currentCompletionRate,
        target: baseTarget
      }
    })

    return NextResponse.json(completionRateData)

  } catch (error) {
    console.error('Error fetching completion rate data:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}