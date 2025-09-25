"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Upload, Download, FileSpreadsheet, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useImportProgress } from "@/lib/hooks/use-import-progress"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

interface FileImportDialogProps {
  children: React.ReactNode
}

interface FileImportDialogProps {
  children: React.ReactNode
  onImportStart?: (importId: string) => void
}

export function FileImportDialog({ children, onImportStart }: FileImportDialogProps) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [periodStart, setPeriodStart] = useState<Date>()
  const [periodEnd, setPeriodEnd] = useState<Date>()
  const [departmentMapping, setDepartmentMapping] = useState<Record<string, string>>({})
  
  const { startTracking } = useImportProgress()

  const canImport = profile?.role === "corporativo" || profile?.role === "gerente"

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const fileType = selectedFile.name.split(".").pop()?.toLowerCase()
      if (fileType === "xlsx" || fileType === "csv") {
        setFile(selectedFile)
      } else {
        toast.error("Por favor selecciona un archivo XLSX o CSV válido")
      }
    }
  }

  const handleImport = async () => {
    if (!file || !canImport) return

    setImporting(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', file.name.endsWith('.xlsx') ? 'xlsx' : 'csv')
      
      if (periodStart) {
        formData.append('periodStart', periodStart.toISOString())
      }
      if (periodEnd) {
        formData.append('periodEnd', periodEnd.toISOString())
      }
      if (Object.keys(departmentMapping).length > 0) {
        formData.append('departmentMapping', JSON.stringify(departmentMapping))
      }

      // Upload and start import process
      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error durante la importación')
      }

      const result = await response.json()
      
      // Start tracking the import progress
      startTracking(result.importId, {
        status: 'pending',
        total_records: result.estimatedRecords || 0
      })
      
      // Notify parent component
      onImportStart?.(result.importId)
      
      toast.success('Importación iniciada. Puedes seguir el progreso en tiempo real.')
      
      setOpen(false)
      setFile(null)
      setPeriodStart(undefined)
      setPeriodEnd(undefined)
      setDepartmentMapping({})
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error durante la importación'
      toast.error(errorMessage)
      console.error('Import error:', error)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async (type: "xlsx" | "csv") => {
    try {
      const response = await fetch(`/api/import/template?type=${type}`)
      
      if (!response.ok) {
        throw new Error('Error al descargar la plantilla')
      }
      
      const blob = await response.blob()
      const filename = type === 'xlsx' ? 'okr_template.xlsx' : 'okr_template.csv'
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Template download error:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  if (!canImport) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Datos OKR</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="xlsx" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="xlsx" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel (XLSX)
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xlsx" className="space-y-4">
            <div className="space-y-2">
              <Label>Archivo Excel</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".xlsx" onChange={handleFileChange} className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => downloadTemplate("xlsx")}>
                  <Download className="h-4 w-4 mr-2" />
                  Plantilla
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Cada hoja del Excel representa un área/departamento diferente
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de inicio del período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodStart && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart ? format(periodStart, "PPP") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha de fin del período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodEnd && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd ? format(periodEnd, "PPP") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label>Archivo CSV</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".csv" onChange={handleFileChange} className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => downloadTemplate("csv")}>
                  <Download className="h-4 w-4 mr-2" />
                  Plantilla
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                El CSV puede contener datos de múltiples áreas en un solo archivo
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mapeo de Departamentos (opcional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nombre en CSV"
                  onChange={(e) => {
                    const value = e.target.value
                    setDepartmentMapping((prev) => ({
                      ...prev,
                      [value]: prev[value] || "",
                    }))
                  }}
                />
                <Input
                  placeholder="Nombre en sistema"
                  onChange={(e) => {
                    const keys = Object.keys(departmentMapping)
                    const lastKey = keys[keys.length - 1]
                    if (lastKey) {
                      setDepartmentMapping((prev) => ({
                        ...prev,
                        [lastKey]: e.target.value,
                      }))
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Mapea nombres de departamentos del CSV a los nombres en tu sistema
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || importing} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {importing ? "Importando..." : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
