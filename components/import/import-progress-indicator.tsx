"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Loader2, Pause, RotateCcw, X } from "lucide-react"
import { ImportProgressData } from "@/lib/hooks/use-import-progress"
import { cn } from "@/lib/utils"

interface ImportProgressIndicatorProps {
  importData: ImportProgressData
  onCancel?: (importId: string) => void
  onRetry?: (importId: string) => void
  className?: string
}

export function ImportProgressIndicator({ 
  importData, 
  onCancel, 
  onRetry, 
  className 
}: ImportProgressIndicatorProps) {
  const getProgressPercentage = () => {
    if (importData.total_records === 0) return 0
    return Math.round((importData.processed_records / importData.total_records) * 100)
  }

  const getStatusIcon = () => {
    switch (importData.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "cancelled":
        return <Pause className="h-5 w-5 text-gray-500" />
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = () => {
    const variants = {
      pending: "secondary",
      processing: "default",
      completed: "success",
      failed: "destructive",
      cancelled: "secondary",
    } as const

    const labels = {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      failed: "Fallido",
      cancelled: "Cancelado",
    }

    return (
      <Badge variant={variants[importData.status] || "secondary"}>
        {labels[importData.status]}
      </Badge>
    )
  }

  const canCancel = importData.status === "pending" || importData.status === "processing"
  const canRetry = importData.status === "failed" || importData.status === "cancelled"

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Status and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">Importación {importData.id.slice(0, 8)}</span>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center gap-2">
            {canCancel && onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(importData.id)}
                className="h-8 px-2"
              >
                <X className="h-3 w-3" />
                Cancelar
              </Button>
            )}
            {canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(importData.id)}
                className="h-8 px-2"
              >
                <RotateCcw className="h-3 w-3" />
                Reintentar
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {importData.status === "processing" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Progreso: {importData.processed_records}/{importData.total_records} registros</span>
              <span className="font-medium">{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            
            {importData.current_step && (
              <p className="text-sm text-muted-foreground">
                {importData.current_step}
              </p>
            )}
          </div>
        )}

        {/* Results Summary */}
        {(importData.status === "completed" || importData.status === "failed") && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-green-600">{importData.successful_records}</p>
              <p className="text-muted-foreground">Exitosos</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-red-600">{importData.failed_records}</p>
              <p className="text-muted-foreground">Fallidos</p>
            </div>
            <div className="text-center">
              <p className="font-medium">{importData.total_records}</p>
              <p className="text-muted-foreground">Total</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {importData.status === "failed" && importData.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{importData.error_message}</p>
          </div>
        )}

        {/* Processing Info */}
        {importData.status === "processing" && importData.total_records > 0 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Iniciado: {new Date(importData.created_at).toLocaleTimeString()}</span>
            <span>
              Tiempo estimado: {
                importData.processed_records > 0 
                  ? Math.round(((importData.total_records - importData.processed_records) / importData.processed_records) * 
                      (Date.now() - new Date(importData.created_at).getTime()) / 60000)
                  : "Calculando..."
              } min
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for list views
interface ImportProgressItemProps {
  importData: ImportProgressData
  onCancel?: (importId: string) => void
  onRetry?: (importId: string) => void
}

export function ImportProgressItem({ 
  importData, 
  onCancel, 
  onRetry 
}: ImportProgressItemProps) {
  const getProgressPercentage = () => {
    if (importData.total_records === 0) return 0
    return Math.round((importData.processed_records / importData.total_records) * 100)
  }

  const getStatusIcon = () => {
    switch (importData.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <Pause className="h-4 w-4 text-gray-500" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const canCancel = importData.status === "pending" || importData.status === "processing"
  const canRetry = importData.status === "failed" || importData.status === "cancelled"

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3 flex-1">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">Importación {importData.id.slice(0, 8)}</span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {importData.status}
            </Badge>
          </div>
          
          {importData.status === "processing" ? (
            <div className="space-y-1">
              <Progress value={getProgressPercentage()} className="h-1" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{importData.processed_records}/{importData.total_records}</span>
                <span>{getProgressPercentage()}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {importData.successful_records}/{importData.total_records} exitosos
            </div>
          )}
        </div>
      </div>

      {(canCancel || canRetry) && (
        <div className="flex items-center gap-1">
          {canCancel && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(importData.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {canRetry && onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRetry(importData.id)}
              className="h-6 w-6 p-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}