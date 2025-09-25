"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileImportDialog } from "@/components/import/file-import-dialog"
import { ImportProgressIndicator, ImportProgressItem } from "@/components/import/import-progress-indicator"
import { Upload, FileSpreadsheet, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useImportProgress } from "@/lib/hooks/use-import-progress"
import type { ImportLog } from "@/lib/types/import"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

export default function ImportPage() {
  const { profile } = useAuth()
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const canImport = profile?.role === "corporativo" || profile?.role === "gerente"

  // Initialize import progress tracking
  const { 
    activeImports, 
    cancelImport, 
    retryImport 
  } = useImportProgress({
    onComplete: (data) => {
      console.log('Import completed:', data)
      fetchImportLogs() // Refresh logs when import completes
    },
    onError: (error) => {
      console.error('Import error:', error)
      fetchImportLogs() // Refresh logs when import fails
    }
  })

  useEffect(() => {
    if (canImport) {
      fetchImportLogs()
    }
  }, [canImport])

  const fetchImportLogs = useCallback(async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/import/logs')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setImportLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching import logs:", error)
      toast.error("Error al cargar el historial de importaciones")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
    } as const

    const labels = {
      completed: "Completado",
      failed: "Fallido",
      processing: "Procesando",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  if (!canImport) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
              <p className="text-muted-foreground">
                No tienes permisos para importar datos. Solo usuarios Corporativo y Gerente pueden realizar
                importaciones.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importación de Datos</h1>
          <p className="text-muted-foreground">
            Importa objetivos, iniciativas y actividades desde archivos Excel o CSV
          </p>
          {activeImports.length > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              {activeImports.length} importación{activeImports.length > 1 ? 'es' : ''} en progreso
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchImportLogs}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <FileImportDialog onImportStart={(importId) => {
            console.log('Import started:', importId)
            // Progress tracking is already handled by the dialog
          }}>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Datos
            </Button>
          </FileImportDialog>
        </div>
      </div>

      {/* Active Import Progress */}
      {activeImports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Importaciones en Progreso</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeImports.map((importData) => (
              <ImportProgressIndicator
                key={importData.id}
                importData={importData}
                onCancel={cancelImport}
                onRetry={retryImport}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importación Excel (XLSX)
            </CardTitle>
            <CardDescription>Ideal para datos organizados por departamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>• Cada hoja representa un área/departamento</li>
              <li>• Soporte para filtros por período de tiempo</li>
              <li>• Validación automática de datos</li>
              <li>• Jerarquía: Objetivos → Iniciativas → Actividades</li>
            </ul>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Permisos:</p>
              <p className="text-xs text-muted-foreground">
                {profile?.role === "corporativo"
                  ? "Puedes importar datos para todas las áreas"
                  : "Puedes importar datos solo para tu área"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importación CSV
            </CardTitle>
            <CardDescription>Formato simple para múltiples áreas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>• Un archivo para múltiples departamentos</li>
              <li>• Mapeo personalizable de departamentos</li>
              <li>• Formato estándar y compatible</li>
              <li>• Fácil de generar desde otros sistemas</li>
            </ul>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Formato requerido:</p>
              <p className="text-xs text-muted-foreground">
                Columnas: type, title, description, owner_email, department, status, progress, start_date, end_date,
                parent_title
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Importaciones</CardTitle>
              <CardDescription>Registro de todas las importaciones realizadas</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchImportLogs}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : importLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay importaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {importLogs.map((log) => {
                // Check if this log has an active import in progress
                const activeImport = activeImports.find(active => 
                  active.id === log.id || active.id.includes(log.id.slice(0, 8))
                )
                
                if (activeImport) {
                  return (
                    <ImportProgressItem
                      key={log.id}
                      importData={activeImport}
                      onCancel={cancelImport}
                      onRetry={retryImport}
                    />
                  )
                }
                
                return (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium">{log.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "PPp", { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p>
                          {log.successful_records}/{log.total_records} exitosos
                        </p>
                        {log.failed_records > 0 && <p className="text-red-500">{log.failed_records} fallidos</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        {(log.status === 'failed' || log.status === 'cancelled') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => retryImport(log.id)}
                            className="h-8 px-2 text-xs"
                          >
                            Reintentar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
