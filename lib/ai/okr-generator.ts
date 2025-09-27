import { aiClient } from './gateway-client'
import { withCache, CACHE_PRESETS } from './cache-layer'
import { withRateLimit, getRateLimitConfig } from './rate-limiter'
import { randomUUID } from 'crypto'
import type {
  OKRTemplateContext,
  OKRTemplate,
  OKRGenerationRequest,
  OKRGenerationResponse,
  OKRValidationResult,
  Industry,
  CompanySize,
  KeyResult
} from '@/lib/types/ai'

// Industry-specific prompt templates for better contextual generation
const INDUSTRY_PROMPTS = {
  technology: {
    focus: 'innovación, escalabilidad, eficiencia técnica, experiencia del usuario',
    metrics: 'tiempo de desarrollo, bugs, uptime, adopción de usuarios, rendimiento',
    common_objectives: 'lanzar productos, mejorar arquitectura, optimizar procesos de desarrollo'
  },
  finance: {
    focus: 'rentabilidad, gestión de riesgos, cumplimiento normativo, eficiencia operacional',
    metrics: 'ROI, margen de beneficio, ratio de riesgo, tiempo de procesamiento, satisfacción del cliente',
    common_objectives: 'reducir costos, aumentar ingresos, mejorar compliance, optimizar procesos'
  },
  healthcare: {
    focus: 'calidad de atención, seguridad del paciente, eficiencia operacional, cumplimiento',
    metrics: 'satisfacción del paciente, tiempo de espera, tasas de error, cumplimiento normativo',
    common_objectives: 'mejorar calidad de atención, reducir tiempos, aumentar seguridad'
  },
  retail: {
    focus: 'experiencia del cliente, ventas, gestión de inventario, omnicanalidad',
    metrics: 'ventas por m², rotación de inventario, NPS, conversión, ticket promedio',
    common_objectives: 'aumentar ventas, mejorar experiencia cliente, optimizar inventario'
  },
  manufacturing: {
    focus: 'eficiencia productiva, calidad, seguridad, sostenibilidad',
    metrics: 'OEE, defectos por millón, tiempo de ciclo, accidentes laborales',
    common_objectives: 'aumentar productividad, mejorar calidad, reducir desperdicios'
  },
  education: {
    focus: 'resultados académicos, experiencia estudiantil, eficiencia administrativa',
    metrics: 'tasas de graduación, satisfacción estudiantil, tiempo de respuesta, costos',
    common_objectives: 'mejorar resultados académicos, aumentar retención, optimizar procesos'
  },
  consulting: {
    focus: 'satisfacción del cliente, eficiencia de proyectos, desarrollo de talento',
    metrics: 'CSAT, margen por proyecto, utilización, tiempo de entrega',
    common_objectives: 'aumentar satisfacción cliente, mejorar márgenes, desarrollar equipo'
  },
  marketing: {
    focus: 'generación de leads, brand awareness, ROI de campañas, conversión',
    metrics: 'CAC, LTV, CTR, tasa de conversión, engagement, brand awareness',
    common_objectives: 'aumentar leads, mejorar conversión, fortalecer marca'
  },
  sales: {
    focus: 'revenue growth, eficiencia de ventas, satisfacción del cliente',
    metrics: 'revenue, número de deals, ciclo de ventas, NPS, retention',
    common_objectives: 'aumentar ventas, reducir ciclo, mejorar retención'
  },
  hr: {
    focus: 'talent acquisition, employee engagement, desarrollo organizacional',
    metrics: 'time to hire, employee satisfaction, retention rate, training hours',
    common_objectives: 'mejorar hiring, aumentar engagement, desarrollar talento'
  },
  operations: {
    focus: 'eficiencia operacional, calidad de procesos, reducción de costos',
    metrics: 'tiempo de procesamiento, errores, costos operacionales, productividad',
    common_objectives: 'optimizar procesos, reducir costos, mejorar calidad'
  },
  general: {
    focus: 'crecimiento sostenible, eficiencia, satisfacción stakeholders',
    metrics: 'crecimiento, margen, satisfacción, tiempo de respuesta',
    common_objectives: 'crecer de manera sostenible, mejorar eficiencia, satisfacer stakeholders'
  }
}

