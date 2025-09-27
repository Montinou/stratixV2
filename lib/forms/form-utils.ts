import { z } from "zod"
import { FormContext, Industry, CompanyType, BusinessModel } from "@/lib/types/smart-forms"

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[\d\s\(\)\-]{10,}$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/,
} as const

// Field enhancement helpers
export function sanitizeInput(value: string, type: "text" | "email" | "phone" | "url" = "text"): string {
  let sanitized = value.trim()

  switch (type) {
    case "email":
      sanitized = sanitized.toLowerCase()
      break
    case "phone":
      sanitized = sanitized.replace(/[^\d\+\-\(\)\s]/g, "")
      break
    case "url":
      if (sanitized && !sanitized.startsWith("http")) {
        sanitized = `https://${sanitized}`
      }
      break
  }

  return sanitized
}

// Auto-complete and suggestion helpers
export function getFieldSuggestions(
  fieldName: string,
  value: string,
  context: FormContext
): string[] {
  const suggestions: string[] = []

  switch (fieldName) {
    case "department":
      if (context.departments) {
        suggestions.push(
          ...context.departments
            .filter(dept => dept.name.toLowerCase().includes(value.toLowerCase()))
            .map(dept => dept.name)
        )
      }
      break

    case "industry":
      // Common industries
      const industries = [
        "Tecnología",
        "Finanzas",
        "Salud",
        "Educación",
        "Retail",
        "Manufactura",
        "Servicios",
        "Consultoría",
        "Marketing",
        "Inmobiliario"
      ]
      suggestions.push(
        ...industries.filter(industry =>
          industry.toLowerCase().includes(value.toLowerCase())
        )
      )
      break

    case "role":
    case "position":
      const roles = [
        "Gerente General",
        "Director de Ventas",
        "Coordinador de Marketing",
        "Analista de Datos",
        "Desarrollador",
        "Diseñador UX/UI",
        "Especialista en Recursos Humanos",
        "Contador",
        "Asistente Administrativo"
      ]
      suggestions.push(
        ...roles.filter(role =>
          role.toLowerCase().includes(value.toLowerCase())
        )
      )
      break
  }

  return suggestions.slice(0, 5) // Limit to top 5 suggestions
}

// Form validation helpers
export function createDynamicSchema(fields: Array<{
  name: string
  type: "string" | "number" | "email" | "url" | "phone"
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
}>) {
  const schemaObject: Record<string, z.ZodTypeAny> = {}

  fields.forEach(field => {
    let schema: z.ZodTypeAny

    switch (field.type) {
      case "email":
        schema = z.string().email("Email inválido")
        break

      case "url":
        schema = z.string().url("URL inválida")
        break

      case "phone":
        schema = z.string().regex(validationPatterns.phone, "Teléfono inválido")
        break

      case "number":
        schema = z.number()
        if (field.min !== undefined) {
          schema = schema.min(field.min, `Mínimo ${field.min}`)
        }
        if (field.max !== undefined) {
          schema = schema.max(field.max, `Máximo ${field.max}`)
        }
        break

      default:
        schema = z.string()
        if (field.min !== undefined) {
          schema = schema.min(field.min, `Mínimo ${field.min} caracteres`)
        }
        if (field.max !== undefined) {
          schema = schema.max(field.max, `Máximo ${field.max} caracteres`)
        }
        if (field.pattern) {
          schema = schema.regex(field.pattern, "Formato inválido")
        }
    }

    if (!field.required) {
      schema = schema.optional()
    }

    schemaObject[field.name] = schema
  })

  return z.object(schemaObject)
}

// Progress tracking helpers
export function calculateFormProgress(
  values: Record<string, any>,
  requiredFields: string[]
): number {
  const filledRequired = requiredFields.filter(field => {
    const value = values[field]
    return value !== undefined && value !== null && value !== ""
  }).length

  return Math.round((filledRequired / requiredFields.length) * 100)
}

// Context-aware field validation
export function validateFieldInContext(
  fieldName: string,
  value: any,
  context: FormContext
): { isValid: boolean; message?: string } {
  switch (fieldName) {
    case "companyName":
      if (typeof value !== "string" || value.length < 2) {
        return { isValid: false, message: "El nombre debe tener al menos 2 caracteres" }
      }
      break

    case "department":
      if (context.departments) {
        const exists = context.departments.some(dept => dept.name === value)
        if (!exists && value && value.length > 0) {
          return {
            isValid: true,
            message: "Nuevo departamento - se creará automáticamente"
          }
        }
      }
      break

    case "endDate":
      if (values.startDate && value) {
        const start = new Date(values.startDate)
        const end = new Date(value)
        if (end <= start) {
          return {
            isValid: false,
            message: "La fecha de fin debe ser posterior a la de inicio"
          }
        }
      }
      break
  }

  return { isValid: true }
}

// Data transformation helpers
export function transformFormData(
  values: Record<string, any>,
  transformations: Record<string, (value: any) => any>
): Record<string, any> {
  const transformed = { ...values }

  Object.keys(transformations).forEach(key => {
    if (transformed[key] !== undefined) {
      transformed[key] = transformations[key](transformed[key])
    }
  })

  return transformed
}

