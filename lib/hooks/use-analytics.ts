"use client"

import { useState, useEffect, useCallback } from "react"

interface AnalyticsData {
  analytics: {
    totalObjectives: number
    totalInitiatives: number
    totalActivities: number
    averageProgress: number
    completionRate: number
    onTrackPercentage: number
    statusDistribution: Record<string, number>
  } | null
  progressTrend?: any
  departmentPerformance?: any
}

interface UseAnalyticsOptions {
  autoFetch?: boolean
  retryAttempts?: number
  retryDelay?: number
  timeRange?: string
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
    timeRange = 'week',
    onError,
    onSuccess
  } = options

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    
    // Add date range filtering based on timeRange
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    }
    
    params.append('startDate', startDate.toISOString())
    params.append('endDate', now.toISOString())
    
    return params
  }, [timeRange])

  const fetchAnalytics = useCallback(async (attempt = 0): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const params = buildQueryParams()
      
      // Fetch multiple analytics endpoints with comprehensive error handling
      const requests = [
        fetch(`/api/analytics/overview?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
        fetch(`/api/analytics/progress-trend?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
        fetch(`/api/analytics/department-performance?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
      ]

      const responses = await Promise.allSettled(requests)
      
      // Check if overview request succeeded (this is critical)
      const overviewResponse = responses[0]
      if (overviewResponse.status === 'rejected') {
        throw new Error('Failed to fetch analytics overview')
      }
      
      if (!overviewResponse.value.ok) {
        if (overviewResponse.value.status === 401) {
          throw new Error('No autorizado: Por favor, inicia sesión nuevamente')
        } else if (overviewResponse.value.status === 403) {
          throw new Error('Sin permisos: No tienes acceso a estos datos')
        } else if (overviewResponse.value.status >= 500) {
          throw new Error('Error del servidor: Intenta nuevamente más tarde')
        } else {
          throw new Error(`Error de API: ${overviewResponse.value.status} ${overviewResponse.value.statusText}`)
        }
      }

      const analyticsData = await overviewResponse.value.json()
      
      // Handle optional endpoints (progress trend and department performance)
      let progressData = null
      let departmentData = null
      
      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        try {
          progressData = await responses[1].value.json()
        } catch (e) {
          console.warn('Failed to parse progress trend data:', e)
        }
      }
      
      if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
        try {
          departmentData = await responses[2].value.json()
        } catch (e) {
          console.warn('Failed to parse department performance data:', e)
        }
      }

      const result: AnalyticsData = {
        analytics: analyticsData,
        progressTrend: progressData,
        departmentPerformance: departmentData
      }

      setData(result)
      setRetryCount(0)
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al cargar datos')
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
  }, [retryAttempts, retryDelay, onError, onSuccess, buildQueryParams])

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
  }, [autoFetch, fetchAnalytics, timeRange])

  return {
    data,
    loading,
    error,
    refetch,
    retry,
    retryCount
  }
}