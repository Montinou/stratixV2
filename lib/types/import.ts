export interface ImportTemplate {
  type: "objective" | "initiative" | "activity"
  title: string
  description?: string
  owner_email: string
  department?: string
  status: "no_iniciado" | "en_progreso" | "completado" | "pausado"
  progress: number
  start_date: string
  end_date: string
  parent_title?: string // For initiatives/activities to link to parent
}

export interface ImportResult {
  success: boolean
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors: ImportError[]
}

export interface ImportError {
  row: number
  field: string
  message: string
  data: any
}

export interface ImportLog {
  id: string
  company_id: string
  user_id: string
  file_name: string
  file_type: "xlsx" | "csv"
  status: "processing" | "completed" | "failed"
  total_records: number
  successful_records: number
  failed_records: number
  error_details: any
  import_period_start?: string
  import_period_end?: string
  created_at: string
  updated_at: string
}
