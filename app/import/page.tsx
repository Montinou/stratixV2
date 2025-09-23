"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileImportDialog } from "@/components/import/file-import-dialog"
import { Upload, FileSpreadsheet, Clock, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import type { ImportLog } from "@/lib/types/import"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function ImportPage() {
  const { profile } = useAuth()
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const canImport = profile?.role === "corporativo" || profile?.role === "gerente"

  useEffect(() => {
    if (canImport) {
      fetchImportLogs()
    }
  }, [canImport])

  const fetchImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setImportLogs(data || [])
    } catch (error) {
      console.error("Error fetching import logs:", error)
    } finally {
      setLoading(false)
    }
  }

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
        </div>

        <FileImportDialog>
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Datos
          </Button>
        </FileImportDialog>
      </div>

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
          <CardTitle>Historial de Importaciones</CardTitle>
          <CardDescription>Registro de todas las importaciones realizadas</CardDescription>
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
              {importLogs.map((log) => (
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
                    {getStatusBadge(log.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
