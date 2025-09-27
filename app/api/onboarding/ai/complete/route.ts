import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from "zod";
import { getOnboardingSessionWithProgress, getAllIndustries } from "@/lib/database/onboarding-queries";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";
import { RateLimitUtils } from "@/lib/redis/rate-limiter";

export const runtime = 'nodejs';

// Initialize AI Gateway
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Request validation schema
const autoCompleteSchema = z.object({
  session_id: z.string().uuid('ID de sesión inválido'),
  partial_data: z.record(z.any()).optional(),
  completion_type: z.enum(['smart_fill', 'suggestions', 'full_analysis']).default('smart_fill'),
  fields_to_complete: z.array(z.string()).optional()
});


async function generateSmartCompletion(
  sessionData: any,
  partialData: Record<string, any>,
  fieldsToComplete?: string[]
): Promise<{
  completed_fields: Record<string, any>;
  suggestions: Record<string, string[]>;
  confidence_scores: Record<string, number>;
  rationale: Record<string, string>;
}> {
  const existingData = sessionData.form_data || {};
  const allData = { ...existingData, ...partialData };

  const prompt = `Eres un experto en consultoría empresarial y onboarding. Basándote en la información existente, completa de manera inteligente los campos faltantes.

INFORMACIÓN EXISTENTE:
${JSON.stringify(allData, null, 2)}

CAMPOS A COMPLETAR:
${fieldsToComplete ? fieldsToComplete.join(', ') : 'Todos los campos relevantes'}

Tu tarea es:
1. Analizar patrones en la información existente
2. Inferir valores lógicos para campos faltantes
3. Proporcionar sugerencias múltiples cuando sea apropiado
4. Asignar niveles de confianza a cada completación

REGLAS:
- Solo completa campos con alta confianza (>70%)
- Para campos de menor confianza, proporciona sugerencias múltiples
- Mantén coherencia con la información existente
- Usa conocimiento de mejores prácticas empresariales

Responde en formato JSON:
{
  "completed_fields": {
    "field_name": "completed_value"
  },
  "suggestions": {
    "field_name": ["suggestion1", "suggestion2", "suggestion3"]
  },
  "confidence_scores": {
    "field_name": 85
  },
  "rationale": {
    "field_name": "Razón para esta completación/sugerencia"
  }
}`;

  try {
    const result = await generateText({
      model: ai('openai/gpt-4o'),
      prompt,
      maxTokens: 1500,
      temperature: 0.4 // Moderate creativity for suggestions
    });

    const parsedResponse = JSON.parse(result.text);

    return {
      completed_fields: parsedResponse.completed_fields || {},
      suggestions: parsedResponse.suggestions || {},
      confidence_scores: parsedResponse.confidence_scores || {},
      rationale: parsedResponse.rationale || {}
    };

  } catch (error) {
    console.error('Error in AI completion:', error);

    // Fallback completion logic
    const fallbackCompletion = generateFallbackCompletion(allData, fieldsToComplete);
    return fallbackCompletion;
  }
}

function generateFallbackCompletion(
  data: Record<string, any>,
  fieldsToComplete?: string[]
): {
  completed_fields: Record<string, any>;
  suggestions: Record<string, string[]>;
  confidence_scores: Record<string, number>;
  rationale: Record<string, string>;
} {
  const completed: Record<string, any> = {};
  const suggestions: Record<string, string[]> = {};
  const confidence: Record<string, number> = {};
  const rationale: Record<string, string> = {};

  // Smart fallback logic based on common patterns
  const welcome = data.welcome || {};
  const company = data.company || {};

  // Company size inference
  if (!company.company_size && company.employee_count) {
    const empCount = company.employee_count;
    if (empCount <= 10) {
      completed.company_size = 'startup';
      confidence.company_size = 85;
      rationale.company_size = 'Inferido basado en el número de empleados';
    } else if (empCount <= 50) {
      completed.company_size = 'pyme';
      confidence.company_size = 85;
      rationale.company_size = 'Inferido basado en el número de empleados';
    } else if (empCount <= 250) {
      completed.company_size = 'empresa';
      confidence.company_size = 85;
      rationale.company_size = 'Inferido basado en el número de empleados';
    } else {
      completed.company_size = 'corporacion';
      confidence.company_size = 85;
      rationale.company_size = 'Inferido basado en el número de empleados';
    }
  }

  // OKR maturity inference
  if (!data.organization?.okr_maturity && welcome.experience_with_okr) {
    const exp = welcome.experience_with_okr;
    if (exp === 'none') {
      completed.okr_maturity = 'beginner';
      confidence.okr_maturity = 90;
      rationale.okr_maturity = 'Basado en la experiencia declarada con OKRs';
    } else if (exp === 'advanced') {
      completed.okr_maturity = 'advanced';
      confidence.okr_maturity = 90;
      rationale.okr_maturity = 'Basado en la experiencia declarada con OKRs';
    } else {
      completed.okr_maturity = 'intermediate';
      confidence.okr_maturity = 85;
      rationale.okr_maturity = 'Basado en la experiencia declarada con OKRs';
    }
  }

  // Communication style suggestions
  if (!data.preferences?.communication_style) {
    suggestions.communication_style = ['formal', 'informal'];
    confidence.communication_style = 60;
    rationale.communication_style = 'Ambos estilos son válidos, depende de la cultura empresarial';
  }

  // Business goals suggestions based on company context
  if (!data.organization?.business_goals) {
    if (company.company_size === 'startup') {
      suggestions.business_goals = [
        'revenue_growth',
        'product_development',
        'market_expansion'
      ];
    } else if (company.company_size === 'corporacion') {
      suggestions.business_goals = [
        'operational_efficiency',
        'customer_satisfaction',
        'innovation'
      ];
    } else {
      suggestions.business_goals = [
        'revenue_growth',
        'operational_efficiency',
        'team_development'
      ];
    }
    confidence.business_goals = 70;
    rationale.business_goals = 'Sugerencias basadas en el tamaño y contexto empresarial';
  }

  return {
    completed_fields: completed,
    suggestions,
    confidence_scores: confidence,
    rationale
  };
}

