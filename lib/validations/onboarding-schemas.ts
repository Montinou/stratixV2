import { z } from "zod";

// Welcome step schema
export const welcomeSchema = z.object({
  role: z.string().min(1, "Por favor selecciona tu rol"),
  customRole: z.string().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Por favor selecciona tu nivel de experiencia"
  })
});

// Company information schema
export const companySchema = z.object({
  name: z.string()
    .min(2, "El nombre de la empresa debe tener al menos 2 caracteres")
    .max(100, "El nombre de la empresa no puede exceder 100 caracteres"),
  industry: z.string().min(1, "Por favor selecciona una industria"),
  size: z.string().min(1, "Por favor selecciona el tamaño de la empresa"),
  description: z.string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional(),
  logo: z.string().url("URL de logo inválida").optional().or(z.literal(""))
});

// Organization structure schema
export const organizationSchema = z.object({
  teamSize: z.number()
    .min(1, "El tamaño del equipo debe ser al menos 1")
    .max(10000, "El tamaño del equipo no puede exceder 10,000"),
  structure: z.enum(["hierarchical", "flat", "matrix"], {
    required_error: "Por favor selecciona una estructura organizacional"
  }),
  methodology: z.enum(["okrs", "kpis", "custom"], {
    required_error: "Por favor selecciona una metodología"
  }),
  collaborationStyle: z.enum(["centralized", "distributed", "hybrid"], {
    required_error: "Por favor selecciona un estilo de colaboración"
  }),
  integrations: z.array(z.string()).default([]),
  departments: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre del departamento es requerido"),
    description: z.string().optional(),
    parentId: z.string().optional()
  })).default([])
});

// Combined schema for all steps
export const onboardingSchema = z.object({
  welcome: welcomeSchema,
  company: companySchema,
  organization: organizationSchema
});

// Individual step types
export type WelcomeFormData = z.infer<typeof welcomeSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Predefined options for select fields
export const ROLE_OPTIONS = [
  { value: "ceo", label: "CEO / Fundador" },
  { value: "manager", label: "Manager / Gerente" },
  { value: "team_lead", label: "Team Lead / Líder de Equipo" },
  { value: "individual", label: "Colaborador Individual" },
  { value: "custom", label: "Otro (especificar)" }
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Principiante", description: "Nueva en gestión de objetivos" },
  { value: "intermediate", label: "Intermedio", description: "Algo de experiencia con OKRs/KPIs" },
  { value: "advanced", label: "Avanzado", description: "Experiencia extensa en metodologías ágiles" }
] as const;

export const COMPANY_SIZES = [
  { value: "startup", label: "Startup (1-10 empleados)" },
  { value: "small", label: "Pequeña (11-50 empleados)" },
  { value: "medium", label: "Mediana (51-200 empleados)" },
  { value: "large", label: "Grande (201-1000 empleados)" },
  { value: "enterprise", label: "Empresa (1000+ empleados)" }
] as const;

export const INDUSTRIES = [
  { value: "technology", label: "Tecnología" },
  { value: "finance", label: "Finanzas y Banca" },
  { value: "healthcare", label: "Salud y Medicina" },
  { value: "education", label: "Educación" },
  { value: "retail", label: "Retail y Comercio" },
  { value: "manufacturing", label: "Manufactura" },
  { value: "consulting", label: "Consultoría" },
  { value: "marketing", label: "Marketing y Publicidad" },
  { value: "real_estate", label: "Bienes Raíces" },
  { value: "food_beverage", label: "Alimentos y Bebidas" },
  { value: "transportation", label: "Transporte y Logística" },
  { value: "energy", label: "Energía" },
  { value: "media", label: "Media y Entretenimiento" },
  { value: "nonprofit", label: "Sin Fines de Lucro" },
  { value: "government", label: "Gobierno" },
  { value: "other", label: "Otra industria" }
] as const;

export const METHODOLOGIES = [
  {
    value: "okrs",
    label: "OKRs (Objectives & Key Results)",
    description: "Marco popular usado por Google, LinkedIn, y muchas startups"
  },
  {
    value: "kpis",
    label: "KPIs (Key Performance Indicators)",
    description: "Métricas tradicionales de rendimiento empresarial"
  },
  {
    value: "custom",
    label: "Metodología Personalizada",
    description: "Crear un sistema adaptado a las necesidades específicas"
  }
] as const;

export const COLLABORATION_STYLES = [
  {
    value: "centralized",
    label: "Centralizada",
    description: "Decisiones y objetivos definidos desde la dirección"
  },
  {
    value: "distributed",
    label: "Distribuida",
    description: "Equipos autónomos definen sus propios objetivos"
  },
  {
    value: "hybrid",
    label: "Híbrida",
    description: "Combinación de dirección estratégica y autonomía de equipos"
  }
] as const;

export const INTEGRATION_OPTIONS = [
  { value: "slack", label: "Slack", icon: "💬" },
  { value: "teams", label: "Microsoft Teams", icon: "👥" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "jira", label: "Jira", icon: "🎯" },
  { value: "asana", label: "Asana", icon: "✅" },
  { value: "trello", label: "Trello", icon: "📋" },
  { value: "notion", label: "Notion", icon: "📝" },
  { value: "github", label: "GitHub", icon: "🐙" }
] as const;