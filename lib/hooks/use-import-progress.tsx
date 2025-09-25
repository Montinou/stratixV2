"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

export interface ImportProgressData {
  id: string
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  total_records: number
  processed_records: number
  successful_records: number
  failed_records: number
  current_step?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface UseImportProgressOptions {
  pollInterval?: number
  onComplete?: (data: ImportProgressData) => void
  onError?: (error: string) => void
}

export function useImportProgress(options: UseImportProgressOptions = {}) {
  const { pollInterval = 2000, onComplete, onError } = options
  const [activeImports, setActiveImports] = useState<Map<string, ImportProgressData>>(new Map())
  const [isPolling, setIsPolling] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const fetchImportStatus = useCallback(async (importId: string): Promise<ImportProgressData | null> => {
    try {
      const response = await fetch(`/api/import/status/${importId}`, {
        signal: abortControllerRef.current?.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null
      }
      console.error("Error fetching import status:", error)
      return null
    }
  }, [])

  const pollImportStatuses = useCallback(async () => {
    if (activeImports.size === 0) {
      setIsPolling(false)
      return
    }

    const importIds = Array.from(activeImports.keys())
    const updatedImports = new Map(activeImports)

    try {
      await Promise.all(
        importIds.map(async (importId) => {
          const statusData = await fetchImportStatus(importId)
          
          if (statusData) {
            const previousData = activeImports.get(importId)
            updatedImports.set(importId, statusData)

            // Check if import completed or failed
            if (statusData.status === "completed") {
              onComplete?.(statusData)
              toast.success(`Importación completada: ${statusData.successful_records}/${statusData.total_records} registros importados`)
              updatedImports.delete(importId)
            } else if (statusData.status === "failed") {
              onError?.(statusData.error_message || "Error durante la importación")
              toast.error(`Importación fallida: ${statusData.error_message || "Error desconocido"}`)
              updatedImports.delete(importId)
            } else if (statusData.status === "cancelled") {
              toast.info("Importación cancelada")
              updatedImports.delete(importId)
            }

            // Notify progress updates
            if (previousData && statusData.processed_records > previousData.processed_records) {
              const progress = Math.round((statusData.processed_records / statusData.total_records) * 100)
              console.log(`Import ${importId} progress: ${progress}%`)
            }
          }
        })
      )

      setActiveImports(updatedImports)
    } catch (error) {
      console.error("Error polling import statuses:", error)
    }
  }, [activeImports, fetchImportStatus, onComplete, onError])

  const startTracking = useCallback((importId: string, initialData: Partial<ImportProgressData> = {}) => {
    const importData: ImportProgressData = {
      id: importId,
      status: "pending",
      total_records: 0,
      processed_records: 0,
      successful_records: 0,
      failed_records: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...initialData
    }

    setActiveImports(prev => new Map(prev).set(importId, importData))
    
    if (!isPolling) {
      setIsPolling(true)
    }
  }, [isPolling])

  const stopTracking = useCallback((importId: string) => {
    setActiveImports(prev => {
      const newMap = new Map(prev)
      newMap.delete(importId)
      return newMap
    })
  }, [])

  const cancelImport = useCallback(async (importId: string) => {
    try {
      const response = await fetch(`/api/import/cancel/${importId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state immediately
      setActiveImports(prev => {
        const newMap = new Map(prev)
        const importData = newMap.get(importId)
        if (importData) {
          newMap.set(importId, { ...importData, status: "cancelled" })
        }
        return newMap
      })

      toast.info("Cancelación de importación solicitada")
    } catch (error) {
      console.error("Error cancelling import:", error)
      toast.error("Error al cancelar la importación")
    }
  }, [])

  const retryImport = useCallback(async (importId: string) => {
    try {
      const response = await fetch(`/api/import/retry/${importId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newImportData = await response.json()
      
      // Start tracking the new retry import
      startTracking(newImportData.id, {
        status: "pending",
        total_records: newImportData.total_records || 0
      })

      toast.info("Reintentando importación...")
    } catch (error) {
      console.error("Error retrying import:", error)
      toast.error("Error al reintentar la importación")
    }
  }, [startTracking])

  // Setup polling when there are active imports
  useEffect(() => {
    if (isPolling && activeImports.size > 0) {
      abortControllerRef.current = new AbortController()
      
      pollIntervalRef.current = setInterval(() => {
        pollImportStatuses()
      }, pollInterval)

      // Initial poll
      pollImportStatuses()

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }
  }, [isPolling, activeImports.size, pollImportStatuses, pollInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    activeImports: Array.from(activeImports.values()),
    isPolling,
    startTracking,
    stopTracking,
    cancelImport,
    retryImport
  }
}