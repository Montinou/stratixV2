import { type NextRequest, NextResponse } from "next/server"
import { generateOKRTemplates, validateOKRTemplate } from "@/lib/ai/okr-generator"
import {
  generateAdvancedOKRTemplates,
  advancedTemplateEngine,
  type AdvancedTemplateContext,
  type ExtendedIndustry,
  type GenerationMode,
  type QualityTier
} from "@/lib/ai/template-engine"
import { advancedValidator } from "@/lib/ai/template-validator"
import { stackServerApp } from "@/stack"
import type {
  OKRGenerationRequest,
  OKRTemplateContext,
  Industry,
  CompanySize
} from "@/lib/types/ai"

// Input validation schema
interface GenerateOKRRequest {
  industry: Industry
  companySize: CompanySize
  department?: string
  role?: 'corporativo' | 'gerente' | 'empleado'
  timeframe?: 'quarterly' | 'annual'
  focusArea?: string
  teamSize?: number
  companyStage?: 'early' | 'growth' | 'mature'
  specificGoals?: string[]
  numberOfTemplates?: number
  customPrompt?: string
  existingObjectives?: string[]

  // Advanced features
  extendedIndustry?: ExtendedIndustry
  generationMode?: GenerationMode
  qualityTier?: QualityTier
  templateStyle?: 'traditional' | 'agile' | 'startup'
  useAdvancedEngine?: boolean
  customization?: {
    includeRisks?: boolean
    includeInitiatives?: boolean
    includeSuccessCriteria?: boolean
    includeComplianceConsiderations?: boolean
    includeStakeholderImpact?: boolean
    focusOnSpecificMetrics?: string[]
    excludeTerms?: string[]
    customInstructions?: string
    preferredLanguageStyle?: 'formal' | 'casual' | 'technical' | 'business'
    emphasizeAreas?: string[]
  }
  existingOKRs?: any[]
  competitorBenchmarks?: string[]
  regulatoryRequirements?: string[]
  budgetConstraints?: string
  resourceLimitations?: string[]
  marketConditions?: string
  businessObjectives?: string[]
}

