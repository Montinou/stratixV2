"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Upload, Download, FileSpreadsheet, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

interface FileImportDialogProps {
  children: React.ReactNode
}

export function FileImportDialog({ children }: FileImportDialogProps) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importStep, setImportStep] = useState<"idle" | "uploading" | "processing" | "completed">("idle")
  const [periodStart, setPeriodStart] = useState<Date>()
  const [periodEnd, setPeriodEnd] = useState<Date>()
  const [departmentMapping, setDepartmentMapping] = useState<Record<string, string>>({})

  const canImport = profile?.role === "corporativo" || profile?.role === "gerente"

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const fileType = selectedFile.name.split(".").pop()?.toLowerCase()
      const maxFileSize = 10 * 1024 * 1024 // 10MB limit
      
      if (fileType !== "xlsx" && fileType !== "csv") {
        toast.error("Por favor selecciona un archivo XLSX o CSV válido")
        return
      }
      
      if (selectedFile.size > maxFileSize) {
        toast.error("El archivo es demasiado grande. El tamaño máximo permitido es 10MB")
        return
      }
      
      // Additional validation for file content type
      const validMimeTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv", // .csv
        "application/csv"
      ]
      
      if (!validMimeTypes.includes(selectedFile.type) && selectedFile.type !== "") {
        toast.error("Tipo de archivo no válido. Solo se permiten archivos XLSX y CSV")
        return
      }
      
      setFile(selectedFile)
      toast.success(`Archivo seleccionado: ${selectedFile.name}`)
    }
  }

  const handleImport = async () => {
    if (!file || !canImport) return

    setImporting(true)
    setImportStep("uploading")
    setUploadProgress(0)

    try {
      // Create form data for multipart upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", file.name.split(".").pop()?.toLowerCase() || "")
      
      // Add XLSX-specific parameters
      if (file.name.endsWith(".xlsx")) {
        if (periodStart) {
          formData.append("periodStart", periodStart.toISOString())
        }
        if (periodEnd) {
          formData.append("periodEnd", periodEnd.toISOString())
        }
      } else {
        // Add CSV-specific parameters (department mapping)
        if (Object.keys(departmentMapping).length > 0) {
          formData.append("departmentMapping", JSON.stringify(departmentMapping))
        }
      }

      // Simulate upload progress
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadProgressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Upload file to API endpoint
      const uploadResponse = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(uploadProgressInterval)
      setUploadProgress(100)

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `Upload failed: ${uploadResponse.status}`)
      }

      const uploadResult = await uploadResponse.json()
      const { importId } = uploadResult

      // Start processing step
      setImportStep("processing")
      setUploadProgress(0)

      // Start processing via API endpoint
      const processResponse = await fetch("/api/import/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ importId }),
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `Processing failed: ${processResponse.status}`)
      }

      const result = await processResponse.json()

      // Update to completed step
      setImportStep("completed")
      setUploadProgress(100)

      // Show results based on API response
      if (result.success) {
        toast.success(
          `Importación completada: ${result.successfulRecords} registros importados${
            result.failedRecords > 0 ? `, ${result.failedRecords} fallidos` : ""
          }`
        )
      } else {
        toast.error(
          `Importación con errores: ${result.failedRecords} registros fallaron de ${result.totalRecords} total`
        )
      }

      // Reset form and close dialog on success after a brief delay
      setTimeout(() => {
        setOpen(false)
        setFile(null)
        setPeriodStart(undefined)
        setPeriodEnd(undefined)
        setDepartmentMapping({})
        setImportStep("idle")
        setUploadProgress(0)
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error durante la importación"
      toast.error(errorMessage)
      console.error("Import error:", error)
      setImportStep("idle")
      setUploadProgress(0)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async (type: "xlsx" | "csv") => {
    try {
      const response = await fetch(`/api/import/template?type=${type}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.status}`)
      }

      const blob = await response.blob()
      const filename = type === "xlsx" ? "okr_template.xlsx" : "okr_template.csv"

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Plantilla ${type.toUpperCase()} descargada correctamente`)
    } catch (error) {
      toast.error("Error al descargar la plantilla")
      console.error("Template download error:", error)
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

        {/* Progress indicator */}
        {importing && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {importStep === "uploading" && "Subiendo archivo..."}
                {importStep === "processing" && "Procesando datos..."}
                {importStep === "completed" && "¡Completado!"}
              </span>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            {importStep === "processing" && (
              <p className="text-xs text-muted-foreground">
                Esto puede tomar varios minutos dependiendo del tamaño del archivo
              </p>
            )}
          </div>
        )}

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