// Mock data for development
export const mockIndustries: Industry[] = [
  {
    id: "technology",
    name: "Tecnología",
    description: "Desarrollo de software, hardware, telecomunicaciones",
    subcategories: ["Software", "Hardware", "Telecomunicaciones", "IA/ML", "Ciberseguridad"],
    commonRoles: ["Desarrollador", "Product Manager", "DevOps", "QA Engineer"],
    suggestedOKRs: [
      "Aumentar la eficiencia del desarrollo en 30%",
      "Reducir el tiempo de despliegue a menos de 1 hora",
      "Mejorar la satisfacción del cliente a 4.5/5"
    ]
  },
  {
    id: "finance",
    name: "Finanzas",
    description: "Servicios financieros, banca, seguros, inversiones",
    subcategories: ["Banca", "Seguros", "Inversiones", "Fintech", "Contabilidad"],
    commonRoles: ["Analista Financiero", "Contador", "Asesor de Inversiones", "Risk Manager"],
    suggestedOKRs: [
      "Reducir costos operativos en 15%",
      "Aumentar la satisfacción del cliente a 90%",
      "Mejorar el ROI de inversiones en 20%"
    ]
  },
  {
    id: "healthcare",
    name: "Salud",
    description: "Servicios médicos, farmacéutica, biotecnología",
    subcategories: ["Hospitales", "Farmacéutica", "Biotecnología", "Telemedicina", "Dispositivos"],
    commonRoles: ["Médico", "Enfermero", "Investigador", "Administrador de Salud"],
    suggestedOKRs: [
      "Reducir tiempo de espera a menos de 30 minutos",
      "Mejorar la satisfacción del paciente a 95%",
      "Aumentar la eficiencia operativa en 25%"
    ]
  }
]

export const mockCompanyTypes: CompanyType[] = [
  {
    id: "startup",
    name: "Startup",
    description: "Empresa emergente en crecimiento acelerado",
    size: "startup",
    characteristics: ["Ágil", "Innovadora", "Crecimiento rápido", "Flexibilidad"],
    suggestedStructure: [
      {
        id: "leadership",
        name: "Liderazgo",
        level: 0,
        roles: ["CEO", "CTO", "Fundadores"],
        suggestedMetrics: ["Crecimiento de ingresos", "Satisfacción del equipo"]
      },
      {
        id: "product",
        name: "Producto",
        level: 1,
        roles: ["Product Manager", "Desarrolladores", "Diseñadores"],
        suggestedMetrics: ["Velocidad de desarrollo", "Calidad del producto"]
      }
    ]
  },
  {
    id: "enterprise",
    name: "Empresa Grande",
    description: "Organización establecida con múltiples departamentos",
    size: "enterprise",
    characteristics: ["Estructurada", "Procesos definidos", "Múltiples ubicaciones"],
    suggestedStructure: [
      {
        id: "executive",
        name: "Directivo",
        level: 0,
        roles: ["CEO", "CFO", "COO", "Directores"],
        suggestedMetrics: ["ROI", "Crecimiento de mercado", "Satisfacción de stakeholders"]
      },
      {
        id: "sales",
        name: "Ventas",
        level: 1,
        roles: ["Director de Ventas", "Account Managers", "SDRs"],
        suggestedMetrics: ["Ingresos", "Conversión", "Retención de clientes"]
      },
      {
        id: "operations",
        name: "Operaciones",
        level: 1,
        roles: ["Director de Operaciones", "Managers", "Analistas"],
        suggestedMetrics: ["Eficiencia operativa", "Costos", "Calidad"]
      }
    ]
  }
]

export const mockBusinessModels: BusinessModel[] = [
  {
    id: "saas",
    name: "Software como Servicio (SaaS)",
    description: "Modelo de suscripción para software en la nube",
    revenueStreams: ["Suscripciones mensuales", "Suscripciones anuales", "Upselling"],
    keyMetrics: ["MRR", "Churn Rate", "LTV", "CAC", "NPS"],
    suggestedOKRs: [
      "Reducir el churn rate a menos del 5%",
      "Aumentar el MRR en 50%",
      "Mejorar el NPS a más de 50"
    ]
  },
  {
    id: "ecommerce",
    name: "Comercio Electrónico",
    description: "Venta de productos o servicios en línea",
    revenueStreams: ["Venta directa", "Comisiones", "Publicidad"],
    keyMetrics: ["Conversión", "AOV", "ROAS", "Retention Rate"],
    suggestedOKRs: [
      "Aumentar la conversión a 3.5%",
      "Incrementar el AOV en 25%",
      "Mejorar el ROAS a 4:1"
    ]
  },
  {
    id: "consulting",
    name: "Consultoría",
    description: "Servicios profesionales y asesoramiento",
    revenueStreams: ["Horas facturables", "Proyectos fijos", "Retainer"],
    keyMetrics: ["Utilización", "Rate per hour", "Client satisfaction"],
    suggestedOKRs: [
      "Aumentar la utilización a 80%",
      "Incrementar la tarifa por hora en 20%",
      "Mantener satisfacción del cliente >90%"
    ]
  }
]