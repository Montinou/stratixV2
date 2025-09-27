// OKR Knowledge Base for Spanish Business Context
// Comprehensive knowledge base with industry-specific guidance, best practices, and templates

export interface OKRMethodology {
  name: string
  description: string
  keyPrinciples: string[]
  suitableFor: string[]
  implementationSteps: string[]
  examples: OKRExample[]
}

export interface OKRExample {
  objective: string
  keyResults: string[]
  industry: string
  role: 'corporativo' | 'gerente' | 'empleado'
  timeframe: string
  context?: string
}

export interface IndustryGuideline {
  industry: string
  commonObjectives: string[]
  keyMetrics: string[]
  challenges: string[]
  bestPractices: string[]
  examples: OKRExample[]
}

export interface RoleGuideline {
  role: 'corporativo' | 'gerente' | 'empleado'
  responsibilities: string[]
  focusAreas: string[]
  commonObjectives: string[]
  keyMetrics: string[]
  stakeholders: string[]
}

// OKR Methodologies
export const OKR_METHODOLOGIES: OKRMethodology[] = [
  {
    name: "Metodología Google (Clásica)",
    description: "El marco original de OKRs desarrollado por Google, enfocado en la transparencia y la ambición.",
    keyPrinciples: [
      "Objetivos aspiracionales pero alcanzables",
      "Transparencia completa en la organización",
      "Revisiones trimestrales regulares",
      "Puntuación de 0.0 a 1.0 (0.7 es éxito)",
      "Máximo 5 objetivos por persona/equipo"
    ],
    suitableFor: [
      "Empresas tecnológicas",
      "Startups en crecimiento",
      "Organizaciones con cultura de transparencia",
      "Equipos de desarrollo ágil"
    ],
    implementationSteps: [
      "Definir objetivos corporativos trimestrales",
      "Cascada hacia equipos y departamentos",
      "Definición individual de OKRs",
      "Check-ins semanales de progreso",
      "Revisión y scoring trimestral"
    ],
    examples: [
      {
        objective: "Mejorar la experiencia del usuario en la plataforma",
        keyResults: [
          "Aumentar el Net Promoter Score de 6.5 a 8.0",
          "Reducir el tiempo de carga promedio a menos de 2 segundos",
          "Conseguir 90% de satisfacción en encuestas de usabilidad"
        ],
        industry: "Tecnología",
        role: "gerente",
        timeframe: "Q1 2024"
      }
    ]
  },
  {
    name: "OKRs Adaptativos (Weekdone)",
    description: "Marco flexible que permite ajustes durante el trimestre basado en cambios del mercado.",
    keyPrinciples: [
      "Flexibilidad para cambios mid-quarter",
      "Enfoque en outcomes sobre outputs",
      "Alineación continua con estrategia",
      "Métricas de leading vs lagging indicators",
      "Colaboración cross-funcional"
    ],
    suitableFor: [
      "Mercados volátiles",
      "Empresas en transformación digital",
      "Organizaciones ágiles",
      "Sectores regulados"
    ],
    implementationSteps: [
      "Análisis de contexto y mercado",
      "Definición de OKRs con checkpoints",
      "Establecimiento de métricas leading",
      "Revisiones bi-semanales",
      "Ajustes adaptativos según necesidad"
    ],
    examples: [
      {
        objective: "Expandir presencia en el mercado español",
        keyResults: [
          "Abrir 5 nuevas oficinas comerciales en ciudades clave",
          "Alcanzar 15% de market share en el segmento objetivo",
          "Generar €2M en ingresos recurrentes anuales"
        ],
        industry: "Retail",
        role: "corporativo",
        timeframe: "Q2 2024",
        context: "Expansión geográfica en mercado competitivo"
      }
    ]
  },
  {
    name: "OKRs de Alto Rendimiento (Perdoo)",
    description: "Marco enfocado en la excelencia operacional y mejora continua de procesos.",
    keyPrinciples: [
      "Métricas de rendimiento específicas",
      "Benchmarking contra competidores",
      "Optimización de procesos core",
      "ROI measurable en cada objetivo",
      "Cultura de mejora continua"
    ],
    suitableFor: [
      "Empresas manufactureras",
      "Organizaciones de servicios",
      "Operaciones logísticas",
      "Centros de servicio al cliente"
    ],
    implementationSteps: [
      "Mapeo de procesos críticos",
      "Establecimiento de baseline metrics",
      "Definición de targets de mejora",
      "Implementación de mejoras",
      "Medición continua de resultados"
    ],
    examples: [
      {
        objective: "Optimizar la eficiencia operacional de la cadena de suministro",
        keyResults: [
          "Reducir tiempo de entrega promedio de 7 a 4 días",
          "Conseguir 99.5% de cumplimiento de pedidos",
          "Disminuir costos logísticos en 15%"
        ],
        industry: "Logística",
        role: "gerente",
        timeframe: "Q3 2024"
      }
    ]
  }
]

