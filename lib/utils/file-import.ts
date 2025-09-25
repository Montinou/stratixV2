import { ServerFileImporter } from "./server-file-import"
import type { ImportResult } from "@/lib/validations/import"

/**
 * Client-side file import utility that delegates to server-side processing
 * @deprecated Use server-side import API endpoints instead of direct client calls
 */
export class FileImporter {
  
  /**
   * Import XLSX file - delegates to server-side processing
   * @deprecated This method is deprecated. Use API endpoint /api/import instead
   */
  async importXLSX(file: File, periodStart?: Date, periodEnd?: Date): Promise<ImportResult> {
    console.warn("FileImporter.importXLSX is deprecated. Use /api/import endpoint instead.")
    
    try {
      // Convert file to buffer for server processing
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const importer = new ServerFileImporter()
      
      const options = {
        periodStart: periodStart?.toISOString().split('T')[0],
        periodEnd: periodEnd?.toISOString().split('T')[0]
      }
      
      return await importer.importFromFile(buffer, file.name, "xlsx", options)
      
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [
          {
            row: 0,
            field: "file",
            message: error instanceof Error ? error.message : "Error reading file",
            value: file.name,
          },
        ],
      }
    }
  }

  /**
   * Import CSV file - delegates to server-side processing  
   * @deprecated This method is deprecated. Use API endpoint /api/import instead
   */
  async importCSV(file: File, departmentMapping?: Record<string, string>): Promise<ImportResult> {
    console.warn("FileImporter.importCSV is deprecated. Use /api/import endpoint instead.")
    
    try {
      // Convert file to buffer for server processing
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const importer = new ServerFileImporter()
      
      const options = {
        departmentMapping
      }
      
      return await importer.importFromFile(buffer, file.name, "csv", options)
      
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [
          {
            row: 0,
            field: "file", 
            message: error instanceof Error ? error.message : "Error reading file",
            value: file.name,
          },
        ],
      }
    }
  }

  /**
   * Generate Excel template using server-side utility
   */
  static generateXLSXTemplate(): Blob {
    const buffer = ServerFileImporter.generateExcelTemplate()
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  }

  /**
   * Generate CSV template using server-side utility
   */
  static generateCSVTemplate(): Blob {
    const buffer = ServerFileImporter.generateCSVTemplate()
    return new Blob([buffer], { type: "text/csv" })
  }
}
