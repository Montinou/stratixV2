import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from "zod";
import { getOnboardingSession } from "@/lib/database/onboarding-queries";
import type { AIValidationRequest, AIValidationResponse } from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';

// Initialize AI Gateway
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Request validation schema
const validationRequestSchema = z.object({
  session_id: z.string().uuid('ID de sesión inválido'),
  step_data: z.record(z.any()),
  step_name: z.string().min(1, 'Nombre del paso es requerido'),
  context: z.record(z.any()).optional()
});

// Rate limiting (shared with suggest endpoint)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const AI_RATE_LIMIT = 30; // requests per hour for validation (higher than analysis)
const AI_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkAIRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + AI_RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= AI_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

async function generateStepValidation(
  stepName: string,
  stepData: Record<string, any>,
  context?: Record<string, any>
): Promise<AIValidationResponse> {
  let prompt = '';

  switch (stepName) {
    case 'welcome':
      prompt = `Eres un experto en onboarding empresarial. Analiza los siguientes datos del paso de bienvenida y proporciona validación y sugerencias.

DATOS DEL USUARIO:
${JSON.stringify(stepData, null, 2)}

Evalúa:
1. Coherencia entre experiencia con OKR y objetivo principal
2. Realismo del nivel de urgencia vs objetivo
3. Claridad y especificidad del objetivo principal
4. Potencial para el éxito con OKRs

Responde en formato JSON:
{
  "is_valid": <boolean>,
  "validation_score": <0-100>,
  "suggestions": ["<sugerencia1>", "<sugerencia2>"],
  "warnings": ["<advertencia1>"],
  "auto_corrections": {},
  "next_step_hints": ["<hint1>", "<hint2>"]
}`;
      break;

    case 'company':
      prompt = `Eres un experto en análisis empresarial. Valida la información de la empresa proporcionada.

DATOS DE LA EMPRESA:
${JSON.stringify(stepData, null, 2)}

Evalúa:
1. Coherencia entre descripción y industria seleccionada
2. Realismo del tamaño vs número de empleados
3. Calidad de la descripción empresarial
4. Validez del sitio web (si se proporciona)

Responde en formato JSON:
{
  "is_valid": <boolean>,
  "validation_score": <0-100>,
  "suggestions": ["<sugerencia1>"],
  "warnings": ["<advertencia1>"],
  "auto_corrections": {"field": "corrected_value"},
  "next_step_hints": ["<hint1>"]
}`;
      break;

    case 'organization':
      prompt = `Eres un experto en estructura organizacional y OKRs. Valida la información organizacional.

DATOS ORGANIZACIONALES:
${JSON.stringify(stepData, null, 2)}

Evalúa:
1. Coherencia entre desafíos y objetivos de negocio
2. Realismo del nivel de madurez OKR vs experiencia
3. Alineación entre desafíos y metas empresariales
4. Viabilidad de los objetivos seleccionados

Responde en formato JSON:
{
  "is_valid": <boolean>,
  "validation_score": <0-100>,
  "suggestions": ["<sugerencia1>"],
  "warnings": ["<advertencia1>"],
  "auto_corrections": {},
  "next_step_hints": ["<hint1>"]
}`;
      break;

    case 'preferences':
      prompt = `Eres un experto en experiencia de usuario y productividad. Valida las preferencias del sistema.

PREFERENCIAS:
${JSON.stringify(stepData, null, 2)}

Evalúa:
1. Coherencia entre nivel de asistencia IA y experiencia
2. Alineación entre áreas de enfoque y objetivos
3. Realismo de frecuencia de notificaciones
4. Compatibilidad entre estilo de comunicación y nivel profesional

Responde en formato JSON:
{
  "is_valid": <boolean>,
  "validation_score": <0-100>,
  "suggestions": ["<sugerencia1>"],
  "warnings": ["<advertencia1>"],
  "auto_corrections": {},
  "next_step_hints": ["<hint1>"]
}`;
      break;

    case 'review':
      prompt = `Eres un experto en completación de procesos. Valida la información de revisión final.

DATOS DE REVISIÓN:
${JSON.stringify(stepData, null, 2)}

CONTEXTO COMPLETO:
${JSON.stringify(context, null, 2)}

Evalúa:
1. Completitud de toda la información proporcionada
2. Coherencia global entre todos los pasos
3. Preparación para comenzar con OKRs
4. Identificación de posibles inconsistencias

Responde en formato JSON:
{
  "is_valid": <boolean>,
  "validation_score": <0-100>,
  "suggestions": ["<sugerencia1>"],
  "warnings": ["<advertencia1>"],
  "auto_corrections": {},
  "next_step_hints": ["<hint1>"]
}`;
      break;

    default:
      throw new Error(`Paso no reconocido: ${stepName}`);
  }

  try {
    const result = await generateText({
      model: ai('openai/gpt-4o-mini'), // Use mini model for validation (faster, cheaper)
      prompt,
      maxTokens: 800,
      temperature: 0.2 // Low temperature for consistent validation
    });

    const parsedResponse = JSON.parse(result.text);

    // Ensure required fields exist
    return {
      is_valid: parsedResponse.is_valid ?? true,
      validation_score: Math.max(0, Math.min(100, parsedResponse.validation_score ?? 80)),
      suggestions: Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions : [],
      warnings: Array.isArray(parsedResponse.warnings) ? parsedResponse.warnings : [],
      auto_corrections: parsedResponse.auto_corrections ?? {},
      next_step_hints: Array.isArray(parsedResponse.next_step_hints) ? parsedResponse.next_step_hints : []
    };

  } catch (error) {
    console.error('Error in AI validation:', error);

    // Fallback validation
    return {
      is_valid: true,
      validation_score: 75,
      suggestions: ['Los datos proporcionados parecen correctos. Continúa al siguiente paso.'],
      warnings: [],
      auto_corrections: {},
      next_step_hints: ['Asegúrate de revisar la información antes de continuar.']
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
    if (!checkAIRateLimit(user.id)) {
      return new Response("Límite de solicitudes de IA excedido. Intenta de nuevo más tarde.", {
        status: 429
      });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validationRequestSchema.parse(body);

    const { session_id, step_data, step_name, context } = validatedRequest;

    // Verify session ownership
    const session = await getOnboardingSession(session_id);
    if (!session) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (session.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Basic validation first
    if (!step_data || Object.keys(step_data).length === 0) {
      return new Response(JSON.stringify({
        is_valid: false,
        validation_score: 0,
        suggestions: ['No se proporcionaron datos para validar.'],
        warnings: ['Completa los campos requeridos antes de continuar.'],
        auto_corrections: {},
        next_step_hints: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate AI validation
    const validation = await generateStepValidation(step_name, step_data, context);

    // Add some contextual hints based on step and validation score
    if (validation.validation_score < 60) {
      validation.warnings.push('La información podría necesitar revisión antes de continuar.');
    }

    if (validation.validation_score > 90) {
      validation.next_step_hints.unshift('¡Excelente! Estás listo para el siguiente paso.');
    }

    return new Response(JSON.stringify(validation), {
      headers: {
        'Content-Type': 'application/json',
        'x-ai-model': 'gpt-4o-mini',
        'x-validation-timestamp': new Date().toISOString(),
        'x-session-id': session_id,
        'x-step-name': step_name
      }
    });

  } catch (error) {
    console.error("Error in AI validation:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'AI Validation');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stepName = searchParams.get('step');

    if (!stepName) {
      return new Response("Parámetro 'step' es requerido", { status: 400 });
    }

    // Return validation capabilities for the step
    const capabilities = {
      step_name: stepName,
      available_validations: getValidationCapabilities(stepName),
      rate_limit: {
        requests_per_hour: AI_RATE_LIMIT,
        current_usage: requestCounts.get(user.id)?.count || 0
      },
      response_time_estimate: '2-5 segundos'
    };

    return new Response(JSON.stringify(capabilities), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error getting validation capabilities:", error);
    return handleUnknownError(error, 'AI Validation Capabilities');
  }
}

function getValidationCapabilities(stepName: string): string[] {
  const capabilities: Record<string, string[]> = {
    welcome: [
      'Coherencia experiencia-objetivo',
      'Realismo de urgencia',
      'Claridad del objetivo principal',
      'Potencial de éxito con OKRs'
    ],
    company: [
      'Coherencia industria-descripción',
      'Validación tamaño vs empleados',
      'Calidad de descripción',
      'Validación de sitio web'
    ],
    organization: [
      'Alineación desafíos-objetivos',
      'Realismo madurez OKR',
      'Coherencia organizacional',
      'Viabilidad de metas'
    ],
    preferences: [
      'Coherencia asistencia IA',
      'Alineación áreas de enfoque',
      'Realismo notificaciones',
      'Compatibilidad estilo comunicación'
    ],
    review: [
      'Completitud información',
      'Coherencia global',
      'Preparación para OKRs',
      'Identificación inconsistencias'
    ]
  };

  return capabilities[stepName] || ['Validación general'];
}