// Industry-Specific Guidelines
export const INDUSTRY_GUIDELINES: IndustryGuideline[] = [
  {
    industry: "Tecnología y Software",
    commonObjectives: [
      "Mejorar la experiencia del usuario",
      "Acelerar el desarrollo de productos",
      "Aumentar la adopción de la plataforma",
      "Optimizar la infraestructura técnica",
      "Fortalecer la seguridad de datos"
    ],
    keyMetrics: [
      "Daily/Monthly Active Users (DAU/MAU)",
      "Net Promoter Score (NPS)",
      "Tiempo de respuesta del sistema",
      "Tasa de conversión de usuarios",
      "Índice de satisfacción del cliente (CSAT)",
      "Tiempo medio de resolución de bugs",
      "Cobertura de tests automatizados"
    ],
    challenges: [
      "Escalabilidad rápida de usuarios",
      "Mantenimiento de calidad en desarrollo ágil",
      "Competencia intensa en el mercado",
      "Cumplimiento de regulaciones de privacidad",
      "Retención de talento técnico"
    ],
    bestPractices: [
      "Usar métricas de negocio, no solo técnicas",
      "Priorizar la experiencia del usuario final",
      "Establecer SLAs claros para servicios",
      "Implementar monitoreo en tiempo real",
      "Fomentar la experimentación controlada"
    ],
    examples: [
      {
        objective: "Consolidar la plataforma como líder en el mercado SaaS español",
        keyResults: [
          "Alcanzar 50,000 usuarios activos mensuales",
          "Conseguir NPS de 8.5 o superior",
          "Reducir el churn rate mensual a menos del 2%"
        ],
        industry: "Tecnología y Software",
        role: "corporativo",
        timeframe: "Q4 2024"
      }
    ]
  },
  {
    industry: "Comercio y Retail",
    commonObjectives: [
      "Aumentar las ventas y facturación",
      "Mejorar la experiencia de compra",
      "Optimizar la gestión de inventario",
      "Expandir la presencia omnicanal",
      "Fidelizar a los clientes existentes"
    ],
    keyMetrics: [
      "Ventas netas por metro cuadrado",
      "Ticket medio por transacción",
      "Conversión de visitantes a compradores",
      "Rotación de inventario",
      "Customer Lifetime Value (CLV)",
      "Índice de satisfacción post-venta",
      "Margen bruto por categoría"
    ],
    challenges: [
      "Competencia con e-commerce global",
      "Gestión de stock y seasonalidad",
      "Presión en márgenes de beneficio",
      "Cambios en hábitos de consumo",
      "Integración de canales online/offline"
    ],
    bestPractices: [
      "Segmentar clientes por valor y comportamiento",
      "Implementar sistemas de inventory management",
      "Personalizar la experiencia de compra",
      "Usar datos para predicciones de demanda",
      "Optimizar el customer journey completo"
    ],
    examples: [
      {
        objective: "Liderar la transformación digital del retail en España",
        keyResults: [
          "Conseguir que 40% de las ventas sean online",
          "Implementar click & collect en 100% de tiendas",
          "Alcanzar 4.8 estrellas en valoraciones de clientes"
        ],
        industry: "Comercio y Retail",
        role: "corporativo",
        timeframe: "Q1 2024"
      }
    ]
  },
  {
    industry: "Servicios Financieros",
    commonObjectives: [
      "Aumentar la base de clientes activos",
      "Mejorar la rentabilidad por cliente",
      "Fortalecer la gestión de riesgos",
      "Acelerar la transformación digital",
      "Cumplir con regulaciones financieras"
    ],
    keyMetrics: [
      "Assets Under Management (AUM)",
      "Ratio de morosidad",
      "Cost-to-Income Ratio",
      "Net Interest Margin",
      "Return on Equity (ROE)",
      "Tiempo de aprobación de créditos",
      "Índice de digitalización de procesos"
    ],
    challenges: [
      "Regulación estricta y cambiante",
      "Competencia de fintechs ágiles",
      "Ciberseguridad y fraude",
      "Transformación digital legacy",
      "Expectativas de experiencia digital"
    ],
    bestPractices: [
      "Equilibrar crecimiento con gestión de riesgo",
      "Invertir en tecnología de compliance",
      "Desarrollar productos personalizados",
      "Automatizar procesos manuales",
      "Formar equipos en regulación financiera"
    ],
    examples: [
      {
        objective: "Modernizar la banca digital para competir con fintechs",
        keyResults: [
          "Lanzar app móvil con rating 4.5+ en stores",
          "Reducir tiempo de apertura de cuenta a 5 minutos",
          "Conseguir 80% de transacciones digitales"
        ],
        industry: "Servicios Financieros",
        role: "gerente",
        timeframe: "Q2 2024"
      }
    ]
  },
  {
    industry: "Salud y Farmacéutica",
    commonObjectives: [
      "Mejorar la calidad de atención al paciente",
      "Acelerar el desarrollo de tratamientos",
      "Optimizar la eficiencia operacional",
      "Cumplir con estándares regulatorios",
      "Expandir el acceso a servicios de salud"
    ],
    keyMetrics: [
      "Tiempo de espera promedio",
      "Tasa de satisfacción del paciente",
      "Ratio de readmisiones hospitalarias",
      "Tiempo de desarrollo de medicamentos",
      "Costo por paciente tratado",
      "Adherencia a protocolos clínicos",
      "Índice de seguridad del paciente"
    ],
    challenges: [
      "Regulación sanitaria compleja",
      "Costos crecientes de I+D",
      "Envejecimiento de la población",
      "Digitalización de historiales médicos",
      "Presión en costos del sistema de salud"
    ],
    bestPractices: [
      "Priorizar la seguridad del paciente siempre",
      "Usar datos para medicina personalizada",
      "Implementar telemedicina estratégicamente",
      "Colaborar con instituciones académicas",
      "Mantener estándares de calidad rigurosos"
    ],
    examples: [
      {
        objective: "Revolucionar la atención primaria con tecnología digital",
        keyResults: [
          "Implementar telemedicina en 90% de consultas rutinarias",
          "Reducir tiempo de espera a menos de 15 minutos",
          "Conseguir 95% de satisfacción en encuestas de pacientes"
        ],
        industry: "Salud y Farmacéutica",
        role: "gerente",
        timeframe: "Q3 2024"
      }
    ]
  }
]

