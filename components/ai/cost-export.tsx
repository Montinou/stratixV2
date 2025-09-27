"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Filter,
  Settings,
  Clock,
  CheckCircle
} from "lucide-react"
import { useState } from "react"
import { DateRange } from "react-day-picker"
import type { Profile } from "@/lib/database/services"

interface ExportConfig {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  timeRange: DateRange | undefined
  includeMetrics: {
    costs: boolean
    usage: boolean
    users: boolean
    models: boolean
    errors: boolean
  }
  groupBy: 'day' | 'week' | 'month' | 'user' | 'model'
  filters: {
    minCost?: number
    maxCost?: number
    models?: string[]
    users?: string[]
  }
}

interface CostExportProps {
  profile: Profile
  className?: string
  onExport?: (config: ExportConfig) => void
}

export function CostExport({ profile, className, onExport }: CostExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    timeRange: undefined,
    includeMetrics: {
      costs: true,
      usage: true,
      users: false,
      models: true,
      errors: false
    },
    groupBy: 'day',
    filters: {}
  })
  const [recentExports, setRecentExports] = useState([
    {
      id: '1',
      name: 'Reporte Costos Septiembre',
      format: 'excel',
      createdAt: '2024-09-25T10:30:00Z',
      size: '2.3 MB',
      status: 'completed'
    },
    {
      id: '2',
      name: 'Análisis Usuarios Agosto',
      format: 'csv',
      createdAt: '2024-09-20T15:45:00Z',
      size: '1.1 MB',
      status: 'completed'
    }
  ])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/ai/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportConfig)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-costs-${Date.now()}.${exportConfig.format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        setShowDialog(false)
        onExport?.(exportConfig)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const quickExport = async (format: 'csv' | 'excel' | 'json') => {
    const quickConfig: ExportConfig = {
      ...exportConfig,
      format,
      timeRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        to: new Date()
      }
    }

    setIsExporting(true)
    try {
      const response = await fetch('/api/ai/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickConfig)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-costs-${Date.now()}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error in quick export:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />
      case 'csv': return <FileText className="h-4 w-4" />
      case 'json': return <FileJson className="h-4 w-4" />
      case 'pdf': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportación Rápida
          </CardTitle>
          <CardDescription>
            Exporta datos de los últimos 30 días en diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => quickExport('csv')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => quickExport('excel')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={() => quickExport('json')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Exportación Personalizada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configurar Exportación</DialogTitle>
                  <DialogDescription>
                    Personaliza los datos y formato para tu reporte
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Format Selection */}
                  <div className="space-y-3">
                    <Label>Formato de Archivo</Label>
                    <Select
                      value={exportConfig.format}
                      onValueChange={(value) => setExportConfig(prev => ({
                        ...prev,
                        format: value as any
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV - Valores Separados por Comas</SelectItem>
                        <SelectItem value="excel">Excel - Hoja de Cálculo</SelectItem>
                        <SelectItem value="json">JSON - Formato de Datos</SelectItem>
                        <SelectItem value="pdf">PDF - Reporte Visual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-3">
                    <Label>Rango de Fechas</Label>
                    <DatePickerWithRange
                      date={exportConfig.timeRange}
                      onDateChange={(range) => setExportConfig(prev => ({
                        ...prev,
                        timeRange: range
                      }))}
                    />
                  </div>

                  {/* Data to Include */}
                  <div className="space-y-3">
                    <Label>Datos a Incluir</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(exportConfig.includeMetrics).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={value}
                            onCheckedChange={(checked) =>
                              setExportConfig(prev => ({
                                ...prev,
                                includeMetrics: {
                                  ...prev.includeMetrics,
                                  [key]: checked === true
                                }
                              }))
                            }
                          />
                          <Label htmlFor={key} className="capitalize">
                            {key === 'costs' ? 'Costos' :
                             key === 'usage' ? 'Uso' :
                             key === 'users' ? 'Usuarios' :
                             key === 'models' ? 'Modelos' :
                             key === 'errors' ? 'Errores' : key}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group By */}
                  <div className="space-y-3">
                    <Label>Agrupar Por</Label>
                    <Select
                      value={exportConfig.groupBy}
                      onValueChange={(value) => setExportConfig(prev => ({
                        ...prev,
                        groupBy: value as any
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Día</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mes</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="model">Modelo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? "Exportando..." : "Exportar Datos"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Exportaciones Recientes
          </CardTitle>
          <CardDescription>
            Historial de reportes generados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExports.length > 0 ? (
            <div className="space-y-3">
              {recentExports.map((exportItem) => (
                <div key={exportItem.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getFormatIcon(exportItem.format)}
                    <div>
                      <p className="font-medium">{exportItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(exportItem.createdAt).toLocaleDateString('es-ES')} • {exportItem.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay exportaciones recientes</p>
          )}
        </CardContent>
      </Card>

      {/* Export Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Reporte</CardTitle>
          <CardDescription>
            Configuraciones predefinidas para casos comunes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setExportConfig({
                  format: 'excel',
                  timeRange: {
                    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    to: new Date()
                  },
                  includeMetrics: { costs: true, usage: true, users: true, models: true, errors: false },
                  groupBy: 'day',
                  filters: {}
                })
                setShowDialog(true)
              }}
            >
              <div className="text-left">
                <p className="font-medium">Reporte Mensual Completo</p>
                <p className="text-sm text-muted-foreground">
                  Costos, uso y usuarios del mes actual
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setExportConfig({
                  format: 'csv',
                  timeRange: {
                    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  },
                  includeMetrics: { costs: true, usage: false, users: false, models: true, errors: false },
                  groupBy: 'model',
                  filters: {}
                })
                setShowDialog(true)
              }}
            >
              <div className="text-left">
                <p className="font-medium">Análisis de Modelos</p>
                <p className="text-sm text-muted-foreground">
                  Costos por modelo de los últimos 7 días
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setExportConfig({
                  format: 'pdf',
                  timeRange: {
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  },
                  includeMetrics: { costs: true, usage: true, users: true, models: false, errors: false },
                  groupBy: 'week',
                  filters: {}
                })
                setShowDialog(true)
              }}
            >
              <div className="text-left">
                <p className="font-medium">Reporte Ejecutivo</p>
                <p className="text-sm text-muted-foreground">
                  Resumen visual para presentación
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setExportConfig({
                  format: 'json',
                  timeRange: {
                    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    to: new Date()
                  },
                  includeMetrics: { costs: true, usage: true, users: false, models: false, errors: true },
                  groupBy: 'day',
                  filters: {}
                })
                setShowDialog(true)
              }}
            >
              <div className="text-left">
                <p className="font-medium">Datos de Desarrollo</p>
                <p className="text-sm text-muted-foreground">
                  JSON para análisis programático
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}