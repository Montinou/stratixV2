import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import db from '@/db';
import { sql } from 'drizzle-orm';
import { objectives, initiatives, activities, profiles } from '@/db/okr-schema';
import { importLogs } from '@/db/import-schema';
import { eq, and } from 'drizzle-orm';

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export type ImportType = 'objectives' | 'initiatives' | 'activities' | 'users';

// Field mapping from Spanish template headers to database columns
const FIELD_MAPPINGS = {
  objectives: {
    'título': 'title',
    'titulo': 'title',
    'descripción': 'description',
    'descripcion': 'description',
    'departamento': 'department',
    'fecha inicio': 'startDate',
    'fecha_inicio': 'startDate',
    'fecha fin': 'endDate',
    'fecha_fin': 'endDate',
    'email responsable': 'ownerEmail',
    'responsable_email': 'ownerEmail',
    'email_responsable': 'ownerEmail',
    'estado': 'status',
    'progreso (%)': 'progress',
    'progreso': 'progress',
  },
  initiatives: {
    'título': 'title',
    'titulo': 'title',
    'descripción': 'description',
    'descripcion': 'description',
    'título del objetivo': 'objectiveTitle',
    'objetivo_titulo': 'objectiveTitle',
    'id del objetivo': 'objectiveId',
    'objetivo_id': 'objectiveId',
    'presupuesto': 'budget',
    'fecha inicio': 'startDate',
    'fecha_inicio': 'startDate',
    'fecha fin': 'endDate',
    'fecha_fin': 'endDate',
    'email responsable': 'ownerEmail',
    'responsable_email': 'ownerEmail',
    'email_responsable': 'ownerEmail',
    'estado': 'status',
    'progreso (%)': 'progress',
    'progreso': 'progress',
  },
  activities: {
    'título': 'title',
    'titulo': 'title',
    'descripción': 'description',
    'descripcion': 'description',
    'título de la iniciativa': 'initiativeTitle',
    'iniciativa_titulo': 'initiativeTitle',
    'id de la iniciativa': 'initiativeId',
    'iniciativa_id': 'initiativeId',
    'fecha inicio': 'startDate',
    'fecha_inicio': 'startDate',
    'fecha fin': 'endDate',
    'fecha_fin': 'endDate',
    'email responsable': 'ownerEmail',
    'responsable_email': 'ownerEmail',
    'email_responsable': 'ownerEmail',
    'estado': 'status',
    'progreso (%)': 'progress',
    'progreso': 'progress',
  },
  users: {
    'nombre completo': 'fullName',
    'nombre_completo': 'fullName',
    'email': 'email',
    'departamento': 'department',
    'rol': 'role',
    'email del manager': 'managerEmail',
    'manager_email': 'managerEmail',
  },
};

// Status mapping from Spanish to database values
const STATUS_MAPPING = {
  objectives: {
    'no_iniciado': 'draft',
    'no iniciado': 'draft',
    'borrador': 'draft',
    'en_progreso': 'in_progress',
    'en progreso': 'in_progress',
    'completo': 'completed',
    'completado': 'completed',
    'cancelado': 'cancelled',
  },
  initiatives: {
    'no_iniciado': 'planning',
    'no iniciado': 'planning',
    'planificacion': 'planning',
    'planificación': 'planning',
    'en_progreso': 'in_progress',
    'en progreso': 'in_progress',
    'completo': 'completed',
    'completado': 'completed',
    'cancelado': 'cancelled',
  },
  activities: {
    'no_iniciado': 'todo',
    'no iniciado': 'todo',
    'por hacer': 'todo',
    'en_progreso': 'in_progress',
    'en progreso': 'in_progress',
    'completo': 'completed',
    'completado': 'completed',
    'cancelado': 'cancelled',
  },
};

// Role mapping from Spanish to database values
const ROLE_MAPPING = {
  'corporativo': 'corporativo',
  'gerente': 'gerente',
  'empleado': 'empleado',
  'corporate': 'corporativo',
  'manager': 'gerente',
  'employee': 'empleado',
};