async function generateFullAnalysis(sessionData: any): Promise<{
  completeness_score: number;
  missing_critical_fields: string[];
  recommendations: string[];
  risk_factors: string[];
  success_predictors: string[];
}> {
  const prompt = `Eres un experto en análisis de completitud de onboarding empresarial. Analiza la información proporcionada y genera un reporte completo.

DATOS DEL ONBOARDING:
${JSON.stringify(sessionData.form_data, null, 2)}

PROGRESO DE PASOS:
${JSON.stringify(sessionData.progress, null, 2)}

Genera un análisis completo que incluya:
1. Puntuación de completitud (0-100)
2. Campos críticos faltantes
3. Recomendaciones para mejorar la configuración
4. Factores de riesgo identificados
5. Predictores de éxito

Responde en formato JSON:
{
  "completeness_score": 85,
  "missing_critical_fields": ["field1", "field2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "risk_factors": ["riesgo1", "riesgo2"],
  "success_predictors": ["predictor1", "predictor2"]
}`;

  try {
    const result = await generateText({
      model: ai('openai/gpt-4o'),
      prompt,
      maxTokens: 1200,
      temperature: 0.3
    });

    return JSON.parse(result.text);

  } catch (error) {
    console.error('Error in full analysis:', error);

    // Fallback analysis
    const progress = sessionData.progress || [];
    const completedSteps = progress.filter((p: any) => p.completed).length;
    const totalSteps = sessionData.total_steps || 5;

    return {
      completeness_score: Math.round((completedSteps / totalSteps) * 100),
      missing_critical_fields: [],
      recommendations: [
        'Completa todos los pasos del onboarding',
        'Revisa la información ingresada para asegurar precisión',
        'Considera configurar integraciones adicionales'
      ],
      risk_factors: ['Información incompleta podría afectar las recomendaciones'],
      success_predictors: ['Completitud de información', 'Claridad en objetivos']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Check AI rate limiting
    const rateLimitResult = await RateLimitUtils.checkAIUsageLimit(user.id, 'completion');
    if (!rateLimitResult.allowed) {
      return new Response("Límite de solicitudes de IA excedido. Intenta de nuevo más tarde.", {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
        }
      });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = autoCompleteSchema.parse(body);

    const { session_id, partial_data, completion_type, fields_to_complete } = validatedRequest;

    // Get session with progress
    const sessionWithProgress = await getOnboardingSessionWithProgress(session_id);
    if (!sessionWithProgress) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (sessionWithProgress.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    let response: any = {};

    switch (completion_type) {
      case 'smart_fill':
        const completion = await generateSmartCompletion(
          sessionWithProgress,
          partial_data || {},
          fields_to_complete
        );
        response = {
          type: 'smart_fill',
          ...completion
        };
        break;

      case 'suggestions':
        const suggestions = await generateSmartCompletion(
          sessionWithProgress,
          partial_data || {},
          fields_to_complete
        );
        response = {
          type: 'suggestions',
          suggestions: suggestions.suggestions,
          rationale: suggestions.rationale
        };
        break;

      case 'full_analysis':
        const analysis = await generateFullAnalysis(sessionWithProgress);
        response = {
          type: 'full_analysis',
          ...analysis
        };
        break;

      default:
        throw new Error('Tipo de completación no válido');
    }

    return new Response(JSON.stringify({
      session_id,
      completion_type,
      timestamp: new Date().toISOString(),
      ...response
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-ai-model': 'gpt-4o',
        'x-completion-type': completion_type
      }
    });

  } catch (error) {
    console.error("Error in AI completion:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'AI Completion');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get rate limit status for completion operation
    const rateLimitStatus = await RateLimitUtils.getRateLimitStatus(user.id);

    // Return completion capabilities
    const capabilities = {
      available_types: [
        {
          type: 'smart_fill',
          description: 'Completa automáticamente campos con alta confianza',
          use_case: 'Acelerar el proceso de onboarding'
        },
        {
          type: 'suggestions',
          description: 'Proporciona múltiples opciones para cada campo',
          use_case: 'Ayudar en la toma de decisiones'
        },
        {
          type: 'full_analysis',
          description: 'Análisis completo de completitud y recomendaciones',
          use_case: 'Evaluar la calidad del onboarding'
        }
      ],
      rate_limit: {
        requests_per_hour: 15, // completion limit from RateLimitUtils
        remaining: rateLimitStatus.ai_completion.remaining,
        reset_time: rateLimitStatus.ai_completion.resetTime
      },
      supported_fields: [
        'company_size',
        'okr_maturity',
        'communication_style',
        'business_goals',
        'current_challenges',
        'industry_id'
      ]
    };

    return new Response(JSON.stringify(capabilities), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error getting completion capabilities:", error);
    return handleUnknownError(error, 'AI Completion Capabilities');
  }
}