// Fallback templates for when AI generation fails
const FALLBACK_TEMPLATES: Record<Industry, OKRTemplate> = {
  technology: {
    objective: {
      title: 'Mejorar la eficiencia del desarrollo de productos',
      description: 'Optimizar los procesos de desarrollo para acelerar la entrega de funcionalidades manteniendo la calidad',
      category: 'Desarrollo de Producto',
      timeframe: 'quarterly'
    },
    keyResults: [
      {
        title: 'Reducir el tiempo de ciclo de desarrollo',
        description: 'Disminuir el tiempo promedio desde la concepción hasta el despliegue',
        target: '25%',
        measurementType: 'percentage',
        baseline: 'Tiempo actual de ciclo',
        frequency: 'weekly'
      },
      {
        title: 'Aumentar la cobertura de tests automatizados',
        description: 'Incrementar la cobertura de pruebas para mejorar la calidad del código',
        target: '85%',
        measurementType: 'percentage',
        frequency: 'weekly'
      },
      {
        title: 'Reducir bugs en producción',
        description: 'Disminuir el número de incidencias críticas en producción',
        target: '50%',
        measurementType: 'percentage',
        frequency: 'weekly'
      }
    ],
    initiatives: [
      'Implementar CI/CD pipeline automatizado',
      'Establecer revisiones de código obligatorias',
      'Adoptar metodología de desarrollo ágil'
    ],
    metrics: ['Tiempo de ciclo de desarrollo', 'Cobertura de tests', 'Bugs en producción'],
    risks: ['Resistencia al cambio del equipo', 'Curva de aprendizaje de nuevas herramientas'],
    successCriteria: ['Entrega más rápida sin sacrificar calidad', 'Mayor satisfacción del equipo'],
    confidenceScore: 0.8,
    industryRelevance: 0.9
  },
  finance: {
    objective: {
      title: 'Optimizar la gestión de riesgos financieros',
      description: 'Mejorar los procesos de identificación, evaluación y mitigación de riesgos financieros',
      category: 'Gestión de Riesgos',
      timeframe: 'quarterly'
    },
    keyResults: [
      {
        title: 'Reducir el tiempo de evaluación de riesgos',
        description: 'Acelerar el proceso de análisis y evaluación de riesgos financieros',
        target: '30%',
        measurementType: 'percentage',
        frequency: 'monthly'
      },
      {
        title: 'Mejorar la precisión del scoring de riesgo',
        description: 'Aumentar la precisión del modelo de evaluación de riesgos',
        target: '95%',
        measurementType: 'percentage',
        frequency: 'monthly'
      },
      {
        title: 'Implementar alertas tempranas',
        description: 'Establecer sistema de alertas para identificación proactiva de riesgos',
        target: '100%',
        measurementType: 'percentage',
        frequency: 'monthly'
      }
    ],
    initiatives: [
      'Automatizar modelos de scoring de riesgo',
      'Implementar dashboard de monitoreo en tiempo real',
      'Capacitar equipo en nuevas metodologías'
    ],
    metrics: ['Tiempo de evaluación', 'Precisión del modelo', 'Alertas generadas'],
    risks: ['Cambios regulatorios', 'Calidad de datos insuficiente'],
    successCriteria: ['Reducción de pérdidas por riesgo', 'Mayor compliance regulatorio'],
    confidenceScore: 0.85,
    industryRelevance: 0.95
  },
  // Add more fallback templates for other industries
  general: {
    objective: {
      title: 'Mejorar la eficiencia operacional',
      description: 'Optimizar los procesos clave para aumentar la productividad y reducir costos',
      category: 'Operaciones',
      timeframe: 'quarterly'
    },
    keyResults: [
      {
        title: 'Reducir costos operacionales',
        description: 'Disminuir los gastos operacionales manteniendo la calidad del servicio',
        target: '15%',
        measurementType: 'percentage',
        frequency: 'monthly'
      },
      {
        title: 'Aumentar productividad del equipo',
        description: 'Incrementar la productividad promedio del equipo',
        target: '20%',
        measurementType: 'percentage',
        frequency: 'weekly'
      },
      {
        title: 'Mejorar satisfacción del cliente',
        description: 'Incrementar el índice de satisfacción del cliente',
        target: '4.5/5',
        measurementType: 'number',
        frequency: 'monthly'
      }
    ],
    initiatives: [
      'Automatizar procesos manuales repetitivos',
      'Implementar sistema de gestión de calidad',
      'Capacitar equipo en mejores prácticas'
    ],
    metrics: ['Costos operacionales', 'Productividad por empleado', 'Satisfacción del cliente'],
    risks: ['Resistencia al cambio', 'Interrupciones durante la implementación'],
    successCriteria: ['Reducción sostenible de costos', 'Mayor satisfacción del equipo y clientes'],
    confidenceScore: 0.75,
    industryRelevance: 0.8
  },
  healthcare: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  retail: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  manufacturing: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  education: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  consulting: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  marketing: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  sales: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  hr: FALLBACK_TEMPLATES?.general || {} as OKRTemplate,
  operations: FALLBACK_TEMPLATES?.general || {} as OKRTemplate
}

