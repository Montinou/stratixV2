import { NextRequest, NextResponse } from 'next/server'
import { neonServerClient } from '@/lib/neon-auth/server'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

interface CompletionRateData {
  week: string
  completionRate: number
  target: number
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await neonServerClient.getUser()
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

    // Generate weekly completion rate data (mock trend based on current data)
    const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
    const baseTarget = 70 // Base target of 70%
    
    const completionRateData: CompletionRateData[] = weeks.map((week, index) => {
      // Simulate a gradual improvement trend leading to current rate
      const progressFactor = (index + 1) / weeks.length
      const simulatedRate = Math.round(currentCompletionRate * progressFactor)
      
      // Target increases slightly over time
      const weeklyTarget = baseTarget + (index * 2.5) // Increase target by 2.5% per week
      
      return {
        week,
        completionRate: Math.max(0, Math.min(100, simulatedRate)),
        target: Math.min(100, Math.round(weeklyTarget))
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