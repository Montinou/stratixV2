import * as XLSX from "xlsx"
import Papa from "papaparse"
import type { ImportTemplate, ImportResult, ImportError } from "@/lib/types/import"

// TODO: Import functionality will be updated to use server actions
// in a future task after core CRUD operations are complete
export class FileImporter {

  async importXLSX(file: File, periodStart?: Date, periodEnd?: Date): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      const allData: ImportTemplate[] = []
      const errors: ImportError[] = []

      // Process each sheet (each sheet represents a department/area)
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) return // Skip empty sheets

        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        rows.forEach((row, rowIndex) => {
          try {
            const rowData = this.parseRowData(headers, row, sheetName)
            if (rowData) {
              // Apply period filter if specified
              if (periodStart && periodEnd) {
                const startDate = new Date(rowData.start_date)
                const endDate = new Date(rowData.end_date)

                if (startDate >= periodStart && endDate <= periodEnd) {
                  allData.push(rowData)
                }
              } else {
                allData.push(rowData)
              }
            }
          } catch (error) {
            errors.push({
              row: rowIndex + 2, // +2 because of header and 0-based index
              field: "general",
              message: error instanceof Error ? error.message : "Error parsing row",
              data: row,
            })
          }
        })
      })

      return await this.processImportData(allData, errors, file.name, "xlsx")
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
            data: null,
          },
        ],
      }
    }
  }

  async importCSV(file: File, departmentMapping?: Record<string, string>): Promise<ImportResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const allData: ImportTemplate[] = []
            const errors: ImportError[] = []

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
  }

  // Generate template files
  static generateXLSXTemplate(): Blob {
    const wb = XLSX.utils.book_new()

    // Sample data for each sheet
    const sampleData = [
      [
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
      ],
      [
        "objective",
        "Increase Sales Revenue",
        "Boost quarterly sales by 20%",
        "manager@company.com",
        "Sales",
        "en_progreso",
        50,
        "2024-01-01",
        "2024-03-31",
        "",
      ],
      [
        "initiative",
        "Launch Marketing Campaign",
        "Digital marketing initiative",
        "marketing@company.com",
        "Marketing",
        "no_iniciado",
        0,
        "2024-01-15",
        "2024-02-28",
        "Increase Sales Revenue",
      ],
      [
        "activity",
        "Create Social Media Content",
        "Develop content calendar",
        "social@company.com",
        "Marketing",
        "no_iniciado",
        0,
        "2024-01-15",
        "2024-01-31",
        "Launch Marketing Campaign",
      ],
    ]

    // Create sheets for different departments
    const departments = ["Sales", "Marketing", "Engineering", "HR"]

    departments.forEach((dept) => {
      const ws = XLSX.utils.aoa_to_sheet(sampleData)
      XLSX.utils.book_append_sheet(wb, ws, dept)
    })

    return new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  }

  static generateCSVTemplate(): Blob {
    const csvContent = `type,title,description,owner_email,department,status,progress,start_date,end_date,parent_title
objective,"Increase Sales Revenue","Boost quarterly sales by 20%",manager@company.com,Sales,en_progreso,50,2024-01-01,2024-03-31,
initiative,"Launch Marketing Campaign","Digital marketing initiative",marketing@company.com,Marketing,no_iniciado,0,2024-01-15,2024-02-28,"Increase Sales Revenue"
activity,"Create Social Media Content","Develop content calendar",social@company.com,Marketing,no_iniciado,0,2024-01-15,2024-01-31,"Launch Marketing Campaign"`

    return new Blob([csvContent], { type: "text/csv" })
  }
}
