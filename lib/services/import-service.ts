import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import db from '@/db';
import { sql } from 'drizzle-orm';

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

export interface ImportLog {
  id: string;
  companyId: string;
  userId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  status: 'processing' | 'completed' | 'failed';
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errorDetails: any;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportType = 'objectives' | 'initiatives' | 'activities' | 'users';

interface BaseImportData {
  [key: string]: any;
}

interface ObjectiveImportData extends BaseImportData {
  titulo: string;
  descripcion?: string;
  departamento?: string;
  fecha_inicio: string;
  fecha_fin: string;
  responsable_email?: string;
  estado?: string;
  progreso?: number;
}

interface InitiativeImportData extends BaseImportData {
  titulo: string;
  descripcion?: string;
  objetivo_titulo?: string;
  objetivo_id?: string;
  presupuesto?: number;
  responsable_email?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  progreso?: number;
}

interface ActivityImportData extends BaseImportData {
  titulo: string;
  descripcion?: string;
  iniciativa_titulo?: string;
  iniciativa_id?: string;
  responsable_email?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  progreso?: number;
}

interface UserImportData extends BaseImportData {
  nombre_completo: string;
  email: string;
  departamento?: string;
  rol: 'corporativo' | 'gerente' | 'empleado';
  manager_email?: string;
}

export class ImportService {
  /**
   * Parse CSV file content
   */
  static parseCSV<T = any>(content: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
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
    const data = XLSX.utils.sheet_to_json<T>(worksheet, {
      raw: false,
      dateNF: 'dd/mm/yyyy'
    });
    return data;
  }

  /**
   * Create import log entry
   */
  static async createImportLog(
    userId: string,
    companyId: string,
    fileName: string,
    fileType: 'csv' | 'xlsx',
    totalRecords: number
  ): Promise<string> {
    const result = await db.execute(sql`
      INSERT INTO import_logs (
        user_id,
        company_id,
        file_name,
        file_type,
        status,
        total_records,
        successful_records,
        failed_records
      ) VALUES (
        ${userId},
        ${companyId},
        ${fileName},
        ${fileType},
        'processing',
        ${totalRecords},
        0,
        0
      )
      RETURNING id
    `);

    return (result.rows[0] as any).id;
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
    await db.execute(sql`
      UPDATE import_logs
      SET
        status = ${status},
        successful_records = ${successfulRecords},
        failed_records = ${failedRecords},
        error_details = ${JSON.stringify(errorDetails || {})},
        updated_at = NOW()
      WHERE id = ${logId}
    `);
  }

  /**
   * Get user's role and company
   */
  static async getUserPermissions(userId: string) {
    const result = await db.execute(sql`
      SELECT role, company_id
      FROM profiles
      WHERE id = ${userId}
    `);

    return result.rows[0] || null;
  }

  /**
   * Import objectives
   */
  static async importObjectives(
    data: ObjectiveImportData[],
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
      const rowNumber = i + 2; // +2 because Excel/CSV starts at 1 and has header

      try {
        // Validate required fields
        if (!row.titulo || !row.fecha_inicio || !row.fecha_fin) {
          throw new Error('Campos requeridos faltantes: titulo, fecha_inicio, fecha_fin');
        }

        // Role-based restrictions removed - using area-based permissions instead

        // Find owner by email if provided
        let ownerId = userId;
        if (row.responsable_email) {
          const owner = await db.execute(sql`
            SELECT id FROM profiles
            WHERE email = ${row.responsable_email}
            AND company_id = ${companyId}
          `);
          if (owner.rows[0]) {
            ownerId = (owner.rows[0] as any).id;
          }
        }

        // Parse dates
        const startDate = parseDate(row.fecha_inicio);
        const endDate = parseDate(row.fecha_fin);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/YYYY');
        }

        // Insert objective (area_id should come from row data)
        await db.execute(sql`
          INSERT INTO objectives (
            title,
            description,
            owner_id,
            status,
            progress,
            start_date,
            end_date,
            company_id
          ) VALUES (
            ${row.titulo},
            ${row.descripcion || null},
            ${ownerId},
            ${row.estado || 'no_iniciado'},
            ${row.progreso || 0},
            ${startDate.toISOString()},
            ${endDate.toISOString()},
            ${companyId}
          )
        `);

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
    data: InitiativeImportData[],
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
        // Validate required fields
        if (!row.titulo || !row.fecha_inicio || !row.fecha_fin) {
          throw new Error('Campos requeridos faltantes: titulo, fecha_inicio, fecha_fin');
        }

        // Find objective
        let objectiveId = row.objetivo_id;
        if (!objectiveId && row.objetivo_titulo) {
          const objective = await db.execute(sql`
            SELECT id FROM objectives
            WHERE title = ${row.objetivo_titulo}
            AND company_id = ${companyId}
          `);
          if (!objective.rows[0]) {
            throw new Error(`Objetivo no encontrado: ${row.objetivo_titulo}`);
          }
          const objData = objective.rows[0] as any;
          objectiveId = objData.id;
        }

        if (!objectiveId) {
          throw new Error('Debe especificar objetivo_id o objetivo_titulo');
        }

        // Find owner by email if provided
        let ownerId = userId;
        if (row.responsable_email) {
          const owner = await db.execute(sql`
            SELECT id FROM profiles
            WHERE email = ${row.responsable_email}
            AND company_id = ${companyId}
          `);
          if (owner.rows[0]) {
            ownerId = (owner.rows[0] as any).id;
          }
        }

        // Parse dates
        const startDate = parseDate(row.fecha_inicio);
        const endDate = parseDate(row.fecha_fin);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/YYYY');
        }