// Role-Specific Guidelines
export const ROLE_GUIDELINES: RoleGuideline[] = [
  {
    role: "corporativo",
    responsibilities: [
      "Definir la visión y estrategia corporativa",
      "Establecer objetivos de alto nivel",
      "Asegurar alineación organizacional",
      "Gestionar stakeholders externos",
      "Supervisar performance general"
    ],
    focusAreas: [
      "Crecimiento del negocio",
      "Rentabilidad y sostenibilidad",
      "Posicionamiento competitivo",
      "Cultura organizacional",
      "Innovación estratégica"
    ],
    commonObjectives: [
      "Incrementar la cuota de mercado",
      "Mejorar la rentabilidad corporativa",
      "Fortalecer la marca en el mercado",
      "Expandir a nuevos mercados geográficos",
      "Desarrollar nuevas líneas de negocio"
    ],
    keyMetrics: [
      "Revenue Growth Rate",
      "Market Share",
      "EBITDA Margin",
      "Return on Investment (ROI)",
      "Brand Awareness",
      "Employee Engagement Score",
      "Customer Acquisition Cost (CAC)"
    ],
    stakeholders: [
      "Junta directiva",
      "Inversores y accionistas",
      "Clientes corporativos",
      "Reguladores",
      "Medios de comunicación"
    ]
  },
  {
    role: "gerente",
    responsibilities: [
      "Traducir estrategia a planes operacionales",
      "Gestionar equipos y recursos",
      "Optimizar procesos departamentales",
      "Desarrollar talento del equipo",
      "Reportar progreso a dirección"
    ],
    focusAreas: [
      "Eficiencia operacional",
      "Desarrollo del equipo",
      "Calidad del producto/servicio",
      "Satisfacción del cliente",
      "Colaboración cross-funcional"
    ],
    commonObjectives: [
      "Mejorar la productividad del equipo",
      "Aumentar la satisfacción del cliente",
      "Optimizar procesos operacionales",
      "Desarrollar capacidades del equipo",
      "Reducir costos operacionales"
    ],
    keyMetrics: [
      "Team Productivity Score",
      "Customer Satisfaction (CSAT)",
      "Process Efficiency Metrics",
      "Employee Retention Rate",
      "Project Delivery Time",
      "Budget Variance",
      "Quality Metrics"
    ],
    stakeholders: [
      "Equipo directo",
      "Otros gerentes de departamento",
      "Dirección ejecutiva",
      "Clientes internos",
      "Proveedores de servicios"
    ]
  },
  {
    role: "empleado",
    responsibilities: [
      "Ejecutar tareas específicas del rol",
      "Contribuir a objetivos del equipo",
      "Mantener calidad en entregables",
      "Colaborar efectivamente",
      "Desarrollar competencias profesionales"
    ],
    focusAreas: [
      "Calidad del trabajo individual",
      "Desarrollo de habilidades",
      "Colaboración en equipo",
      "Innovación en procesos",
      "Satisfacción en el trabajo"
    ],
    commonObjectives: [
      "Mejorar competencias técnicas",
      "Aumentar la calidad de entregables",
      "Colaborar más efectivamente",
      "Contribuir a innovación del equipo",
      "Desarrollar expertise en el dominio"
    ],
    keyMetrics: [
      "Task Completion Rate",
      "Quality Score",
      "Skill Assessment Results",
      "Peer Feedback Rating",
      "Innovation Contributions",
      "Learning Hours Completed",
      "Client/Internal Customer Satisfaction"
    ],
    stakeholders: [
      "Manager directo",
      "Compañeros de equipo",
      "Clientes internos/externos",
      "Mentores",
      "HR/Desarrollo"
    ]
  }
]

