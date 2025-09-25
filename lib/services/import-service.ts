import { ServerFileImporter } from "@/lib/utils/server-file-import"
import { 
  importResultSchema,
  type ImportResult,
  type ImportRecord,
  type ValidationError
} from "@/lib/validations/import"
import type { ImportLog } from "@/lib/types/import"
import { createClient } from "@/lib/supabase/server"

/**
 * Import service with transaction handling and rollback functionality
 */
export class ImportService {
  private supabase = createClient()
  private importId: string | null = null
  private createdRecords: Array<{ type: string; id: string }> = []
  
  /**
   * Import data from file with full transaction support and rollback capability
   */
  async importFromFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: "xlsx" | "csv",
    userId: string,
    companyId: string,
    options?: {
      periodStart?: string
      periodEnd?: string  
      departmentMapping?: Record<string, string>
    }
  ): Promise<ImportResult & { importLogId?: string }> {
    const startTime = Date.now()
    
    try {
      // Create import log entry
      this.importId = await this.createImportLog({
        userId,
        companyId,
        fileName,
        fileType,
        status: "processing",
        importPeriodStart: options?.periodStart,
        importPeriodEnd: options?.periodEnd
      })
      
      // Parse and validate file
      const importer = new ServerFileImporter()
      const parseResult = await importer.importFromFile(fileBuffer, fileName, fileType, options)
      
      if (!parseResult.success || parseResult.errors.length > 0) {
        await this.updateImportLogStatus(this.importId, "failed", {
          totalRecords: parseResult.totalRecords,
          successfulRecords: 0,
          failedRecords: parseResult.totalRecords,
          errors: parseResult.errors
        })
        
        return {
          ...parseResult,
          importLogId: this.importId
        }
      }
      
      // Begin transaction and import data
      const processedRecords = importer.getProcessedRecords()
      const importResult = await this.processImportWithTransaction(processedRecords, companyId)
      
      // Update final status
      const finalStatus = importResult.success ? "completed" : "failed"
      await this.updateImportLogStatus(this.importId, finalStatus, {
        totalRecords: importResult.totalRecords,
        successfulRecords: importResult.successfulRecords,
        failedRecords: importResult.failedRecords,
        errors: importResult.errors
      })
      
      return {
        ...importResult,
        importLogId: this.importId,
        processingTimeMs: Date.now() - startTime
      }
      
    } catch (error) {
      // Rollback any created records on error
      await this.rollbackImport()
      
      if (this.importId) {
        await this.updateImportLogStatus(this.importId, "failed", {
          totalRecords: 0,
          successfulRecords: 0,
          failedRecords: 0,
          errors: [{
            row: 0,
            field: "system",
            message: error instanceof Error ? error.message : "Error interno del sistema",
            value: fileName
          }]
        })
      }
      
      return {
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [{
          row: 0,
          field: "system",
          message: error instanceof Error ? error.message : "Error interno del sistema",
          value: fileName
        }],
        importLogId: this.importId || undefined,
        processingTimeMs: Date.now() - startTime
      }
    }
  }
  
  /**
   * Process import with transaction handling
   */
  private async processImportWithTransaction(
    records: ImportRecord[],
    companyId: string
  ): Promise<ImportResult> {
    const errors: ValidationError[] = []
    let successfulRecords = 0
    
    try {
      // Start transaction
      const { data: transaction, error: txError } = await this.supabase.rpc('begin_transaction')
      if (txError) throw txError
      
      // Group records by type for hierarchical processing
      const objectives = records.filter(r => r.type === "objective")
      const initiatives = records.filter(r => r.type === "initiative")  
      const activities = records.filter(r => r.type === "activity")
      
      // Process objectives first
      for (const objective of objectives) {
        try {
          const result = await this.createObjective(objective, companyId)
          if (result.success) {
            successfulRecords++
            this.createdRecords.push({ type: "objective", id: result.id })
          } else {
            errors.push(...result.errors)
          }
        } catch (error) {
          errors.push({
            row: records.indexOf(objective) + 2,
            field: "database",
            message: error instanceof Error ? error.message : "Error creando objetivo",
            value: objective.title
          })
        }
      }
      
      // Process initiatives
      for (const initiative of initiatives) {
        try {
          const result = await this.createInitiative(initiative, companyId)
          if (result.success) {
            successfulRecords++
            this.createdRecords.push({ type: "initiative", id: result.id })
          } else {
            errors.push(...result.errors)
          }
        } catch (error) {
          errors.push({
            row: records.indexOf(initiative) + 2,
            field: "database", 
            message: error instanceof Error ? error.message : "Error creando iniciativa",
            value: initiative.title
          })
        }
      }
      
      // Process activities
      for (const activity of activities) {
        try {
          const result = await this.createActivity(activity, companyId)
          if (result.success) {
            successfulRecords++
            this.createdRecords.push({ type: "activity", id: result.id })
          } else {
            errors.push(...result.errors)
          }
        } catch (error) {
          errors.push({
            row: records.indexOf(activity) + 2,
            field: "database",
            message: error instanceof Error ? error.message : "Error creando actividad",
            value: activity.title
          })
        }
      }
      
      // Commit or rollback transaction based on results
      if (errors.length === 0) {
        await this.supabase.rpc('commit_transaction')
      } else {
        await this.supabase.rpc('rollback_transaction') 
        this.createdRecords = [] // Clear tracking since rollback occurred
      }
      
      return {
        success: errors.length === 0,
        totalRecords: records.length,
        successfulRecords: errors.length === 0 ? successfulRecords : 0,
        failedRecords: errors.length === 0 ? 0 : records.length,
        errors
      }
      
    } catch (error) {
      // Ensure rollback on any transaction error
      try {
        await this.supabase.rpc('rollback_transaction')
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError)
      }
      
      throw error
    }
  }
  
  /**
   * Create objective record
   */
  private async createObjective(objective: ImportRecord & { type: "objective" }, companyId: string): Promise<{ success: boolean; id: string; errors: ValidationError[] }> {
    try {
      // Find user by email
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', objective.owner_email)
        .single()
      
      if (userError || !user) {
        return {
          success: false,
          id: '',
          errors: [{
            row: 0,
            field: 'owner_email',
            message: `Usuario no encontrado: ${objective.owner_email}`,
            value: objective.owner_email
          }]
        }
      }
      
      // Create objective
      const { data, error } = await this.supabase
        .from('objectives')
        .insert({
          company_id: companyId,
          title: objective.title,
          description: objective.description,
          owner_id: user.id,
          department: objective.department,
          status: objective.status,
          progress: objective.progress,
          start_date: objective.start_date,
          end_date: objective.end_date
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      return { success: true, id: data.id, errors: [] }
      
    } catch (error) {
      return {
        success: false,
        id: '',
        errors: [{
          row: 0,
          field: 'database',
          message: error instanceof Error ? error.message : 'Error creando objetivo',
          value: objective.title
        }]
      }
    }
  }
  
  /**
   * Create initiative record
   */
  private async createInitiative(initiative: ImportRecord & { type: "initiative" }, companyId: string): Promise<{ success: boolean; id: string; errors: ValidationError[] }> {
    try {
      // Find parent objective
      const { data: parentObjective, error: parentError } = await this.supabase
        .from('objectives')
        .select('id')
        .eq('company_id', companyId)
        .eq('title', initiative.parent_title)
        .single()
      
      if (parentError || !parentObjective) {
        return {
          success: false,
          id: '',
          errors: [{
            row: 0,
            field: 'parent_title',
            message: `Objetivo padre no encontrado: ${initiative.parent_title}`,
            value: initiative.parent_title
          }]
        }
      }
      
      // Find user by email
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', initiative.owner_email)
        .single()
      
      if (userError || !user) {
        return {
          success: false,
          id: '',
          errors: [{
            row: 0,
            field: 'owner_email',
            message: `Usuario no encontrado: ${initiative.owner_email}`,
            value: initiative.owner_email
          }]
        }
      }
      
      // Create initiative
      const { data, error } = await this.supabase
        .from('initiatives')
        .insert({
          company_id: companyId,
          objective_id: parentObjective.id,
          title: initiative.title,
          description: initiative.description,
          owner_id: user.id,
          department: initiative.department,
          status: initiative.status,
          progress: initiative.progress,
          start_date: initiative.start_date,
          end_date: initiative.end_date
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      return { success: true, id: data.id, errors: [] }
      
    } catch (error) {
      return {
        success: false,
        id: '',
        errors: [{
          row: 0,
          field: 'database',
          message: error instanceof Error ? error.message : 'Error creando iniciativa',
          value: initiative.title
        }]
      }
    }
  }
  
  /**
   * Create activity record
   */
  private async createActivity(activity: ImportRecord & { type: "activity" }, companyId: string): Promise<{ success: boolean; id: string; errors: ValidationError[] }> {
    try {
      // Find parent initiative
      const { data: parentInitiative, error: parentError } = await this.supabase
        .from('initiatives')
        .select('id')
        .eq('company_id', companyId)
        .eq('title', activity.parent_title)
        .single()
      
      if (parentError || !parentInitiative) {
        return {
          success: false,
          id: '',
          errors: [{
            row: 0,
            field: 'parent_title',
            message: `Iniciativa padre no encontrada: ${activity.parent_title}`,
            value: activity.parent_title
          }]
        }
      }
      
      // Find user by email
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', activity.owner_email)
        .single()
      
      if (userError || !user) {
        return {
          success: false,
          id: '',
          errors: [{
            row: 0,
            field: 'owner_email',
            message: `Usuario no encontrado: ${activity.owner_email}`,
            value: activity.owner_email
          }]
        }
      }
      
      // Create activity
      const { data, error } = await this.supabase
        .from('activities')
        .insert({
          company_id: companyId,
          initiative_id: parentInitiative.id,
          title: activity.title,
          description: activity.description,
          owner_id: user.id,
          department: activity.department,
          status: activity.status,
          progress: activity.progress,
          start_date: activity.start_date,
          end_date: activity.end_date
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      return { success: true, id: data.id, errors: [] }
      
    } catch (error) {
      return {
        success: false,
        id: '',
        errors: [{
          row: 0,
          field: 'database',
          message: error instanceof Error ? error.message : 'Error creando actividad',
          value: activity.title
        }]
      }
    }
  }
  
  /**
   * Rollback import by deleting created records
   */
  private async rollbackImport(): Promise<void> {
    try {
      // Delete in reverse order to maintain referential integrity
      const recordsByType = this.createdRecords.reduce((acc, record) => {
        if (!acc[record.type]) acc[record.type] = []
        acc[record.type].push(record.id)
        return acc
      }, {} as Record<string, string[]>)
      
      // Delete activities first
      if (recordsByType.activity?.length > 0) {
        await this.supabase
          .from('activities')
          .delete()
          .in('id', recordsByType.activity)
      }
      
      // Delete initiatives second
      if (recordsByType.initiative?.length > 0) {
        await this.supabase
          .from('initiatives')
          .delete()
          .in('id', recordsByType.initiative)
      }
      
      // Delete objectives last
      if (recordsByType.objective?.length > 0) {
        await this.supabase
          .from('objectives')
          .delete()
          .in('id', recordsByType.objective)
      }
      
      this.createdRecords = []
      
    } catch (error) {
      console.error('Rollback failed:', error)
      // Log rollback failure but don't throw to avoid masking original error
    }
  }
  
  /**
   * Create import log entry
   */
  private async createImportLog(data: {
    userId: string
    companyId: string
    fileName: string
    fileType: "xlsx" | "csv"
    status: "processing" | "completed" | "failed"
    importPeriodStart?: string
    importPeriodEnd?: string
  }): Promise<string> {
    const { data: log, error } = await this.supabase
      .from('import_logs')
      .insert({
        company_id: data.companyId,
        user_id: data.userId,
        file_name: data.fileName,
        file_type: data.fileType,
        status: data.status,
        total_records: 0,
        successful_records: 0,
        failed_records: 0,
        error_details: null,
        import_period_start: data.importPeriodStart,
        import_period_end: data.importPeriodEnd
      })
      .select('id')
      .single()
    
    if (error) throw error
    return log.id
  }
  
  /**
   * Update import log status and results
   */
  private async updateImportLogStatus(
    logId: string,
    status: "processing" | "completed" | "failed",
    results: {
      totalRecords: number
      successfulRecords: number
      failedRecords: number
      errors: ValidationError[]
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('import_logs')
      .update({
        status,
        total_records: results.totalRecords,
        successful_records: results.successfulRecords,
        failed_records: results.failedRecords,
        error_details: results.errors.length > 0 ? results.errors : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
    
    if (error) throw error
  }
  
  /**
   * Get import history for a company
   */
  async getImportHistory(companyId: string, limit: number = 20): Promise<ImportLog[]> {
    const { data, error } = await this.supabase
      .from('import_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * Get detailed import log by ID
   */
  async getImportLog(logId: string): Promise<ImportLog | null> {
    const { data, error } = await this.supabase
      .from('import_logs')
      .select('*')
      .eq('id', logId)
      .single()
    
    if (error) throw error
    return data
  }
}