// Generate intelligent prompt based on context
function generateContextualPrompt(context: OKRTemplateContext, numberOfTemplates: number = 3): string {
  const industryData = INDUSTRY_PROMPTS[context.industry] || INDUSTRY_PROMPTS.general

  return `
Como experto en OKRs (Objectives and Key Results) especializado en ${context.industry}, genera ${numberOfTemplates} plantillas de OKRs completas y específicas para el siguiente contexto:

CONTEXTO EMPRESARIAL:
- Industria: ${context.industry}
- Tamaño de empresa: ${context.companySize}
- Departamento: ${context.department || 'General'}
- Rol del usuario: ${context.role || 'General'}
- Marco temporal: ${context.timeframe || 'quarterly'}
- Área de enfoque: ${context.focusArea || 'Mejora general'}
- Tamaño del equipo: ${context.teamSize || 'No especificado'}
- Etapa de la empresa: ${context.companyStage || 'No especificado'}

CONOCIMIENTO DE LA INDUSTRIA:
- Áreas de enfoque típicas: ${industryData.focus}
- Métricas relevantes: ${industryData.metrics}
- Objetivos comunes: ${industryData.common_objectives}

INSTRUCCIONES ESPECÍFICAS:
1. Cada plantilla debe incluir un objetivo SMART específico para la industria
2. Generar 3-4 Key Results cuantificables y realistas
3. Incluir 3-5 iniciativas específicas que soporten el objetivo
4. Proporcionar métricas relevantes para la industria
5. Identificar riesgos específicos del sector y su mitigación
6. Incluir criterios de éxito claros y medibles
7. Asignar puntuaciones de confianza e relevancia para la industria

FORMATO DE RESPUESTA:
Responde con un JSON válido que contenga un array "templates" con la siguiente estructura para cada plantilla:

{
  "templates": [
    {
      "objective": {
        "title": "Título específico y accionable",
        "description": "Descripción detallada del objetivo",
        "category": "Categoría relevante para ${context.industry}",
        "timeframe": "${context.timeframe || 'quarterly'}"
      },
      "keyResults": [
        {
          "title": "Título del key result",
          "description": "Descripción específica",
          "target": "Meta cuantificable (ej: 25%, 1000 unidades, $50,000)",
          "measurementType": "percentage|number|boolean|currency",
          "baseline": "Línea base actual si aplica",
          "frequency": "weekly|monthly|quarterly"
        }
      ],
      "initiatives": ["Lista de 3-5 iniciativas específicas"],
      "metrics": ["Lista de métricas clave para medir progreso"],
      "risks": ["Lista de 2-3 riesgos específicos y mitigación"],
      "successCriteria": ["Criterios claros de éxito"],
      "confidenceScore": 0.8,
      "industryRelevance": 0.9
    }
  ]
}

CONSIDERACIONES ESPECIALES:
- Los objetivos deben ser específicos para ${context.industry}
- Las métricas deben ser estándar en la industria cuando sea posible
- Los Key Results deben ser ambiciosos pero alcanzables
- Las iniciativas deben considerar el tamaño de empresa (${context.companySize})
- Incluir consideraciones específicas del rol (${context.role || 'general'})
- Los riesgos deben ser realistas para el contexto dado

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`
}

