import { NextRequest, NextResponse } from 'next/server'
import { neonServerClient } from '@/lib/neon-auth/server'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

interface AnalyticsOverview {
  totalObjectives: number
  totalInitiatives: number
  totalActivities: number
  averageProgress: number
  completionRate: number
  onTrackPercentage: number
  statusDistribution: Record<string, number>
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

    // Use Drizzle repository for objectives with role-based filtering
    const objectivesRepo = new ObjectivesRepository()
    const objectivesData = await objectivesRepo.getAll(
      user.id, 
      profile.role_type, 
      profile.department
    )

    // Get status counts using the repository method
    const statusCounts = await objectivesRepo.getCountByStatus(
      user.id,
      profile.role_type,
      profile.department
    )

    // Use legacy services for initiatives and activities (to be migrated later)
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

    const totalObjectives = objectivesData.length
    const totalInitiatives = initiativesData.length
    const totalActivities = activitiesData.length

    // Calculate average progress (only for objectives as they have progress tracking)
    const averageProgress = totalObjectives > 0
      ? Math.round(objectivesData.reduce((sum, obj) => sum + obj.progress, 0) / totalObjectives)
      : 0

    // Calculate completion rate
    const completedObjectives = statusCounts['completed'] || 0
    const completionRate = totalObjectives > 0 
      ? Math.round((completedObjectives / totalObjectives) * 100) 
      : 0

    // Calculate on-track percentage (progress >= 70%)
    const onTrackObjectives = objectivesData.filter(obj => obj.progress >= 70).length
    const onTrackPercentage = totalObjectives > 0 
      ? Math.round((onTrackObjectives / totalObjectives) * 100) 
      : 0

    const analytics: AnalyticsOverview = {
      totalObjectives,
      totalInitiatives,
      totalActivities,
      averageProgress,
      completionRate,
      onTrackPercentage,
      statusDistribution: statusCounts
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching analytics overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}