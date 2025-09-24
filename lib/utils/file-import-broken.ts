import * as XLSX from "xlsx"
import Papa from "papaparse"
import type { ImportTemplate, ImportResult, ImportError } from "@/lib/types/import"

// TODO: Replace Supabase queries with API calls
// This file needs manual migration to use API endpoints


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

    // Create import log
      // .from(...)
      // .insert(...)
        file_name: fileName,
        file_type: fileType,
        status: "processing",
        total_records: totalRecords,
      })
      // .select(...)
      // .single()

    // Process each record
    for (const record of data) {
      try {
        await this.createOKRRecord(record)
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

    // Update import log
    if (importLog) {
      await this.supabase
      // .from(...)
      // .update(...)
          status: errors.length === 0 ? "completed" : "failed",
          successful_records: successfulRecords,
          failed_records: totalRecords - successfulRecords,
          error_details: { errors },
        })
      // .eq(...)
    }

    return {
      success: errors.length === 0,
      totalRecords,
      successfulRecords,
      failedRecords: totalRecords - successfulRecords,
      errors,
    }
  }

  private async createOKRRecord(record: ImportTemplate): Promise<void> {
    // Find owner by email
    // // TODO: Replace Supabase query with API call