// Validate OKR template quality
function validateOKRTemplate(template: OKRTemplate): OKRValidationResult {
  const feedback = {
    objectiveQuality: 0,
    keyResultsQuality: 0,
    measurabilityScore: 0,
    timelineRealism: 0,
    industryAlignment: 0
  }

  const improvements: string[] = []
  const warnings: string[] = []

  // Validate objective quality
  if (template.objective.title.length < 10) {
    improvements.push('El título del objetivo debería ser más descriptivo')
    feedback.objectiveQuality = 0.3
  } else if (template.objective.title.length > 100) {
    warnings.push('El título del objetivo es muy largo')
    feedback.objectiveQuality = 0.7
  } else {
    feedback.objectiveQuality = 0.9
  }

  // Validate key results
  if (template.keyResults.length < 2) {
    improvements.push('Se recomiendan al menos 2-3 Key Results por objetivo')
    feedback.keyResultsQuality = 0.4
  } else if (template.keyResults.length > 5) {
    warnings.push('Demasiados Key Results pueden diluir el enfoque')
    feedback.keyResultsQuality = 0.6
  } else {
    feedback.keyResultsQuality = 0.8
  }

  // Validate measurability
  const measurableKRs = template.keyResults.filter(kr =>
    kr.target && (kr.measurementType === 'percentage' || kr.measurementType === 'number' || kr.measurementType === 'currency')
  )
  feedback.measurabilityScore = measurableKRs.length / template.keyResults.length

  if (feedback.measurabilityScore < 0.7) {
    improvements.push('Los Key Results deberían ser más específicos y medibles')
  }

  // Validate timeline realism
  if (template.objective.timeframe === 'quarterly') {
    feedback.timelineRealism = 0.9
  } else if (template.objective.timeframe === 'annual') {
    feedback.timelineRealism = 0.7
  } else {
    feedback.timelineRealism = 0.5
    improvements.push('El marco temporal debería ser quarterly o annual')
  }

  // Industry alignment based on confidence score
  feedback.industryAlignment = template.industryRelevance || 0.5

  if (feedback.industryAlignment < 0.6) {
    improvements.push('El objetivo podría ser más específico para la industria')
  }

  // Calculate overall score
  const score = Object.values(feedback).reduce((sum, val) => sum + val, 0) / Object.keys(feedback).length

  return {
    isValid: score > 0.6,
    score,
    feedback,
    improvements,
    warnings
  }
}

