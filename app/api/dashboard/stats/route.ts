import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

interface DashboardStats {
  objectives: number
  initiatives: number
  activities: number
  averageProgress: number
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

    // Calculate average progress across all items
    const allItems = [
      ...objectivesData.map(obj => obj.progress),
      ...initiativesData.map(init => init.progress || 0),
      ...activitiesData.map(act => 0) // Activities don't have progress field
    ]

    const averageProgress = allItems.length > 0 
      ? Math.round(allItems.reduce((sum, progress) => sum + progress, 0) / allItems.length)
      : 0

    const stats: DashboardStats = {
      objectives: objectivesData.length,
      initiatives: initiativesData.length,
      activities: activitiesData.length,
      averageProgress,
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}