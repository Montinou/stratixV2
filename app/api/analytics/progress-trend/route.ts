import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
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

    // TODO: Replace with real historical data from database
    // For now, using current data as placeholder until historical tracking is implemented
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
    const trendData: ProgressTrendData[] = months.map((month, index) => {
      // Using current values as baseline - this should be replaced with actual historical data
      // when progress tracking over time is implemented in the database
      return {
        month,
        objectives: currentObjectiveProgress,
        initiatives: currentInitiativeProgress,
        activities: currentActivityProgress
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