// Validation function
function validateRequest(body: any): { isValid: boolean; errors: string[]; data?: GenerateOKRRequest } {
  const errors: string[] = []

  // Required fields
  if (!body.industry) {
    errors.push('Industry is required')
  } else if (!isValidIndustry(body.industry)) {
    errors.push('Invalid industry value')
  }

  if (!body.companySize) {
    errors.push('Company size is required')
  } else if (!isValidCompanySize(body.companySize)) {
    errors.push('Invalid company size value')
  }

  // Optional field validation
  if (body.role && !['corporativo', 'gerente', 'empleado'].includes(body.role)) {
    errors.push('Invalid role value')
  }

  if (body.timeframe && !['quarterly', 'annual'].includes(body.timeframe)) {
    errors.push('Invalid timeframe value')
  }

  if (body.companyStage && !['early', 'growth', 'mature'].includes(body.companyStage)) {
    errors.push('Invalid company stage value')
  }

  if (body.numberOfTemplates && (body.numberOfTemplates < 1 || body.numberOfTemplates > 5)) {
    errors.push('Number of templates must be between 1 and 5')
  }

  if (body.teamSize && (body.teamSize < 1 || body.teamSize > 1000)) {
    errors.push('Team size must be between 1 and 1000')
  }

  if (body.specificGoals && (!Array.isArray(body.specificGoals) || body.specificGoals.length > 10)) {
    errors.push('Specific goals must be an array with maximum 10 items')
  }

  if (body.existingObjectives && (!Array.isArray(body.existingObjectives) || body.existingObjectives.length > 20)) {
    errors.push('Existing objectives must be an array with maximum 20 items')
  }

  if (body.customPrompt && body.customPrompt.length > 2000) {
    errors.push('Custom prompt must be less than 2000 characters')
  }

  if (body.department && body.department.length > 100) {
    errors.push('Department name must be less than 100 characters')
  }

  if (body.focusArea && body.focusArea.length > 200) {
    errors.push('Focus area must be less than 200 characters')
  }

  // Advanced features validation
  if (body.generationMode && !['standard', 'creative', 'conservative', 'aggressive'].includes(body.generationMode)) {
    errors.push('Invalid generation mode value')
  }

  if (body.qualityTier && !['basic', 'standard', 'premium', 'enterprise'].includes(body.qualityTier)) {
    errors.push('Invalid quality tier value')
  }

  if (body.templateStyle && !['traditional', 'agile', 'startup'].includes(body.templateStyle)) {
    errors.push('Invalid template style value')
  }

  if (body.customization?.preferredLanguageStyle &&
      !['formal', 'casual', 'technical', 'business'].includes(body.customization.preferredLanguageStyle)) {
    errors.push('Invalid preferred language style')
  }

  if (body.customization?.focusOnSpecificMetrics &&
      (!Array.isArray(body.customization.focusOnSpecificMetrics) || body.customization.focusOnSpecificMetrics.length > 10)) {
    errors.push('Focus on specific metrics must be an array with maximum 10 items')
  }

  if (body.customization?.excludeTerms &&
      (!Array.isArray(body.customization.excludeTerms) || body.customization.excludeTerms.length > 20)) {
    errors.push('Exclude terms must be an array with maximum 20 items')
  }

  if (body.customization?.emphasizeAreas &&
      (!Array.isArray(body.customization.emphasizeAreas) || body.customization.emphasizeAreas.length > 10)) {
    errors.push('Emphasize areas must be an array with maximum 10 items')
  }

  if (body.competitorBenchmarks &&
      (!Array.isArray(body.competitorBenchmarks) || body.competitorBenchmarks.length > 15)) {
    errors.push('Competitor benchmarks must be an array with maximum 15 items')
  }

  if (body.regulatoryRequirements &&
      (!Array.isArray(body.regulatoryRequirements) || body.regulatoryRequirements.length > 10)) {
    errors.push('Regulatory requirements must be an array with maximum 10 items')
  }

  if (body.resourceLimitations &&
      (!Array.isArray(body.resourceLimitations) || body.resourceLimitations.length > 15)) {
    errors.push('Resource limitations must be an array with maximum 15 items')
  }

  if (body.businessObjectives &&
      (!Array.isArray(body.businessObjectives) || body.businessObjectives.length > 10)) {
    errors.push('Business objectives must be an array with maximum 10 items')
  }

  if (body.budgetConstraints && body.budgetConstraints.length > 500) {
    errors.push('Budget constraints must be less than 500 characters')
  }

  if (body.marketConditions && body.marketConditions.length > 500) {
    errors.push('Market conditions must be less than 500 characters')
  }

  if (body.customization?.customInstructions && body.customization.customInstructions.length > 1000) {
    errors.push('Custom instructions must be less than 1000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? body as GenerateOKRRequest : undefined
  }
}

function isValidIndustry(industry: string): industry is Industry {
  const validIndustries: Industry[] = [
    'technology', 'finance', 'healthcare', 'retail', 'manufacturing',
    'education', 'consulting', 'marketing', 'sales', 'hr', 'operations', 'general'
  ]
  return validIndustries.includes(industry as Industry)
}

function isValidCompanySize(size: string): size is CompanySize {
  const validSizes: CompanySize[] = ['startup', 'small', 'medium', 'large', 'enterprise']
  return validSizes.includes(size as CompanySize)
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication with Stack Auth
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON", message: "Request body must be valid JSON" },
        { status: 400 }
      )
    }

    // Validate request data
    const validation = validateRequest(body)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid request parameters",
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const requestData = validation.data!

    // Determine if we should use the advanced engine
    const useAdvanced = requestData.useAdvancedEngine ||
                       requestData.extendedIndustry ||
                       requestData.generationMode ||
                       requestData.qualityTier ||
                       requestData.customization ||
                       requestData.competitorBenchmarks ||
                       requestData.regulatoryRequirements

    const startTime = Date.now()
    let response: any
    let validatedTemplates: any[]

    if (useAdvanced) {
      // Build advanced context for OKR generation
      const advancedContext: AdvancedTemplateContext = {
        industry: requestData.industry,
        companySize: requestData.companySize,
        department: requestData.department,
        role: requestData.role,
        timeframe: requestData.timeframe || 'quarterly',
        focusArea: requestData.focusArea,
        teamSize: requestData.teamSize,
        companyStage: requestData.companyStage,
        specificGoals: requestData.specificGoals,
        extendedIndustry: requestData.extendedIndustry,
        generationMode: requestData.generationMode || 'standard',
        qualityTier: requestData.qualityTier || 'standard',
        templateStyle: requestData.templateStyle || 'traditional',
        customization: requestData.customization,
        existingOKRs: requestData.existingOKRs,
        competitorBenchmarks: requestData.competitorBenchmarks,
        regulatoryRequirements: requestData.regulatoryRequirements,
        budgetConstraints: requestData.budgetConstraints,
        resourceLimitations: requestData.resourceLimitations,
        marketConditions: requestData.marketConditions,
        businessObjectives: requestData.businessObjectives
      }

      // Generate advanced OKR templates
      const advancedResponse = await generateAdvancedOKRTemplates(
        advancedContext,
        requestData.numberOfTemplates || 3
      )

      // Validate each generated template with advanced validation
      validatedTemplates = advancedResponse.templates.map(template => {
        const advancedValidation = advancedValidator.validateEnhancedTemplate(template, advancedContext)
        return {
          ...template,
          qualityValidation: advancedValidation,
          isAdvanced: true
        }
      })

      response = {
        templates: validatedTemplates,
        metadata: {
          generatedAt: new Date(),
          model: advancedResponse.templates[0]?.metadata.model || 'advanced-engine',
          provider: advancedResponse.templates[0]?.metadata.provider || 'vercel-ai-gateway',
          requestId: advancedResponse.analytics.requestId,
          processingTime: advancedResponse.analytics.generationTime,
          engine: 'advanced'
        },
        qualityScore: advancedResponse.analytics.averageQuality,
        suggestions: advancedResponse.improvements,
        analytics: advancedResponse.analytics,
        alternatives: advancedResponse.alternatives
      }
    } else {
      // Build standard context for OKR generation
      const context: OKRTemplateContext = {
        industry: requestData.industry,
        companySize: requestData.companySize,
        department: requestData.department,
        role: requestData.role,
        timeframe: requestData.timeframe || 'quarterly',
        focusArea: requestData.focusArea,
        teamSize: requestData.teamSize,
        companyStage: requestData.companyStage,
        specificGoals: requestData.specificGoals
      }

      // Create generation request
      const generationRequest: OKRGenerationRequest = {
        context,
        numberOfTemplates: requestData.numberOfTemplates || 3,
        customPrompt: requestData.customPrompt,
        existingObjectives: requestData.existingObjectives
      }

      // Generate standard OKR templates
      response = await generateOKRTemplates(generationRequest)

      // Validate each generated template and add quality scores
      validatedTemplates = response.templates.map(template => {
        const validation = validateOKRTemplate(template)
        return {
          ...template,
          qualityValidation: validation,
          isAdvanced: false
        }
      })

      response.templates = validatedTemplates
      response.metadata.engine = 'standard'
    }

    // Calculate overall quality metrics
    const qualityScores = validatedTemplates.map(t => t.qualityValidation.score)
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    const validTemplatesCount = validatedTemplates.filter(t => t.qualityValidation.isValid).length

    // Enhanced quality distribution for advanced templates
    const qualityDistribution = useAdvanced ? {
      excellent: qualityScores.filter(s => s >= 0.9).length,
      good: qualityScores.filter(s => s >= 0.75 && s < 0.9).length,
      acceptable: qualityScores.filter(s => s >= 0.6 && s < 0.75).length,
      poor: qualityScores.filter(s => s < 0.6).length
    } : {
      excellent: qualityScores.filter(s => s >= 0.9).length,
      good: qualityScores.filter(s => s >= 0.7 && s < 0.9).length,
      fair: qualityScores.filter(s => s >= 0.5 && s < 0.7).length,
      poor: qualityScores.filter(s => s < 0.5).length
    }

    // Prepare enhanced response
    const apiResponse = {
      success: true,
      data: {
        ...response,
        templates: validatedTemplates
      },
      metrics: {
        generationTime: Date.now() - startTime,
        templatesGenerated: validatedTemplates.length,
        validTemplates: validTemplatesCount,
        averageQuality,
        qualityDistribution,
        engineUsed: useAdvanced ? 'advanced' : 'standard',
        ...(useAdvanced && response.analytics && {
          costEstimate: response.analytics.costEstimate,
          cacheHit: response.analytics.cacheHit,
          rateLimitHit: response.analytics.rateLimitHit
        })
      },
      context: useAdvanced ? {
        industry: requestData.industry,
        extendedIndustry: requestData.extendedIndustry,
        companySize: requestData.companySize,
        timeframe: requestData.timeframe || 'quarterly',
        generationMode: requestData.generationMode || 'standard',
        qualityTier: requestData.qualityTier || 'standard',
        templateStyle: requestData.templateStyle || 'traditional',
        requestedTemplates: requestData.numberOfTemplates || 3
      } : {
        industry: requestData.industry,
        companySize: requestData.companySize,
        timeframe: requestData.timeframe || 'quarterly',
        requestedTemplates: requestData.numberOfTemplates || 3
      },
      // Include advanced features in response if available
      ...(useAdvanced && response.alternatives && {
        alternatives: response.alternatives.slice(0, 3) // Limit alternatives
      }),
      ...(useAdvanced && response.analytics && {
        advancedAnalytics: {
          qualityTierUsed: requestData.qualityTier || 'standard',
          customizationApplied: !!requestData.customization,
          industrySpecializationUsed: !!requestData.extendedIndustry,
          contextEnrichment: {
            competitorBenchmarks: !!requestData.competitorBenchmarks,
            regulatoryRequirements: !!requestData.regulatoryRequirements,
            businessObjectives: !!requestData.businessObjectives
          }
        }
      })
    }

    // Log successful generation for analytics
    console.log(`[OKR Generation] Success for user ${user.id}:`, {
      industry: requestData.industry,
      extendedIndustry: requestData.extendedIndustry,
      companySize: requestData.companySize,
      engineUsed: useAdvanced ? 'advanced' : 'standard',
      templatesGenerated: validatedTemplates.length,
      averageQuality,
      processingTime: Date.now() - startTime
    })

    return NextResponse.json(apiResponse)

  } catch (error) {
    console.error("Error generating OKR templates:", error)

    // Handle specific error types
    if (error instanceof Error) {
      // Rate limit error
      if (error.message.includes('Rate limit exceeded')) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: "Too many requests. Please wait before trying again.",
            retryAfter: 60 // seconds
          },
          { status: 429 }
        )
      }

      // AI service error
      if (error.message.includes('AI') || error.message.includes('model')) {
        return NextResponse.json(
          {
            error: "AI service error",
            message: "AI service is temporarily unavailable. Please try again later."
          },
          { status: 503 }
        )
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to generate OKR templates. Please try again later."
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving supported options
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    // Return supported configuration options including advanced features
    const options = {
      industries: [
        { value: 'technology', label: 'Tecnología', description: 'Empresas de software, hardware y servicios tecnológicos' },
        { value: 'finance', label: 'Finanzas', description: 'Bancos, seguros, fintech y servicios financieros' },
        { value: 'healthcare', label: 'Salud', description: 'Hospitales, clínicas, farmacéuticas y dispositivos médicos' },
        { value: 'retail', label: 'Retail', description: 'Comercio minorista, e-commerce y distribución' },
        { value: 'manufacturing', label: 'Manufactura', description: 'Producción industrial y manufactura' },
        { value: 'education', label: 'Educación', description: 'Instituciones educativas y servicios de formación' },
        { value: 'consulting', label: 'Consultoría', description: 'Servicios de consultoría y asesoramiento' },
        { value: 'marketing', label: 'Marketing', description: 'Agencias de marketing y publicidad' },
        { value: 'sales', label: 'Ventas', description: 'Equipos y departamentos de ventas' },
        { value: 'hr', label: 'Recursos Humanos', description: 'Gestión de talento y recursos humanos' },
        { value: 'operations', label: 'Operaciones', description: 'Operaciones y gestión de procesos' },
        { value: 'general', label: 'General', description: 'Sector general o múltiples industrias' }
      ],
      extendedIndustries: [
        { value: 'fintech', label: 'Fintech', description: 'Tecnología financiera y servicios financieros digitales' },
        { value: 'healthtech', label: 'HealthTech', description: 'Tecnología aplicada a la salud y medicina' },
        { value: 'edtech', label: 'EdTech', description: 'Tecnología educativa y plataformas de aprendizaje' },
        { value: 'proptech', label: 'PropTech', description: 'Tecnología inmobiliaria y gestión de propiedades' },
        { value: 'logistics', label: 'Logística', description: 'Cadena de suministro y gestión logística' },
        { value: 'automotive', label: 'Automotriz', description: 'Industria automotriz y movilidad' },
        { value: 'aerospace', label: 'Aeroespacial', description: 'Industria aeronáutica y espacial' },
        { value: 'energy', label: 'Energía', description: 'Sector energético y energías renovables' },
        { value: 'telecommunications', label: 'Telecomunicaciones', description: 'Servicios de comunicación y conectividad' },
        { value: 'media', label: 'Medios', description: 'Medios de comunicación y entretenimiento' },
        { value: 'hospitality', label: 'Hospitalidad', description: 'Turismo, hoteles y servicios de hospitalidad' },
        { value: 'agriculture', label: 'Agricultura', description: 'Sector agrícola y agrotecnología' },
        { value: 'nonprofit', label: 'Sin Fines de Lucro', description: 'Organizaciones sin fines de lucro y ONG' },
        { value: 'government', label: 'Gobierno', description: 'Sector público y administración gubernamental' },
        { value: 'legal', label: 'Legal', description: 'Servicios legales y jurídicos' }
      ],
      companySizes: [
        { value: 'startup', label: 'Startup', description: '1-10 empleados' },
        { value: 'small', label: 'Pequeña', description: '11-50 empleados' },
        { value: 'medium', label: 'Mediana', description: '51-250 empleados' },
        { value: 'large', label: 'Grande', description: '251-1000 empleados' },
        { value: 'enterprise', label: 'Empresa', description: '1000+ empleados' }
      ],
      timeframes: [
        { value: 'quarterly', label: 'Trimestral', description: 'OKRs para 3 meses' },
        { value: 'annual', label: 'Anual', description: 'OKRs para 12 meses' }
      ],
      roles: [
        { value: 'corporativo', label: 'Corporativo', description: 'Nivel ejecutivo y directivo' },
        { value: 'gerente', label: 'Gerente', description: 'Nivel de gerencia media' },
        { value: 'empleado', label: 'Empleado', description: 'Nivel individual contribuidor' }
      ],
      companyStages: [
        { value: 'early', label: 'Etapa Temprana', description: 'Empresa en fase inicial' },
        { value: 'growth', label: 'Crecimiento', description: 'Empresa en fase de crecimiento' },
        { value: 'mature', label: 'Madura', description: 'Empresa establecida y madura' }
      ],
      generationModes: [
        { value: 'standard', label: 'Estándar', description: 'Generación equilibrada y confiable' },
        { value: 'creative', label: 'Creativo', description: 'Enfoques innovadores y experimentales' },
        { value: 'conservative', label: 'Conservador', description: 'Objetivos realistas y seguros' },
        { value: 'aggressive', label: 'Agresivo', description: 'Metas ambiciosas y de alto impacto' }
      ],
      qualityTiers: [
        { value: 'basic', label: 'Básico', description: 'Generación rápida con calidad estándar' },
        { value: 'standard', label: 'Estándar', description: 'Balance entre calidad y velocidad' },
        { value: 'premium', label: 'Premium', description: 'Alta calidad con análisis profundo' },
        { value: 'enterprise', label: 'Enterprise', description: 'Máxima calidad y personalización' }
      ],
      templateStyles: [
        { value: 'traditional', label: 'Tradicional', description: 'Enfoque clásico de OKRs con estructura formal' },
        { value: 'agile', label: 'Ágil', description: 'Enfoque iterativo con objetivos adaptativos' },
        { value: 'startup', label: 'Startup', description: 'Enfoque de alto crecimiento con experimentación' }
      ],
      languageStyles: [
        { value: 'formal', label: 'Formal', description: 'Lenguaje corporativo y profesional' },
        { value: 'casual', label: 'Casual', description: 'Lenguaje directo y accesible' },
        { value: 'technical', label: 'Técnico', description: 'Terminología especializada y precisa' },
        { value: 'business', label: 'Empresarial', description: 'Enfoque en resultados de negocio' }
      ],
      advancedFeatures: {
        templateEngine: {
          name: 'Motor de Plantillas Avanzado',
          description: 'Generación de OKRs con IA especializada por industria',
          capabilities: [
            'Análisis de contexto empresarial avanzado',
            'Personalización por rol y departamento',
            'Integración de benchmarks de industria',
            'Consideraciones regulatorias específicas',
            'Análisis de riesgos contextual'
          ]
        },
        qualityValidation: {
          name: 'Validación de Calidad Avanzada',
          description: 'Sistema de scoring multi-dimensional para OKRs',
          metrics: [
            'Especificidad y claridad',
            'Medibilidad y cuantificación',
            'Factibilidad y realismo',
            'Relevancia estratégica',
            'Alineación temporal',
            'Compatibilidad industrial',
            'Valor estratégico'
          ]
        },
        customization: {
          name: 'Personalización Profunda',
          description: 'Opciones de customización para contextos específicos',
          options: [
            'Inclusión de factores de riesgo',
            'Consideraciones de compliance',
            'Análisis de stakeholders',
            'Métricas específicas por enfoque',
            'Exclusión de términos',
            'Instrucciones personalizadas'
          ]
        }
      },
      limits: {
        numberOfTemplates: { min: 1, max: 5, default: 3 },
        teamSize: { min: 1, max: 1000 },
        specificGoals: { max: 10 },
        existingObjectives: { max: 20 },
        customPrompt: { maxLength: 2000 },
        department: { maxLength: 100 },
        focusArea: { maxLength: 200 },
        // Advanced limits
        focusOnSpecificMetrics: { max: 10 },
        excludeTerms: { max: 20 },
        emphasizeAreas: { max: 10 },
        competitorBenchmarks: { max: 15 },
        regulatoryRequirements: { max: 10 },
        resourceLimitations: { max: 15 },
        businessObjectives: { max: 10 },
        budgetConstraints: { maxLength: 500 },
        marketConditions: { maxLength: 500 },
        customInstructions: { maxLength: 1000 }
      }
    }

    return NextResponse.json({
      success: true,
      data: options
    })

  } catch (error) {
    console.error("Error retrieving OKR generation options:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to retrieve options. Please try again later."
      },
      { status: 500 }
    )
  }
}