// Spanish Business Context Templates
export const SPANISH_BUSINESS_TEMPLATES = {
  startups: {
    description: "Plantillas para empresas emergentes en fase de crecimiento",
    objectives: [
      "Validar product-market fit en el mercado español",
      "Conseguir tracción inicial de usuarios",
      "Asegurar funding para siguiente ronda",
      "Construir equipo core del producto",
      "Establecer presencia de marca"
    ],
    keyResults: [
      "Conseguir 1,000 usuarios activos mensuales",
      "Alcanzar €100K ARR (Annual Recurring Revenue)",
      "Mantener churn rate mensual bajo 5%",
      "Contratar 5 desarrolladores senior",
      "Aparecer en 3 medios especializados del sector"
    ]
  },
  pymes: {
    description: "Plantillas para pequeñas y medianas empresas establecidas",
    objectives: [
      "Digitalizar procesos operacionales críticos",
      "Expandir base de clientes existente",
      "Mejorar márgenes de beneficio",
      "Fortalecer posición competitiva local",
      "Desarrollar nuevos productos/servicios"
    ],
    keyResults: [
      "Automatizar 80% de procesos administrativos",
      "Aumentar facturación en 25% año sobre año",
      "Conseguir margen bruto superior al 40%",
      "Abrir 2 nuevos puntos de venta",
      "Lanzar 3 nuevas líneas de producto"
    ]
  },
  corporaciones: {
    description: "Plantillas para grandes corporaciones y multinacionales",
    objectives: [
      "Liderar transformación digital del sector",
      "Expandir presencia en mercados internacionales",
      "Optimizar eficiencia en toda la organización",
      "Desarrollar cultura de innovación",
      "Fortalecer sostenibilidad corporativa"
    ],
    keyResults: [
      "Implementar AI/ML en 50% de procesos core",
      "Entrar en 3 nuevos mercados geográficos",
      "Reducir costos operacionales en 15%",
      "Lanzar 5 iniciativas de innovación disruptiva",
      "Conseguir certificación B-Corp o similar"
    ]
  }
}

