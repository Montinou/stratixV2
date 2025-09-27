import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'
import { validateAuthConfig, validateDatabaseConfig } from '@/lib/validation/environment'

export const dynamic = 'force-dynamic'

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
    // Validate environment configuration first
    if (!validateAuthConfig()) {
      console.error('Authentication configuration invalid in analytics endpoint');
      return NextResponse.json({
        error: 'Service configuration error',
        code: 'AUTH_CONFIG_INVALID'
      }, { status: 500 });
    }

    if (!validateDatabaseConfig()) {
      console.error('Database configuration invalid in analytics endpoint');
      return NextResponse.json({
        error: 'Service configuration error',
        code: 'DB_CONFIG_INVALID'
      }, { status: 500 });
    }

    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    // Get user profile with role information
    const { data: profile, error } = await getCurrentProfile()
    if (error || !profile) {
      return NextResponse.json({
        error: 'User profile not found or accessible',
        code: 'PROFILE_NOT_FOUND',
        details: error || 'Profile retrieval failed'
      }, { status: 404 })
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

    // Categorize errors for better debugging
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes('connection') || error.message.includes('database')) {
        return NextResponse.json({
          error: 'Database connection error',
          code: 'DATABASE_ERROR',
          message: 'Unable to retrieve analytics data at this time'
        }, { status: 503 })
      }

      // Authentication errors
      if (error.message.includes('auth') || error.message.includes('token')) {
        return NextResponse.json({
          error: 'Authentication error',
          code: 'AUTH_ERROR',
          message: 'Authentication session expired or invalid'
        }, { status: 401 })
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          message: 'Insufficient permissions to access analytics data'
        }, { status: 403 })
      }
    }

    // Generic server error
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching analytics data',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}