// Core OKR generation function
const generateOKRTemplatesBase = async (request: OKRGenerationRequest): Promise<OKRGenerationResponse> => {
  const startTime = Date.now()
  const requestId = randomUUID()

  try {
    const numberOfTemplates = Math.max(1, Math.min(request.numberOfTemplates || 3, 5)) // Limit between 1-5
    const prompt = request.customPrompt || generateContextualPrompt(request.context, numberOfTemplates)

    const text = await aiClient.generateText(prompt, {
      maxTokens: 3000,
      temperature: 0.7,
      model: 'analysis' // Use analysis model for better reasoning
    })

    // Parse the JSON response
    let parsedResponse: { templates: OKRTemplate[] }
    try {
      parsedResponse = JSON.parse(text.trim())
    } catch (parseError) {
      console.warn('Failed to parse AI response, using fallback:', parseError)
      // Use fallback template
      const fallbackTemplate = FALLBACK_TEMPLATES[request.context.industry] || FALLBACK_TEMPLATES.general
      parsedResponse = { templates: [fallbackTemplate] }
    }

    // Validate response structure
    if (!parsedResponse.templates || !Array.isArray(parsedResponse.templates) || parsedResponse.templates.length === 0) {
      console.warn('Invalid AI response structure, using fallback')
      const fallbackTemplate = FALLBACK_TEMPLATES[request.context.industry] || FALLBACK_TEMPLATES.general
      parsedResponse = { templates: [fallbackTemplate] }
    }

    // Validate and enhance each template
    const validatedTemplates = parsedResponse.templates.map(template => {
      // Ensure all required fields exist
      if (!template.objective) {
        template.objective = {
          title: 'Objetivo General',
          description: 'Descripción del objetivo',
          category: 'General',
          timeframe: request.context.timeframe || 'quarterly'
        }
      }

      if (!template.keyResults || !Array.isArray(template.keyResults)) {
        template.keyResults = []
      }

      // Set default values for missing fields
      template.initiatives = template.initiatives || []
      template.metrics = template.metrics || []
      template.risks = template.risks || []
      template.successCriteria = template.successCriteria || []
      template.confidenceScore = template.confidenceScore || 0.7
      template.industryRelevance = template.industryRelevance || 0.8

      return template
    })

    // Calculate overall quality score
    const qualityScores = validatedTemplates.map(template => validateOKRTemplate(template).score)
    const qualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length

    // Generate suggestions for improvement
    const suggestions = [
      'Considera agregar métricas específicas de tu industria',
      'Revisa que los Key Results sean ambiciosos pero alcanzables',
      'Asegúrate de que las iniciativas estén alineadas con el objetivo',
      'Evalúa si los riesgos identificados son relevantes para tu contexto'
    ]

    return {
      templates: validatedTemplates,
      metadata: {
        generatedAt: new Date(),
        model: 'anthropic/claude-3-sonnet-20240229',
        provider: 'anthropic',
        requestId,
        processingTime: Date.now() - startTime
      },
      qualityScore,
      suggestions
    }

  } catch (error) {
    console.error('Error generating OKR templates:', error)

    // Return fallback response
    const fallbackTemplate = FALLBACK_TEMPLATES[request.context.industry] || FALLBACK_TEMPLATES.general

    return {
      templates: [fallbackTemplate],
      metadata: {
        generatedAt: new Date(),
        model: 'fallback',
        provider: 'internal',
        requestId,
        processingTime: Date.now() - startTime
      },
      qualityScore: 0.6,
      suggestions: [
        'Se utilizó una plantilla predeterminada debido a un error en la generación',
        'Considera proporcionar más contexto específico para mejorar la calidad',
        'Revisa y personaliza la plantilla según tus necesidades específicas'
      ]
    }
  }
}

// Export cached and rate-limited version
export const generateOKRTemplates = withCache(
  'generateOKRTemplates',
  withRateLimit(
    'generateOKRTemplates',
    generateOKRTemplatesBase,
    getRateLimitConfig(),
    (request: OKRGenerationRequest) =>
      `okr_${request.context.industry}_${request.context.companySize}_${request.context.department || 'general'}`
  ),
  CACHE_PRESETS.templates
)

// Export validation function
export { validateOKRTemplate }

// Export utility functions
export const getIndustryOptions = (): Industry[] => Object.keys(INDUSTRY_PROMPTS) as Industry[]
export const getCompanySizeOptions = (): CompanySize[] => ['startup', 'small', 'medium', 'large', 'enterprise']