// Common OKR Validation Criteria
export const OKR_VALIDATION_CRITERIA = {
  objectives: {
    smart: "Específico, Medible, Alcanzable, Relevante, con Tiempo definido",
    ambitious: "Suficientemente ambicioso para inspirar al equipo",
    clear: "Claro y comprensible para todos los stakeholders",
    aligned: "Alineado con estrategia y objetivos superiores",
    actionable: "Orientado a la acción y resultados"
  },
  keyResults: {
    measurable: "Métricas específicas y cuantificables",
    achievable: "Realista pero desafiante (70% de probabilidad de éxito)",
    relevant: "Directamente relacionado con el objetivo",
    timebound: "Con deadline específico dentro del periodo",
    outcome_focused: "Enfocado en resultados, no en actividades"
  }
}

// Spanish Business Terminology
export const SPANISH_BUSINESS_TERMS = {
  metrics: {
    "revenue": "facturación / ingresos",
    "profit": "beneficio / ganancia",
    "margin": "margen",
    "growth": "crecimiento",
    "churn": "abandono de clientes",
    "retention": "retención",
    "acquisition": "adquisición",
    "conversion": "conversión",
    "engagement": "compromiso / participación",
    "satisfaction": "satisfacción"
  },
  roles: {
    "CEO": "Director General / Director Ejecutivo",
    "CTO": "Director de Tecnología",
    "CMO": "Director de Marketing",
    "CFO": "Director Financiero",
    "manager": "gerente / responsable",
    "team lead": "líder de equipo",
    "specialist": "especialista",
    "coordinator": "coordinador"
  },
  departments: {
    "sales": "ventas / comercial",
    "marketing": "marketing / mercadotecnia",
    "engineering": "ingeniería / desarrollo",
    "product": "producto",
    "operations": "operaciones",
    "finance": "finanzas",
    "HR": "recursos humanos / RRHH",
    "customer success": "éxito del cliente"
  }
}

// Utility functions for knowledge base access
export class OKRKnowledgeBase {
  /**
   * Get methodology recommendations based on company context
   */
  static getRecommendedMethodology(
    companySize: 'startup' | 'pyme' | 'empresa' | 'corporacion',
    industry?: string
  ): OKRMethodology[] {
    return OKR_METHODOLOGIES.filter(methodology => {
      const sizeMapping = {
        startup: ["Empresas tecnológicas", "Startups en crecimiento"],
        pyme: ["Empresas en transformación digital", "Organizaciones ágiles"],
        empresa: ["Organizaciones de servicios", "Sectores regulados"],
        corporacion: ["Empresas manufactureras", "Grandes corporaciones"]
      }

      return methodology.suitableFor.some(suitable =>
        sizeMapping[companySize].some(size => suitable.includes(size))
      )
    })
  }

  /**
   * Get industry-specific guidance
   */
  static getIndustryGuidance(industry: string): IndustryGuideline | null {
    return INDUSTRY_GUIDELINES.find(guide =>
      guide.industry.toLowerCase().includes(industry.toLowerCase()) ||
      industry.toLowerCase().includes(guide.industry.toLowerCase())
    ) || null
  }

  /**
   * Get role-specific templates
   */
  static getRoleGuidance(role: 'corporativo' | 'gerente' | 'empleado'): RoleGuideline {
    return ROLE_GUIDELINES.find(guide => guide.role === role)!
  }

  /**
   * Get examples for specific context
   */
  static getContextualExamples(
    industry?: string,
    role?: 'corporativo' | 'gerente' | 'empleado',
    companySize?: 'startup' | 'pyme' | 'empresa' | 'corporacion'
  ): OKRExample[] {
    const allExamples = [
      ...OKR_METHODOLOGIES.flatMap(m => m.examples),
      ...INDUSTRY_GUIDELINES.flatMap(g => g.examples)
    ]

    return allExamples.filter(example => {
      if (industry && !example.industry.toLowerCase().includes(industry.toLowerCase())) {
        return false
      }
      if (role && example.role !== role) {
        return false
      }
      return true
    })
  }

