"use client"

import { useState, useEffect, useCallback } from "react"

interface AnalyticsData {
  objectives: any[]
  initiatives: any[]
  activities: any[]
  analytics?: {
    totalObjectives: number
    totalInitiatives: number
    totalActivities: number
    averageProgress: number
    completionRate: number
    onTrackPercentage: number
    statusDistribution: Record<string, number>
  }
}

interface UseAnalyticsOptions {
  autoFetch?: boolean
  retryAttempts?: number
  retryDelay?: number
  onError?: (error: Error) => void
  onSuccess?: (data: AnalyticsData) => void
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  retry: () => Promise<void>
  retryCount: number
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    autoFetch = true,
    retryAttempts = 3,
    retryDelay = 1000,
    onError,
    onSuccess
  } = options

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchAnalytics = useCallback(async (attempt = 0): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Fetch multiple analytics endpoints in parallel for comprehensive data
      const [overviewResponse, progressResponse, departmentResponse] = await Promise.all([
        fetch('/api/analytics/overview', {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch('/api/analytics/progress-trend', {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch('/api/analytics/department-performance', {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        })
      ])

      // Check if any request failed
      if (!overviewResponse.ok) {
        throw new Error(`Analytics overview error: ${overviewResponse.status} ${overviewResponse.statusText}`)
      }
      if (!progressResponse.ok) {
        throw new Error(`Progress trend error: ${progressResponse.status} ${progressResponse.statusText}`)
      }
      if (!departmentResponse.ok) {
        throw new Error(`Department performance error: ${departmentResponse.status} ${departmentResponse.statusText}`)
      }

      const [analyticsData, progressData, departmentData] = await Promise.all([
        overviewResponse.json(),
        progressResponse.json(),
        departmentResponse.json()
      ])

      // Mock objectives, initiatives, and activities for insights generation
      // In a real implementation, these would come from separate endpoints
      const result: AnalyticsData = {
        objectives: generateMockObjectives(analyticsData),
        initiatives: generateMockInitiatives(analyticsData),
        activities: generateMockActivities(analyticsData),
        analytics: {
          ...analyticsData,
          progressTrend: progressData,
          departmentPerformance: departmentData
        }
      }

      setData(result)
      setRetryCount(0)
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      console.error('Analytics fetch error:', error)

      if (attempt < retryAttempts) {
        setRetryCount(attempt + 1)
        setTimeout(() => {
          fetchAnalytics(attempt + 1)
        }, retryDelay * Math.pow(2, attempt)) // Exponential backoff
      } else {
        setError(error)
        onError?.(error)
      }
    } finally {
      setLoading(false)
    }
  }, [retryAttempts, retryDelay, onError, onSuccess])

  // Helper functions to generate mock data for insights
  const generateMockObjectives = (analytics: any) => {
    const mockObjectives = []
    for (let i = 0; i < (analytics.totalObjectives || 0); i++) {
      mockObjectives.push({
        id: `obj-${i}`,
        title: `Objetivo ${i + 1}`,
        progress: Math.floor(Math.random() * 100),
        status: ['draft', 'active', 'completed', 'on_hold'][Math.floor(Math.random() * 4)],
        department: 'Marketing',
        created_at: new Date().toISOString()
      })
    }
    return mockObjectives
  }

  const generateMockInitiatives = (analytics: any) => {
    const mockInitiatives = []
    for (let i = 0; i < (analytics.totalInitiatives || 0); i++) {
      mockInitiatives.push({
        id: `init-${i}`,
        title: `Iniciativa ${i + 1}`,
        status: ['active', 'completed', 'pending'][Math.floor(Math.random() * 3)],
        created_at: new Date().toISOString()
      })
    }
    return mockInitiatives
  }

  const generateMockActivities = (analytics: any) => {
    const mockActivities = []
    for (let i = 0; i < (analytics.totalActivities || 0); i++) {
      mockActivities.push({
        id: `act-${i}`,
        title: `Actividad ${i + 1}`,
        status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
        created_at: new Date().toISOString()
      })
    }
    return mockActivities
  }

  const refetch = useCallback(async () => {
    await fetchAnalytics(0)
  }, [fetchAnalytics])

  const retry = useCallback(async () => {
    setRetryCount(0)
    await fetchAnalytics(0)
  }, [fetchAnalytics])

  useEffect(() => {
    if (autoFetch) {
      fetchAnalytics(0)
    }
  }, [autoFetch, fetchAnalytics])

  return {
    data,
    loading,
    error,
    refetch,
    retry,
    retryCount
  }
}