import { z } from "zod"

// Base validation schema for common fields
const baseImportSchema = {
  title: z.string()
    .min(1, "El título es obligatorio")
    .max(255, "El título no puede exceder 255 caracteres")
    .trim(),
  
  description: z.string()
    .max(1000, "La descripción no puede exceder 1000 caracteres")
    .trim()
    .optional()
    .default(""),
  
  owner_email: z.string()
    .email("El email del responsable debe ser válido")
    .max(255, "El email no puede exceder 255 caracteres")
    .toLowerCase()
    .trim(),
  
  department: z.string()
    .max(100, "El departamento no puede exceder 100 caracteres")
    .trim()
    .optional()
    .default(""),
  
  status: z.enum(["no_iniciado", "en_progreso", "completado", "pausado"], {
    errorMap: () => ({ message: "El estado debe ser: no_iniciado, en_progreso, completado o pausado" })
  }),
  
  progress: z.number()
    .min(0, "El progreso debe ser mayor o igual a 0")
    .max(100, "El progreso no puede ser mayor a 100")
    .int("El progreso debe ser un número entero"),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de inicio debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de inicio debe ser una fecha válida"),
  
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de fin debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de fin debe ser una fecha válida"),
  
  parent_title: z.string()
    .max(255, "El título del padre no puede exceder 255 caracteres")
    .trim()
    .optional()
}

// Specific validation for objectives
export const objectiveImportSchema = z.object({
  type: z.literal("objective"),
  ...baseImportSchema,
  parent_title: z.string().optional() // Objectives can be top-level
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return startDate < endDate
}, {
  message: "La fecha de inicio debe ser anterior a la fecha de fin",
  path: ["end_date"]
})

// Specific validation for initiatives
export const initiativeImportSchema = z.object({
  type: z.literal("initiative"),
  ...baseImportSchema,
  parent_title: z.string()
    .min(1, "Las iniciativas deben tener un objetivo padre")
    .max(255, "El título del objetivo padre no puede exceder 255 caracteres")
    .trim()
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return startDate < endDate
}, {
  message: "La fecha de inicio debe ser anterior a la fecha de fin",
  path: ["end_date"]
})

// Specific validation for activities
export const activityImportSchema = z.object({
  type: z.literal("activity"),
  ...baseImportSchema,
  parent_title: z.string()
    .min(1, "Las actividades deben tener una iniciativa padre")
    .max(255, "El título de la iniciativa padre no puede exceder 255 caracteres")
    .trim()
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return startDate < endDate
}, {
  message: "La fecha de inicio debe ser anterior a la fecha de fin",
  path: ["end_date"]
})

// Union schema for all import types
export const importRecordSchema = z.discriminatedUnion("type", [
  objectiveImportSchema,
  initiativeImportSchema,
  activityImportSchema
])

// Schema for batch import validation
export const importBatchSchema = z.object({
  records: z.array(importRecordSchema)
    .min(1, "Debe haber al menos un registro para importar")
    .max(1000, "No se pueden importar más de 1000 registros a la vez"),
  
  fileName: z.string()
    .min(1, "El nombre del archivo es obligatorio")
    .max(255, "El nombre del archivo no puede exceder 255 caracteres"),
  
  fileType: z.enum(["xlsx", "csv"], {
    errorMap: () => ({ message: "El tipo de archivo debe ser xlsx o csv" })
  }),
  
  importPeriodStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de inicio del período debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de inicio del período debe ser válida")
    .optional(),
  
  importPeriodEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de fin del período debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de fin del período debe ser válida")
    .optional(),
  
  departmentMapping: z.record(z.string(), z.string()).optional()
}).refine((data) => {
  if (data.importPeriodStart && data.importPeriodEnd) {
    const startDate = new Date(data.importPeriodStart)
    const endDate = new Date(data.importPeriodEnd)
    return startDate < endDate
  }
  return true
}, {
  message: "La fecha de inicio del período debe ser anterior a la fecha de fin",
  path: ["importPeriodEnd"]
})

// Schema for file upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
      "El archivo no puede ser mayor a 10MB"
    )
    .refine(
      (file) => {
        const allowedTypes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
          "text/csv", // csv
          "application/csv" // alternative csv mime type
        ]
        return allowedTypes.includes(file.type) || file.name.match(/\.(xlsx|csv)$/i)
      },
      "Solo se permiten archivos Excel (.xlsx) o CSV (.csv)"
    ),
  
  periodStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de inicio debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de inicio debe ser válida")
    .optional(),
  
  periodEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de fin debe tener formato YYYY-MM-DD")
    .refine((date) => !isNaN(Date.parse(date)), "La fecha de fin debe ser válida")
    .optional(),
  
  departmentMapping: z.record(z.string(), z.string()).optional()
}).refine((data) => {
  if (data.periodStart && data.periodEnd) {
    const startDate = new Date(data.periodStart)
    const endDate = new Date(data.periodEnd)
    return startDate < endDate
  }
  return true
}, {
  message: "La fecha de inicio debe ser anterior a la fecha de fin",
  path: ["periodEnd"]
})

// Error detail schema for validation errors
export const validationErrorSchema = z.object({
  row: z.number().min(1, "El número de fila debe ser mayor a 0"),
  field: z.string().min(1, "El campo con error debe ser especificado"),
  message: z.string().min(1, "El mensaje de error es obligatorio"),
  value: z.any().optional(),
  code: z.string().optional()
})

// Import result schema
export const importResultSchema = z.object({
  success: z.boolean(),
  totalRecords: z.number().min(0),
  successfulRecords: z.number().min(0),
  failedRecords: z.number().min(0),
  errors: z.array(validationErrorSchema),
  importLogId: z.string().uuid().optional(),
  processingTimeMs: z.number().min(0).optional()
})

// Types exported for use in other files
export type ImportRecord = z.infer<typeof importRecordSchema>
export type ObjectiveImport = z.infer<typeof objectiveImportSchema>
export type InitiativeImport = z.infer<typeof initiativeImportSchema>
export type ActivityImport = z.infer<typeof activityImportSchema>
export type ImportBatch = z.infer<typeof importBatchSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type ValidationError = z.infer<typeof validationErrorSchema>
export type ImportResult = z.infer<typeof importResultSchema>