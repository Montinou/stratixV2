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
import { FileImporter } from "@/lib/utils/file-import"
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
    const importer = new FileImporter()

    try {
      let result

      if (file.name.endsWith(".xlsx")) {
        result = await importer.importXLSX(file, periodStart, periodEnd)
      } else {
        result = await importer.importCSV(file, departmentMapping)
      }

      if (result.success) {
        toast.success(`Importación completada: ${result.successfulRecords} registros importados`)
      } else {
        toast.error(`Importación con errores: ${result.failedRecords} registros fallaron`)
      }

      setOpen(false)
      setFile(null)
    } catch (error) {
      toast.error("Error durante la importación")
      console.error("Import error:", error)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (type: "xlsx" | "csv") => {
    let blob: Blob
    let filename: string

    if (type === "xlsx") {
      blob = FileImporter.generateXLSXTemplate()
      filename = "okr_template.xlsx"
    } else {
      blob = FileImporter.generateCSVTemplate()
      filename = "okr_template.csv"
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