  /**
   * Validate OKR quality
   */
  static validateOKR(objective: string, keyResults: string[]): {
    score: number
    feedback: string[]
    suggestions: string[]
  } {
    const feedback: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Validate objective
    if (objective.length < 10) {
      feedback.push("El objetivo es demasiado corto y poco específico")
      suggestions.push("Expande el objetivo para que sea más descriptivo")
    } else {
      score += 20
    }

    if (!objective.toLowerCase().includes('mejorar') &&
        !objective.toLowerCase().includes('aumentar') &&
        !objective.toLowerCase().includes('conseguir') &&
        !objective.toLowerCase().includes('desarrollar')) {
      feedback.push("El objetivo debería usar verbos de acción claros")
      suggestions.push("Usa verbos como 'mejorar', 'aumentar', 'conseguir', 'desarrollar'")
    } else {
      score += 20
    }

    // Validate key results
    if (keyResults.length < 2) {
      feedback.push("Se recomiendan al menos 2-3 resultados clave por objetivo")
      suggestions.push("Añade más resultados clave medibles")
    } else if (keyResults.length > 5) {
      feedback.push("Demasiados resultados clave pueden dispersar el foco")
      suggestions.push("Considera reducir a 3-4 resultados clave más importantes")
    } else {
      score += 20
    }

    // Check if key results are measurable
    const measurableResults = keyResults.filter(kr =>
      /\d+/.test(kr) || kr.includes('%') || kr.includes('€') || kr.includes('$')
    )

    if (measurableResults.length === 0) {
      feedback.push("Los resultados clave deben ser medibles con métricas específicas")
      suggestions.push("Incluye números, porcentajes o métricas concretas en cada resultado clave")
    } else if (measurableResults.length === keyResults.length) {
      score += 40
    } else {
      score += 20
      feedback.push("Algunos resultados clave no son claramente medibles")
      suggestions.push("Asegúrate de que todos los resultados clave tengan métricas específicas")
    }

    return { score, feedback, suggestions }
  }

  /**
   * Generate context-aware suggestions
   */
  static generateSuggestions(
    context: {
      industry?: string
      role?: 'corporativo' | 'gerente' | 'empleado'
      companySize?: 'startup' | 'pyme' | 'empresa' | 'corporacion'
      currentObjective?: string
    }
  ): {
    objectives: string[]
    keyResults: string[]
    metrics: string[]
  } {
    const { industry, role, companySize, currentObjective } = context

    // Get contextual templates
    const industryGuide = industry ? this.getIndustryGuidance(industry) : null
    const roleGuide = role ? this.getRoleGuidance(role) : null
    const sizeTemplates = companySize ? SPANISH_BUSINESS_TEMPLATES[companySize] : null

    const suggestions = {
      objectives: [] as string[],
      keyResults: [] as string[],
      metrics: [] as string[]
    }

    // Suggest objectives
    if (roleGuide) {
      suggestions.objectives.push(...roleGuide.commonObjectives.slice(0, 3))
    }
    if (industryGuide) {
      suggestions.objectives.push(...industryGuide.commonObjectives.slice(0, 3))
    }
    if (sizeTemplates) {
      suggestions.objectives.push(...sizeTemplates.objectives.slice(0, 2))
    }

    // Suggest key results based on current objective
    if (currentObjective) {
      const objectiveLower = currentObjective.toLowerCase()
      if (objectiveLower.includes('usuario') || objectiveLower.includes('cliente')) {
        suggestions.keyResults.push(
          "Aumentar la satisfacción del cliente a 4.5/5",
          "Reducir el tiempo de respuesta a menos de 24 horas",
          "Conseguir 90% de retención de clientes"
        )
      }
      if (objectiveLower.includes('venta') || objectiveLower.includes('ingreso')) {
        suggestions.keyResults.push(
          "Incrementar facturación en 25% respecto al periodo anterior",
          "Conseguir 100 nuevos clientes de alta calidad",
          "Aumentar el ticket medio en 15%"
        )
      }
    }

    // Suggest relevant metrics
    if (industryGuide) {
      suggestions.metrics.push(...industryGuide.keyMetrics.slice(0, 5))
    }
    if (roleGuide) {
      suggestions.metrics.push(...roleGuide.keyMetrics.slice(0, 3))
    }

    // Remove duplicates and return
    return {
      objectives: [...new Set(suggestions.objectives)],
      keyResults: [...new Set(suggestions.keyResults)],
      metrics: [...new Set(suggestions.metrics)]
    }
  }
}