        // Insert initiative
        await db.execute(sql`
          INSERT INTO initiatives (
            title,
            description,
            objective_id,
            owner_id,
            status,
            progress,
            start_date,
            end_date,
            company_id
          ) VALUES (
            ${row.titulo},
            ${row.descripcion || null},
            ${objectiveId},
            ${ownerId},
            ${row.estado || 'no_iniciado'},
            ${row.progreso || 0},
            ${startDate.toISOString()},
            ${endDate.toISOString()},
            ${companyId}
          )
        `);

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
    data: ActivityImportData[],
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
        // Validate required fields
        if (!row.titulo || !row.fecha_inicio || !row.fecha_fin) {
          throw new Error('Campos requeridos faltantes: titulo, fecha_inicio, fecha_fin');
        }

        // Find initiative
        let initiativeId = row.iniciativa_id;
        if (!initiativeId && row.iniciativa_titulo) {
          const initiative = await db.execute(sql`
            SELECT i.id
            FROM initiatives i
            WHERE i.title = ${row.iniciativa_titulo}
            AND i.company_id = ${companyId}
          `);
          if (!initiative.rows[0]) {
            throw new Error(`Iniciativa no encontrada: ${row.iniciativa_titulo}`);
          }
          const initData = initiative.rows[0] as any;
          initiativeId = initData.id;
        }

        if (!initiativeId) {
          throw new Error('Debe especificar iniciativa_id o iniciativa_titulo');
        }

        // Find owner by email if provided
        let ownerId = userId;
        if (row.responsable_email) {
          const owner = await db.execute(sql`
            SELECT id FROM profiles
            WHERE email = ${row.responsable_email}
            AND company_id = ${companyId}
          `);
          if (owner.rows[0]) {
            ownerId = (owner.rows[0] as any).id;
          }
        }

        // Parse dates
        const startDate = parseDate(row.fecha_inicio);
        const endDate = parseDate(row.fecha_fin);

        if (!startDate || !endDate) {
          throw new Error('Formato de fecha inválido. Use DD/MM/YYYY');
        }

        // Insert activity
        await db.execute(sql`
          INSERT INTO activities (
            title,
            description,
            initiative_id,
            owner_id,
            status,
            progress,
            start_date,
            end_date,
            company_id
          ) VALUES (
            ${row.titulo},
            ${row.descripcion || null},
            ${initiativeId},
            ${ownerId},
            ${row.estado || 'no_iniciado'},
            ${row.progreso || 0},
            ${startDate.toISOString()},
            ${endDate.toISOString()},
            ${companyId}
          )
        `);

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
    data: UserImportData[],
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
        // Validate required fields
        if (!row.nombre_completo || !row.email || !row.rol) {
          throw new Error('Campos requeridos faltantes: nombre_completo, email, rol');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          throw new Error('Formato de email inválido');
        }

        // Check if user already exists
        const existingUser = await db.execute(sql`
          SELECT id FROM profiles
          WHERE email = ${row.email}
        `);

        if (existingUser.rows[0]) {
          throw new Error(`Usuario ya existe con email: ${row.email}`);
        }

        // Find manager if specified
        let managerId = null;
        if (row.manager_email) {
          const manager = await db.execute(sql`
            SELECT id FROM profiles
            WHERE email = ${row.manager_email}
            AND company_id = ${companyId}
          `);
          if (manager.rows[0]) {
            managerId = (manager.rows[0] as any).id;
          }
        }

        // Note: In a real implementation, you would need to create the user in Stack Auth first
        // For now, we'll just create the profile entry
        // The actual user creation should be handled through Stack Auth API

        // This is a placeholder - actual implementation would integrate with Stack Auth
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
    const result = await db.execute(sql`
      SELECT
        il.*,
        p.full_name as uploaded_by_name
      FROM import_logs il
      JOIN profiles p ON il.user_id = p.id
      WHERE il.company_id = ${companyId}
      ORDER BY il.created_at DESC
      LIMIT ${limit}
    `);

    return result.rows;
  }
}

/**
 * Helper function to parse date in DD/MM/YYYY format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try to parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Try to parse as ISO date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}