import { z } from "zod"

// Base form field types
export interface SmartFormFieldProps {
  name: string
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  aiSuggestions?: boolean
  context?: string
  department?: string
  userRole?: string
}

// AI suggestion types
export interface AISuggestion {
  text: string
  confidence: number
  type: "completion" | "improvement" | "alternative"
  explanation?: string
}

export interface SmartFieldState {
  value: string
  suggestions: AISuggestion[]
  isLoading: boolean
  showSuggestions: boolean
  hasError: boolean
  errorMessage?: string
}

// Industry and company types
export interface Industry {
  id: string
  name: string
  description?: string
  subcategories?: string[]
  commonRoles?: string[]
  suggestedOKRs?: string[]
}

export interface CompanyType {
  id: string
  name: string
  description: string
  size: "startup" | "small" | "medium" | "large" | "enterprise"
  characteristics: string[]
  suggestedStructure?: DepartmentStructure[]
}

export interface BusinessModel {
  id: string
  name: string
  description: string
  revenueStreams: string[]
  keyMetrics: string[]
  suggestedOKRs: string[]
}

// Department and organization types
export interface DepartmentStructure {
  id: string
  name: string
  description?: string
  parentId?: string
  roles: string[]
  suggestedMetrics: string[]
  level: number
}

export interface TeamMember {
  id: string
  name: string
  role: string
  departmentId: string
  permissions: string[]
}

// OKR and goals types
export interface SmartObjective {
  id?: string
  title: string
  description: string
  department: string
  keyResults: SmartKeyResult[]
  suggestedMetrics?: string[]
  aiEnhancements?: string[]
  status: "draft" | "in_progress" | "completed" | "cancelled"
  progress: number
  startDate: string
  endDate: string
}

export interface SmartKeyResult {
  id?: string
  title: string
  description?: string
  metric: string
  targetValue: number
  currentValue: number
  unit: string
  aiSuggestions?: string[]
}

// Validation schemas for smart forms
export const industrySchema = z.object({
  industryId: z.string().min(1, "Selecciona una industria"),
  subcategory: z.string().optional(),
  customIndustry: z.string().optional(),
})

export const companySchema = z.object({
  companyName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  companyType: z.string().min(1, "Selecciona el tipo de empresa"),
  size: z.enum(["startup", "small", "medium", "large", "enterprise"]),
  businessModel: z.string().min(1, "Selecciona un modelo de negocio"),
  description: z.string().optional(),
})

export const departmentSchema = z.object({
  departments: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre del departamento es requerido"),
    description: z.string().optional(),
    parentId: z.string().optional(),
    roles: z.array(z.string()).min(1, "Al menos un rol es requerido"),
    level: z.number().min(0),
  })).min(1, "Al menos un departamento es requerido"),
})

export const smartObjectiveSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  department: z.string().min(1, "Selecciona un departamento"),
  keyResults: z.array(z.object({
    title: z.string().min(5, "El título del resultado clave es requerido"),
    description: z.string().optional(),
    metric: z.string().min(1, "La métrica es requerida"),
    targetValue: z.number().positive("El valor objetivo debe ser positivo"),
    currentValue: z.number().min(0, "El valor actual no puede ser negativo"),
    unit: z.string().min(1, "La unidad es requerida"),
  })).min(1, "Al menos un resultado clave es requerido"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
})

// Form context types
export interface FormContext {
  companyId?: string
  industry?: Industry
  companyType?: CompanyType
  departments?: DepartmentStructure[]
  userRole?: string
  currentStep?: number
  totalSteps?: number
}

// Smart form hook types
export interface UseSmartFormOptions {
  aiEnabled?: boolean
  autoSave?: boolean
  validationMode?: "onChange" | "onBlur" | "onSubmit"
  context?: FormContext
}

export interface SmartFormMethods {
  getAISuggestions: (fieldName: string, value: string) => Promise<AISuggestion[]>
  enhanceField: (fieldName: string, value: string) => Promise<string>
  validateField: (fieldName: string, value: string) => Promise<boolean>
  saveProgress: () => Promise<void>
  loadProgress: () => Promise<void>
}