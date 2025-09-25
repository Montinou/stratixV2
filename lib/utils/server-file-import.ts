import * as XLSX from "xlsx"
import Papa from "papaparse"
import { z } from "zod"
import DOMPurify from "isomorphic-dompurify"
import { 
  importRecordSchema,
  importBatchSchema,
  fileUploadSchema,
  validationErrorSchema,
  importResultSchema,
  type ImportRecord,
  type ValidationError,
  type ImportResult,
  type ImportBatch
} from "@/lib/validations/import"
import type { ImportLog } from "@/lib/types/import"

/**
 * Server-side file import utility with comprehensive validation and security
 */
export class ServerFileImporter {
  private errors: ValidationError[] = []
  private processedRecords: ImportRecord[] = []
  private importStartTime: number = 0
  
  /**
   * Import data from an uploaded file with comprehensive validation
   */
  async importFromFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: "xlsx" | "csv",
    options?: {
      periodStart?: string
      periodEnd?: string
      departmentMapping?: Record<string, string>
    }
  ): Promise<ImportResult> {
    this.importStartTime = Date.now()
    this.errors = []
    this.processedRecords = []
    
    try {
      // Validate file size (10MB limit)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new Error("El archivo excede el límite de 10MB")
      }
      
      let rawRecords: any[] = []
      
      // Parse file based on type
      if (fileType === "xlsx") {
        rawRecords = await this.parseXLSXFile(fileBuffer, options?.periodStart, options?.periodEnd)
      } else if (fileType === "csv") {
        rawRecords = await this.parseCSVFile(fileBuffer, options?.departmentMapping)
      } else {
        throw new Error("Tipo de archivo no soportado")
      }
      
      // Validate and sanitize each record
      for (let i = 0; i < rawRecords.length; i++) {
        try {
          const sanitizedRecord = this.sanitizeRecord(rawRecords[i])
          const validatedRecord = this.validateRecord(sanitizedRecord, i + 2) // +2 for header row
          
          if (validatedRecord) {
            this.processedRecords.push(validatedRecord)
          }
        } catch (error) {
          this.addError(i + 2, "validation", error instanceof Error ? error.message : "Error de validación", rawRecords[i])
        }
      }
      
      // Validate the entire batch
      const batchValidation = this.validateBatch({
        records: this.processedRecords,
        fileName,
        fileType,
        importPeriodStart: options?.periodStart,
        importPeriodEnd: options?.periodEnd,
        departmentMapping: options?.departmentMapping
      })
      
      if (!batchValidation.success) {
        this.errors.push(...batchValidation.errors)
      }
      
      // Validate hierarchical relationships
      this.validateHierarchy()
      
      const result: ImportResult = {
        success: this.errors.length === 0,
        totalRecords: rawRecords.length,
        successfulRecords: this.processedRecords.length,
        failedRecords: rawRecords.length - this.processedRecords.length,
        errors: this.errors,
        processingTimeMs: Date.now() - this.importStartTime
      }
      
      return result
      
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{
          row: 0,
          field: "file",
          message: error instanceof Error ? error.message : "Error procesando archivo",
          value: fileName
        }],
        processingTimeMs: Date.now() - this.importStartTime
      }
    }
  }
  
  /**
   * Parse XLSX file with comprehensive validation
   */
  private async parseXLSXFile(
    buffer: Buffer,
    periodStart?: string,
    periodEnd?: string
  ): Promise<any[]> {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const allData: any[] = []
    
    if (workbook.SheetNames.length === 0) {
      throw new Error("El archivo Excel no contiene hojas de datos")
    }
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      try {
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          this.addError(0, "sheet", `La hoja "${sheetName}" está vacía o corrupta`, sheetName)
          return
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: "",
          blankrows: false
        })
        
        if (jsonData.length < 2) {
          this.addError(0, "sheet", `La hoja "${sheetName}" no contiene datos suficientes`, sheetName)
          return
        }
        
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]
        
        // Validate headers
        const requiredHeaders = ["type", "title", "owner_email", "start_date", "end_date", "status"]
        const missingHeaders = requiredHeaders.filter(header => 
          !headers.some(h => h.toLowerCase().replace(/\s+/g, "_") === header)
        )
        
        if (missingHeaders.length > 0) {
          this.addError(1, "headers", `Faltan columnas requeridas en la hoja "${sheetName}": ${missingHeaders.join(", ")}`, headers)
          return
        }
        
        // Process rows
        rows.forEach((row, rowIndex) => {
          if (!row || row.every(cell => !cell)) return // Skip empty rows
          
          try {
            const rowData = this.parseRowData(headers, row, sheetName)
            if (rowData) {
              // Apply period filter if specified
              if (this.isWithinPeriod(rowData, periodStart, periodEnd)) {
                allData.push(rowData)
              }
            }
          } catch (error) {
            this.addError(
              rowIndex + 2, // +2 for header and 0-based index
              "parsing",
              error instanceof Error ? error.message : "Error parseando fila",
              row
            )
          }
        })
        
      } catch (error) {
        this.addError(0, "sheet", `Error procesando hoja "${sheetName}": ${error instanceof Error ? error.message : "Error desconocido"}`, sheetName)
      }
    })
    
    return allData
  }
  
  /**
   * Parse CSV file with comprehensive validation
   */
  private async parseCSVFile(
    buffer: Buffer,
    departmentMapping?: Record<string, string>
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const csvText = buffer.toString("utf-8")
      
      // Basic CSV structure validation
      if (!csvText.trim()) {
        reject(new Error("El archivo CSV está vacío"))
        return
      }
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header: string) => header.toLowerCase().trim().replace(/\s+/g, "_"),
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              reject(new Error("El archivo CSV no contiene datos"))
              return
            }
            
            // Validate headers
            const headers = Object.keys(results.data[0] as any)
            const requiredHeaders = ["type", "title", "owner_email", "start_date", "end_date", "status"]
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
            
            if (missingHeaders.length > 0) {
              reject(new Error(`Faltan columnas requeridas: ${missingHeaders.join(", ")}`))
              return
            }
            
            const processedData: any[] = []
            
            results.data.forEach((row: any, index) => {
              if (!row || Object.values(row).every(value => !value)) return // Skip empty rows
              
              try {
                const rowData = this.parseCSVRow(row, departmentMapping)
                if (rowData) {
                  processedData.push(rowData)
                }
              } catch (error) {
                this.addError(
                  index + 2, // +2 for header and 0-based index
                  "parsing",
                  error instanceof Error ? error.message : "Error parseando fila CSV",
                  row
                )
              }
            })
            
            resolve(processedData)
          } catch (error) {
            reject(error)
          }
        },
        error: (error) => {
          reject(new Error(`Error parseando CSV: ${error.message}`))
        }
      })
    })
  }
  
  /**
   * Parse individual row data from Excel
   */
  private parseRowData(headers: string[], row: any[], department?: string): any | null {
    if (!row || row.length === 0) return null
    
    const data: any = {}
    
    headers.forEach((header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, "_")
      let value = row[index]
      
      // Handle Excel date parsing
      if (key.includes("date") && value instanceof Date) {
        value = value.toISOString().split("T")[0] // Convert to YYYY-MM-DD
      } else if (key.includes("date") && typeof value === "number") {
        // Handle Excel serial date
        const excelDate = new Date((value - 25569) * 86400 * 1000)
        value = excelDate.toISOString().split("T")[0]
      }
      
      data[key] = value
    })
    
    // Set department from sheet name if not provided
    if (department && !data.department) {
      data.department = department
    }
    
    return this.normalizeRowData(data)
  }
  
  /**
   * Parse individual row data from CSV
   */
  private parseCSVRow(row: any, departmentMapping?: Record<string, string>): any | null {
    if (!row || Object.values(row).every(value => !value)) return null
    
    // Apply department mapping
    if (departmentMapping && row.department) {
      row.department = departmentMapping[row.department] || row.department
    }
    
    return this.normalizeRowData(row)
  }
  
  /**
   * Normalize row data structure
   */
  private normalizeRowData(data: any): any {
    if (!data.title || !data.owner_email) return null
    
    return {
      type: data.type || "objective",
      title: String(data.title || "").trim(),
      description: String(data.description || "").trim(),
      owner_email: String(data.owner_email || "").toLowerCase().trim(),
      department: String(data.department || "").trim(),
      status: data.status || "no_iniciado",
      progress: this.parseProgress(data.progress),
      start_date: this.parseDate(data.start_date),
      end_date: this.parseDate(data.end_date),
      parent_title: data.parent_title ? String(data.parent_title).trim() : undefined
    }
  }
  
  /**
   * Parse progress value safely
   */
  private parseProgress(value: any): number {
    if (typeof value === "number") return Math.max(0, Math.min(100, Math.floor(value)))
    if (typeof value === "string") {
      const num = Number.parseFloat(value.replace("%", ""))
      if (!isNaN(num)) return Math.max(0, Math.min(100, Math.floor(num)))
    }
    return 0
  }
  
  /**
   * Parse date value safely
   */
  private parseDate(value: any): string {
    if (!value) return ""
    
    if (value instanceof Date) {
      return value.toISOString().split("T")[0]
    }
    
    if (typeof value === "string") {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    }
    
    if (typeof value === "number") {
      // Handle Excel serial dates
      const excelDate = new Date((value - 25569) * 86400 * 1000)
      if (!isNaN(excelDate.getTime())) {
        return excelDate.toISOString().split("T")[0]
      }
    }
    
    return String(value)
  }
  
  /**
   * Check if record is within specified period
   */
  private isWithinPeriod(record: any, periodStart?: string, periodEnd?: string): boolean {
    if (!periodStart && !periodEnd) return true
    
    try {
      const startDate = new Date(record.start_date)
      const endDate = new Date(record.end_date)
      
      if (periodStart) {
        const filterStart = new Date(periodStart)
        if (startDate < filterStart) return false
      }
      
      if (periodEnd) {
        const filterEnd = new Date(periodEnd)
        if (endDate > filterEnd) return false
      }
      
      return true
    } catch {
      return true // Include if dates can't be parsed
    }
  }
  
  /**
   * Sanitize record data to prevent XSS and injection attacks
   */
  private sanitizeRecord(record: any): any {
    const sanitized = { ...record }
    
    // Sanitize string fields
    const stringFields = ["title", "description", "owner_email", "department", "parent_title"]
    stringFields.forEach(field => {
      if (typeof sanitized[field] === "string") {
        sanitized[field] = DOMPurify.sanitize(sanitized[field], { ALLOWED_TAGS: [] })
      }
    })
    
    return sanitized
  }
  
  /**
   * Validate individual record using Zod schema
   */
  private validateRecord(record: any, rowNumber: number): ImportRecord | null {
    try {
      return importRecordSchema.parse(record)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          this.addError(
            rowNumber,
            err.path.join("."),
            err.message,
            record[err.path[0]]
          )
        })
      }
      return null
    }
  }
  
  /**
   * Validate entire import batch
   */
  private validateBatch(batch: ImportBatch): { success: boolean; errors: ValidationError[] } {
    try {
      importBatchSchema.parse(batch)
      return { success: true, errors: [] }
    } catch (error) {
      const errors: ValidationError[] = []
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: 0,
            field: err.path.join("."),
            message: err.message,
            value: err.path.reduce((obj, path) => obj?.[path], batch)
          })
        })
      }
      return { success: false, errors }
    }
  }
  
  /**
   * Validate hierarchical relationships (objectives -> initiatives -> activities)
   */
  private validateHierarchy(): void {
    const objectiveTitles = new Set(
      this.processedRecords
        .filter(r => r.type === "objective")
        .map(r => r.title)
    )
    
    const initiativeTitles = new Set(
      this.processedRecords
        .filter(r => r.type === "initiative")
        .map(r => r.title)
    )
    
    // Validate that initiatives reference existing objectives
    this.processedRecords
      .filter(r => r.type === "initiative" && r.parent_title)
      .forEach((initiative, index) => {
        if (!objectiveTitles.has(initiative.parent_title!)) {
          this.addError(
            index + 2,
            "parent_title",
            `La iniciativa "${initiative.title}" referencia un objetivo inexistente: "${initiative.parent_title}"`,
            initiative.parent_title
          )
        }
      })
    
    // Validate that activities reference existing initiatives
    this.processedRecords
      .filter(r => r.type === "activity" && r.parent_title)
      .forEach((activity, index) => {
        if (!initiativeTitles.has(activity.parent_title!)) {
          this.addError(
            index + 2,
            "parent_title",
            `La actividad "${activity.title}" referencia una iniciativa inexistente: "${activity.parent_title}"`,
            activity.parent_title
          )
        }
      })
  }
  
  /**
   * Add validation error
   */
  private addError(row: number, field: string, message: string, value?: any): void {
    this.errors.push({
      row,
      field,
      message,
      value
    })
  }
  
  /**
   * Get processed records for successful import
   */
  getProcessedRecords(): ImportRecord[] {
    return this.processedRecords
  }
  
  /**
   * Get all validation errors
   */
  getErrors(): ValidationError[] {
    return this.errors
  }
  
  /**
   * Generate Excel template with proper structure and validation
   */
  static generateExcelTemplate(): Buffer {
    const wb = XLSX.utils.book_new()
    
    // Sample data with proper validation
    const sampleData = [
      [
        "type", "title", "description", "owner_email", "department", 
        "status", "progress", "start_date", "end_date", "parent_title"
      ],
      [
        "objective", "Aumentar Ingresos por Ventas", "Incrementar los ingresos trimestrales en un 20%",
        "gerente@empresa.com", "Ventas", "en_progreso", 50, "2024-01-01", "2024-03-31", ""
      ],
      [
        "initiative", "Campaña de Marketing Digital", "Lanzar campaña de marketing digital",
        "marketing@empresa.com", "Marketing", "no_iniciado", 0, "2024-01-15", "2024-02-28", "Aumentar Ingresos por Ventas"
      ],
      [
        "activity", "Crear Contenido para Redes Sociales", "Desarrollar calendario de contenido",
        "social@empresa.com", "Marketing", "no_iniciado", 0, "2024-01-15", "2024-01-31", "Campaña de Marketing Digital"
      ]
    ]
    
    const departments = ["Ventas", "Marketing", "Ingeniería", "Recursos Humanos"]
    
    departments.forEach(dept => {
      const ws = XLSX.utils.aoa_to_sheet(sampleData)
      XLSX.utils.book_append_sheet(wb, ws, dept)
    })
    
    return Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "array" }))
  }
  
  /**
   * Generate CSV template with proper structure and validation
   */
  static generateCSVTemplate(): Buffer {
    const csvContent = `type,title,description,owner_email,department,status,progress,start_date,end_date,parent_title
objective,"Aumentar Ingresos por Ventas","Incrementar los ingresos trimestrales en un 20%",gerente@empresa.com,Ventas,en_progreso,50,2024-01-01,2024-03-31,
initiative,"Campaña de Marketing Digital","Lanzar campaña de marketing digital",marketing@empresa.com,Marketing,no_iniciado,0,2024-01-15,2024-02-28,"Aumentar Ingresos por Ventas"
activity,"Crear Contenido para Redes Sociales","Desarrollar calendario de contenido",social@empresa.com,Marketing,no_iniciado,0,2024-01-15,2024-01-31,"Campaña de Marketing Digital"`
    
    return Buffer.from(csvContent, "utf-8")
  }
}