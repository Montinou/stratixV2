import { NextRequest, NextResponse } from 'next/server'
import { neonServerClient } from '@/lib/neon-auth/server'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

interface ProgressTrendData {
  month: string
  objectives: number
  initiatives: number
  activities: number
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

    // Use legacy services for initiatives and activities
    const initiativesData = await InitiativesService.getAll(
      user.id,
      profile.role_type,
      profile.department
    )

    const activitiesData = await ActivitiesService.getAll(
      user.id,
      profile.role_type,
      profile.department
    )

    // Calculate monthly averages based on current data
    // This is a simplified version - in a real scenario you'd need historical data
    const currentObjectiveProgress = objectivesData.length > 0
      ? Math.round(objectivesData.reduce((sum, obj) => sum + obj.progress, 0) / objectivesData.length)
      : 0

    const currentInitiativeProgress = initiativesData.length > 0
      ? Math.round(initiativesData.reduce((sum, init) => sum + (init.progress || 0), 0) / initiativesData.length)
      : 0

    // For activities, we'll use a completion rate based on status
    const completedActivities = activitiesData.filter(act => act.status === 'completed').length
    const currentActivityProgress = activitiesData.length > 0
      ? Math.round((completedActivities / activitiesData.length) * 100)
      : 0

    // Generate trend data for the last 6 months (mock data based on current values)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
    const trendData: ProgressTrendData[] = months.map((month, index) => {
      // Simulate a slight upward trend
      const trendFactor = 1 + (index * 0.02) // 2% increase per month
      
      return {
        month,
        objectives: Math.min(100, Math.round(currentObjectiveProgress * trendFactor)),
        initiatives: Math.min(100, Math.round(currentInitiativeProgress * trendFactor)),
        activities: Math.min(100, Math.round(currentActivityProgress * trendFactor))
      }
    })

    return NextResponse.json(trendData)

  } catch (error) {
    console.error('Error fetching progress trend data:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}