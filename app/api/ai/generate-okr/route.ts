import { type NextRequest, NextResponse } from "next/server"
import { generateOKRTemplates, validateOKRTemplate } from "@/lib/ai/okr-generator"
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

    // Build context for OKR generation
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

    // Generate OKR templates
    const startTime = Date.now()
    const response = await generateOKRTemplates(generationRequest)

    // Validate each generated template and add quality scores
    const validatedTemplates = response.templates.map(template => {
      const validation = validateOKRTemplate(template)
      return {
        ...template,
        qualityValidation: validation
      }
    })

    // Calculate overall quality metrics
    const qualityScores = validatedTemplates.map(t => t.qualityValidation.score)
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    const validTemplatesCount = validatedTemplates.filter(t => t.qualityValidation.isValid).length

    // Prepare response
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
        qualityDistribution: {
          excellent: qualityScores.filter(s => s >= 0.9).length,
          good: qualityScores.filter(s => s >= 0.7 && s < 0.9).length,
          fair: qualityScores.filter(s => s >= 0.5 && s < 0.7).length,
          poor: qualityScores.filter(s => s < 0.5).length
        }
      },
      context: {
        industry: context.industry,
        companySize: context.companySize,
        timeframe: context.timeframe,
        requestedTemplates: generationRequest.numberOfTemplates
      }
    }

    // Log successful generation for analytics
    console.log(`[OKR Generation] Success for user ${user.id}:`, {
      industry: context.industry,
      companySize: context.companySize,
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

    // Return supported configuration options
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
      limits: {
        numberOfTemplates: { min: 1, max: 5, default: 3 },
        teamSize: { min: 1, max: 1000 },
        specificGoals: { max: 10 },
        existingObjectives: { max: 20 },
        customPrompt: { maxLength: 2000 },
        department: { maxLength: 100 },
        focusArea: { maxLength: 200 }
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