export class ImportServiceV2 {
  /**
   * Parse CSV file content
   */
  static parseCSV<T = any>(content: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
        complete: (result) => {
          resolve(result.data as T[]);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Parse XLSX file content
   */
  static parseXLSX<T = any>(buffer: ArrayBuffer): T[] {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Get raw data with headers
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, {
      raw: false,
      dateNF: 'dd/mm/yyyy',
      defval: '',
    });

    // Normalize headers to lowercase
    return rawData.map(row => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase().trim()] = row[key];
      });
      return normalizedRow;
    });
  }

  /**
   * Map template fields to database fields
   */
  private static mapFields(data: any, type: ImportType): any {
    const mapping = FIELD_MAPPINGS[type];
    const mapped: any = {};

    Object.keys(data).forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      const dbField = mapping[normalizedKey];

      if (dbField) {
        let value = data[key];

        // Handle special field transformations
        if (dbField === 'status' && STATUS_MAPPING[type]) {
          const normalizedStatus = value?.toLowerCase()?.trim();
          value = STATUS_MAPPING[type][normalizedStatus] || value;
        }

        if (dbField === 'role' && ROLE_MAPPING) {
          const normalizedRole = value?.toLowerCase()?.trim();
          value = ROLE_MAPPING[normalizedRole] || value;
        }

        if (dbField === 'progress') {
          // Remove % sign and convert to number
          value = parseInt(String(value).replace('%', '').trim()) || 0;
        }

        if (dbField === 'budget') {
          // Remove currency symbols and convert to number
          value = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
        }

        mapped[dbField] = value;
      }
    });

    return mapped;
  }

  /**
   * Create import log entry
   */
  static async createImportLog(
    userId: string,
    companyId: string,
    fileName: string,
    fileType: 'csv' | 'xlsx',
    importType: ImportType,
    totalRecords: number
  ): Promise<string> {
    const [log] = await db.insert(importLogs).values({
      userId,
      companyId,
      fileName,
      fileType,
      importType,
      status: 'processing',
      totalRecords,
      successfulRecords: 0,
      failedRecords: 0,
    }).returning();

    return log.id;
  }

  /**
   * Update import log status
   */
  static async updateImportLog(
    logId: string,
    status: 'completed' | 'failed',
    successfulRecords: number,
    failedRecords: number,
    errorDetails?: any
  ): Promise<void> {
    await db.update(importLogs)
      .set({
        status,
        successfulRecords,
        failedRecords,
        errorDetails,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importLogs.id, logId));
  }

  /**
   * Get user's role and department
   */
  static async getUserPermissions(userId: string) {
    const [user] = await db.select({
      role: profiles.role,
      department: profiles.department,
      company_id: profiles.companyId,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

    return user ? {
      role: user.role,
      department: user.department,
      companyId: user.company_id,
    } : null;
  }

  /**
   * Import objectives
   */
  static async importObjectives(
    data: any[],
    userId: string,
    companyId: string,
    userRole: string,
    userDepartment?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRecords: data.length,
      successfulRecords: 0,
      failedRecords: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Map fields from template to database
        const mapped = this.mapFields(row, 'objectives');

        // Validate required fields
        if (!mapped.title || !mapped.startDate || !mapped.endDate) {
          throw new Error('Campos requeridos faltantes: título, fecha_inicio, fecha_fin');
        }

        // Role-based restrictions
        if (userRole === 'gerente' && mapped.department && mapped.department !== userDepartment) {
          throw new Error(`No tiene permisos para importar objetivos del departamento: ${mapped.department}`);
        }

        // Find owner by email if provided
        let ownerId = userId;
        if (mapped.ownerEmail) {
          const [owner] = await db.select({ id: profiles.id })
            .from(profiles)
            .where(and(
              sql`LOWER(${profiles.email}) = LOWER(${mapped.ownerEmail})`,
              eq(profiles.companyId, companyId)
            ))
            .limit(1);

          if (owner) {
            ownerId = owner.id;
          }
        }

        // Parse dates
        const startDate = parseDate(mapped.startDate);
        const endDate = parseDate(mapped.endDate);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/AAAA');
        }

        // Insert objective
        await db.insert(objectives).values({
          title: mapped.title,
          description: mapped.description || null,
          ownerId,
          department: mapped.department || userDepartment,
          status: mapped.status || 'draft',
          progress: mapped.progress || 0,
          startDate,
          endDate,
          companyId,
        });

        result.successfulRecords++;
      } catch (error: any) {
        result.failedRecords++;
        result.errors.push({
          row: rowNumber,
          message: error.message
        });
      }
    }

    result.success = result.failedRecords === 0;
    return result;
  }

  /**
   * Import initiatives
   */
  static async importInitiatives(
    data: any[],
    userId: string,
    companyId: string,
    userRole: string,
    userDepartment?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRecords: data.length,
      successfulRecords: 0,
      failedRecords: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Map fields from template to database
        const mapped = this.mapFields(row, 'initiatives');

        // Validate required fields
        if (!mapped.title || !mapped.startDate || !mapped.endDate) {
          throw new Error('Campos requeridos faltantes: título, fecha_inicio, fecha_fin');
        }

        // Find objective
        let objectiveId = mapped.objectiveId;
        if (!objectiveId && mapped.objectiveTitle) {
          const [objective] = await db.select({
            id: objectives.id,
            department: objectives.department
          })
          .from(objectives)
          .where(and(
            sql`LOWER(${objectives.title}) = LOWER(${mapped.objectiveTitle})`,
            eq(objectives.companyId, companyId)
          ))
          .limit(1);

          if (!objective) {
            throw new Error(`Objetivo no encontrado: ${mapped.objectiveTitle}`);
          }
          objectiveId = objective.id;

          // Check department permission for managers
          if (userRole === 'gerente' && objective.department !== userDepartment) {
            throw new Error(`No tiene permisos para crear iniciativas en el departamento: ${objective.department}`);
          }
        }

        if (!objectiveId) {
          throw new Error('Debe especificar objetivo_id o objetivo_titulo');
        }

        // Find owner by email if provided
        let ownerId = userId;
        if (mapped.ownerEmail) {
          const [owner] = await db.select({ id: profiles.id })
            .from(profiles)
            .where(and(
              sql`LOWER(${profiles.email}) = LOWER(${mapped.ownerEmail})`,
              eq(profiles.companyId, companyId)
            ))
            .limit(1);

          if (owner) {
            ownerId = owner.id;
          }
        }

        // Parse dates
        const startDate = parseDate(mapped.startDate);
        const endDate = parseDate(mapped.endDate);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/AAAA');
        }

        // Insert initiative
        await db.insert(initiatives).values({
          title: mapped.title,
          description: mapped.description || null,
          objectiveId,
          ownerId,
          status: mapped.status || 'planning',
          progress: mapped.progress || 0,
          startDate,
          endDate,
          companyId,
        });

        result.successfulRecords++;
      } catch (error: any) {
        result.failedRecords++;
        result.errors.push({
          row: rowNumber,
          message: error.message
        });
      }
    }

    result.success = result.failedRecords === 0;
    return result;
  }

  /**
   * Import activities
   */
  static async importActivities(
    data: any[],
    userId: string,
    companyId: string,
    userRole: string,
    userDepartment?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRecords: data.length,
      successfulRecords: 0,
      failedRecords: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Map fields from template to database
        const mapped = this.mapFields(row, 'activities');

        // Validate required fields
        if (!mapped.title || !mapped.startDate || !mapped.endDate) {
          throw new Error('Campos requeridos faltantes: título, fecha_inicio, fecha_fin');
        }

        // Find initiative
        let initiativeId = mapped.initiativeId;
        if (!initiativeId && mapped.initiativeTitle) {
          const [initiative] = await db.select({
            initiativeId: initiatives.id,
            department: objectives.department
          })
          .from(initiatives)
          .innerJoin(objectives, eq(initiatives.objectiveId, objectives.id))
          .where(and(
            sql`LOWER(${initiatives.title}) = LOWER(${mapped.initiativeTitle})`,
            eq(initiatives.companyId, companyId)
          ))
          .limit(1);

          if (!initiative) {
            throw new Error(`Iniciativa no encontrada: ${mapped.initiativeTitle}`);
          }
          initiativeId = initiative.initiativeId;

          // Check department permission for managers
          if (userRole === 'gerente' && initiative.department !== userDepartment) {
            throw new Error(`No tiene permisos para crear actividades en el departamento: ${initiative.department}`);
          }
        }

        if (!initiativeId) {
          throw new Error('Debe especificar iniciativa_id o iniciativa_titulo');
        }

        // Find owner by email if provided
        let ownerId = userId;
        if (mapped.ownerEmail) {
          const [owner] = await db.select({ id: profiles.id })
            .from(profiles)
            .where(and(
              sql`LOWER(${profiles.email}) = LOWER(${mapped.ownerEmail})`,
              eq(profiles.companyId, companyId)
            ))
            .limit(1);

          if (owner) {
            ownerId = owner.id;
          }
        }

        // Parse dates
        const startDate = parseDate(mapped.startDate);
        const endDate = parseDate(mapped.endDate);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/AAAA');
        }

        // Insert activity
        await db.insert(activities).values({
          title: mapped.title,
          description: mapped.description || null,
          initiativeId,
          ownerId,
          status: mapped.status || 'todo',
          progress: mapped.progress || 0,
          startDate,
          endDate,
          companyId,
        });

        result.successfulRecords++;
      } catch (error: any) {
        result.failedRecords++;
        result.errors.push({
          row: rowNumber,
          message: error.message
        });
      }
    }

    result.success = result.failedRecords === 0;
    return result;
  }

  /**
   * Import users (corporativo role only)
   */
  static async importUsers(
    data: any[],
    userId: string,
    companyId: string,
    userRole: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRecords: data.length,
      successfulRecords: 0,
      failedRecords: 0,
      errors: []
    };

    // Only corporativo users can import users
    if (userRole !== 'corporativo') {
      result.success = false;
      result.failedRecords = data.length;
      result.errors.push({
        row: 0,
        message: 'Solo usuarios corporativos pueden importar usuarios'
      });
      return result;
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Map fields from template to database
        const mapped = this.mapFields(row, 'users');

        // Validate required fields
        if (!mapped.fullName || !mapped.email || !mapped.role) {
          throw new Error('Campos requeridos faltantes: nombre_completo, email, rol');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mapped.email)) {
          throw new Error('Formato de email inválido');
        }

        // Check if user already exists
        const [existingUser] = await db.select({ id: profiles.id })
          .from(profiles)
          .where(sql`LOWER(${profiles.email}) = LOWER(${mapped.email})`)
          .limit(1);

        if (existingUser) {
          throw new Error(`Usuario ya existe con email: ${mapped.email}`);
        }

        // Find manager if specified
        let managerId = null;
        if (mapped.managerEmail) {
          const [manager] = await db.select({ id: profiles.id })
            .from(profiles)
            .where(and(
              sql`LOWER(${profiles.email}) = LOWER(${mapped.managerEmail})`,
              eq(profiles.companyId, companyId)
            ))
            .limit(1);

          if (manager) {
            managerId = manager.id;
          }
        }

        // Note: In a real implementation, you would need to create the user in Stack Auth first
        // For now, we'll just return an error explaining this
        throw new Error('La importación de usuarios requiere integración con Stack Auth. Use la invitación por email.');

      } catch (error: any) {
        result.failedRecords++;
        result.errors.push({
          row: rowNumber,
          message: error.message
        });
      }
    }

    result.success = result.failedRecords === 0;
    return result;
  }

  /**
   * Get import history for a company
   */
  static async getImportHistory(companyId: string, limit: number = 10): Promise<any[]> {
    const logs = await db.select({
      id: importLogs.id,
      fileName: importLogs.fileName,
      fileType: importLogs.fileType,
      importType: importLogs.importType,
      status: importLogs.status,
      totalRecords: importLogs.totalRecords,
      successfulRecords: importLogs.successfulRecords,
      failedRecords: importLogs.failedRecords,
      errorDetails: importLogs.errorDetails,
      createdAt: importLogs.createdAt,
      updatedAt: importLogs.updatedAt,
      uploadedByName: profiles.fullName,
    })
    .from(importLogs)
    .innerJoin(profiles, eq(importLogs.userId, profiles.id))
    .where(eq(importLogs.companyId, companyId))
    .orderBy(sql`${importLogs.createdAt} DESC`)
    .limit(limit);

    return logs.map(log => ({
      ...log,
      file_name: log.fileName,
      file_type: log.fileType,
      total_records: log.totalRecords,
      successful_records: log.successfulRecords,
      failed_records: log.failedRecords,
      error_details: log.errorDetails,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
      uploaded_by_name: log.uploadedByName,
    }));
  }
}

/**
 * Helper function to parse date in DD/MM/YYYY format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove any extra whitespace
  dateStr = dateStr.trim();

  // Try to parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      // Validate that the date is valid
      if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
        return date;
      }
    }
  }

  // Try to parse as ISO date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}