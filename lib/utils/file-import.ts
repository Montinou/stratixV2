import * as XLSX from "xlsx"
import Papa from "papaparse"
import type { ImportTemplate, ImportResult, ImportError } from "@/lib/types/import"

// TODO: Import functionality will be updated to use server actions
// in a future task after core CRUD operations are complete
export class FileImporter {
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
  async importXLSX(file: File, periodStart?: Date, periodEnd?: Date): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      // TODO: Implement XLSX import functionality with API calls
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{ row: 1, message: "XLSX import not implemented yet", data: {} as any }],
      }
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{ row: 1, message: `Import error: ${error}`, data: {} as any }],
      }
    }
  }

  async importCSV(file: File, periodStart?: Date, periodEnd?: Date): Promise<ImportResult> {
    try {
      const text = await file.text()

<<<<<<< Updated upstream
            results.data.forEach((row: any, index) => {
              try {
                const rowData = this.parseCSVRow(row, departmentMapping)
                if (rowData) {
                  allData.push(rowData)
                }
              } catch (error) {
                errors.push({
                  row: index + 2,
                  field: "general",
                  message: error instanceof Error ? error.message : "Error parsing row",
                  data: row,
                })
              }
            })

            const result = await this.processImportData(allData, errors, file.name, "csv")
            resolve(result)
          } catch (error) {
            resolve({
              success: false,
              totalRecords: 0,
              successfulRecords: 0,
              failedRecords: 0,
              errors: [
                {
                  row: 0,
                  field: "file",
                  message: error instanceof Error ? error.message : "Error processing CSV",
                  data: null,
                },
              ],
            })
          }
        },
        error: (error) => {
          resolve({
            success: false,
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            errors: [
              {
                row: 0,
                field: "file",
                message: error.message,
                data: null,
              },
            ],
          })
        },
      })
    })
  }

  private parseRowData(headers: string[], row: any[], department?: string): ImportTemplate | null {
    if (!row || row.length === 0) return null

    const data: any = {}
    headers.forEach((header, index) => {
      data[header.toLowerCase().replace(/\s+/g, "_")] = row[index]
    })

    // Validate required fields
    if (!data.title || !data.owner_email || !data.start_date || !data.end_date) {
      throw new Error("Missing required fields: title, owner_email, start_date, end_date")
    }

    return {
      type: data.type || "objective",
      title: data.title,
      description: data.description || "",
      owner_email: data.owner_email,
      department: data.department || department || "",
      status: data.status || "no_iniciado",
      progress: Number.parseInt(data.progress) || 0,
      start_date: data.start_date,
      end_date: data.end_date,
      parent_title: data.parent_title,
    }
  }

  private parseCSVRow(row: any, departmentMapping?: Record<string, string>): ImportTemplate | null {
    if (!row.title || !row.owner_email) return null

    const department = departmentMapping?.[row.department] || row.department || ""

    return {
      type: row.type || "objective",
      title: row.title,
      description: row.description || "",
      owner_email: row.owner_email,
      department,
      status: row.status || "no_iniciado",
      progress: Number.parseInt(row.progress) || 0,
      start_date: row.start_date,
      end_date: row.end_date,
      parent_title: row.parent_title,
    }
  }

  private async processImportData(
    data: ImportTemplate[],
    errors: ImportError[],
    fileName: string,
    fileType: "xlsx" | "csv",
  ): Promise<ImportResult> {
    let successfulRecords = 0
    const totalRecords = data.length

    // TODO: Create import log using server actions
    const importLog = null

    // Process each record
    for (const record of data) {
      try {
        // TODO: Implement createOKRRecord using server actions
        successfulRecords++
      } catch (error) {
        errors.push({
          row: data.indexOf(record) + 1,
          field: "database",
          message: error instanceof Error ? error.message : "Database error",
          data: record,
        })
      }
    }

    // TODO: Update import log using server actions
    // Update logic will be implemented when import functionality is migrated

    return {
      success: errors.length === 0,
      totalRecords,
      successfulRecords,
      failedRecords: totalRecords - successfulRecords,
      errors,
    }
  }

  private async createOKRRecord(record: ImportTemplate): Promise<void> {
    // TODO: Implement using server actions from @/lib/actions
    // This method will be rewritten to use:
    // - ProfilesService.getByEmail() to find owner
    // - ObjectivesService.create() for objectives
    // - InitiativesService.create() for initiatives  
    // - ActivitiesService.create() for activities
    throw new Error("Import functionality temporarily disabled during database migration")
=======
      // TODO: Implement CSV import functionality with API calls
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{ row: 1, message: "CSV import not implemented yet", data: {} as any }],
      }
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{ row: 1, message: `Import error: ${error}`, data: {} as any }],
      }
    }
>>>>>>> Stashed changes
  }

  // Generate template files
  static generateXLSXTemplate(): Blob {
    const wb = XLSX.utils.book_new()

    // Sample data for each sheet
    const objectivesData = [
      {
        type: "objective",
        title: "Aumentar ventas en 20%",
        description: "Incrementar las ventas del producto principal",
        owner_email: "gerente@empresa.com",
        department: "Ventas",
        status: "en_progreso",
        progress: 45,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        parent_title: "",
      },
    ]

    const initiativesData = [
      {
        type: "initiative",
        title: "Campaña de marketing digital",
        description: "Implementar estrategia de redes sociales",
        owner_email: "marketing@empresa.com",
        department: "Marketing",
        status: "en_progreso",
        progress: 60,
        start_date: "2024-02-01",
        end_date: "2024-06-30",
        parent_title: "Aumentar ventas en 20%",
      },
    ]

    const activitiesData = [
      {
        type: "activity",
        title: "Crear contenido para Instagram",
        description: "Diseñar 20 posts para Instagram",
        owner_email: "diseñador@empresa.com",
        department: "Marketing",
        status: "no_iniciado",
        progress: 0,
        start_date: "2024-02-15",
        end_date: "2024-03-15",
        parent_title: "Campaña de marketing digital",
      },
    ]

    // Create worksheets
    const objectivesWS = XLSX.utils.json_to_sheet(objectivesData)
    const initiativesWS = XLSX.utils.json_to_sheet(initiativesData)
    const activitiesWS = XLSX.utils.json_to_sheet(activitiesData)

    XLSX.utils.book_append_sheet(wb, objectivesWS, "Objetivos")
    XLSX.utils.book_append_sheet(wb, initiativesWS, "Iniciativas")
    XLSX.utils.book_append_sheet(wb, activitiesWS, "Actividades")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    return new Blob([wbout], { type: "application/octet-stream" })
  }

  static generateCSVTemplate(): Blob {
    const headers = [
      "type",
      "title",
      "description",
      "owner_email",
      "department",
      "status",
      "progress",
      "start_date",
      "end_date",
      "parent_title",
    ]

    const sampleData = [
      [
        "objective",
        "Aumentar ventas en 20%",
        "Incrementar las ventas del producto principal",
        "gerente@empresa.com",
        "Ventas",
        "en_progreso",
        "45",
        "2024-01-01",
        "2024-12-31",
        "",
      ],
      [
        "initiative",
        "Campaña de marketing digital",
        "Implementar estrategia de redes sociales",
        "marketing@empresa.com",
        "Marketing",
        "en_progreso",
        "60",
        "2024-02-01",
        "2024-06-30",
        "Aumentar ventas en 20%",
      ],
    ]

    const csvContent = [headers, ...sampleData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    return new Blob([csvContent], { type: "text/csv" })
  }
}