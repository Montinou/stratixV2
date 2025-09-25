import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { ObjectivesRepository } from '@/lib/database/queries/objectives'
import { ObjectivesService, InitiativesService, ActivitiesService } from '@/lib/database/services'
import { getCurrentProfile } from '@/lib/actions/profiles'

interface DepartmentPerformance {
  department: string
  completed: number
  inProgress: number
  notStarted: number
  paused: number
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

    let departmentData: DepartmentPerformance[] = []

    // If user is 'corporativo', they can see all departments
    if (profile.role_type === 'corporativo') {
      // Get all objectives to analyze departments
      const objectivesRepo = new ObjectivesRepository()
      const allObjectives = await objectivesRepo.getAll(user.id, 'corporativo', '')

      // TODO: Optimize with database aggregation query instead of in-memory processing
      // This current implementation has O(n) complexity and should be replaced with
      // a proper GROUP BY query for better performance with large datasets
      
      // Group by department and calculate stats
      const departmentStats: { [key: string]: { [status: string]: number } } = {}

      allObjectives.forEach(objective => {
        if (!departmentStats[objective.department]) {
          departmentStats[objective.department] = {
            'completed': 0,
            'in_progress': 0,
            'draft': 0,
            'cancelled': 0
          }
        }
        
        // Map statuses to display categories
        if (objective.status === 'completed') {
          departmentStats[objective.department]['completed']++
        } else if (objective.status === 'in_progress') {
          departmentStats[objective.department]['in_progress']++
        } else if (objective.status === 'draft') {
          departmentStats[objective.department]['draft']++
        } else if (objective.status === 'cancelled') {
          departmentStats[objective.department]['cancelled']++
        }
      })

      // Transform to expected format
      departmentData = Object.entries(departmentStats).map(([dept, stats]) => ({
        department: dept,
        completed: stats['completed'],
        inProgress: stats['in_progress'],
        notStarted: stats['draft'],
        paused: stats['cancelled']
      }))

    } else {
      // For non-corporate users, show only their department data
      const objectivesRepo = new ObjectivesRepository()
      const userObjectives = await objectivesRepo.getAll(
        user.id, 
        profile.role_type, 
        profile.department
      )

      // Get status counts for user's department
      const statusCounts = await objectivesRepo.getCountByStatus(
        user.id,
        profile.role_type,
        profile.department
      )

      departmentData = [{
        department: profile.department,
        completed: statusCounts['completed'] || 0,
        inProgress: statusCounts['in_progress'] || 0,
        notStarted: statusCounts['draft'] || 0,
        paused: statusCounts['cancelled'] || 0
      }]
    }

    return NextResponse.json(departmentData)

  } catch (error) {
    console.error('Error fetching department performance:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}