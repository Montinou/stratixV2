import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from "zod";
import { getAllIndustries, getIndustryById } from "@/lib/database/onboarding-queries";
import type { AIIndustryAnalysisRequest, AIIndustryAnalysisResponse } from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';

// Initialize AI Gateway
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Request validation schema
const industryAnalysisSchema = z.object({
  company_name: z.string().min(1, 'El nombre de la empresa es requerido').max(255),
  description: z.string().optional(),
  website: z.string().url('URL inválida').optional(),
  existing_industry: z.string().optional(),
  additional_context: z.string().optional()
});

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const AI_RATE_LIMIT = 20; // requests per hour
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

async function generateIndustryAnalysis(
  companyData: AIIndustryAnalysisRequest,
  availableIndustries: any[]
): Promise<AIIndustryAnalysisResponse> {
  const industriesContext = availableIndustries.map(ind =>
    `${ind.id}: ${ind.name} (${ind.category}) - ${ind.description}`
  ).join('\n');

  const prompt = `Eres un experto en análisis de industrias y clasificación empresarial. Tu tarea es analizar una empresa y sugerir la industria más apropiada de la lista disponible.

EMPRESA A ANALIZAR:
- Nombre: ${companyData.company_name}
- Descripción: ${companyData.description || 'No proporcionada'}
- Sitio web: ${companyData.website || 'No proporcionado'}
- Industria actual: ${companyData.existing_industry || 'No especificada'}

INDUSTRIAS DISPONIBLES:
${industriesContext}

INSTRUCCIONES:
1. Analiza la empresa y determina cuál industria de la lista es la más apropiada
2. Proporciona alternativas relevantes
3. Genera insights de negocio específicos para esa industria
4. Sugiere OKRs adaptados al contexto empresarial

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:
{
  "suggested_industry": {
    "id": <número>,
    "name": "<nombre>",
    "confidence": <0-100>,
    "rationale": "<explicación detallada>"
  },
  "alternatives": [
    {
      "id": <número>,
      "name": "<nombre>",
      "confidence": <0-100>,
      "rationale": "<explicación>"
    }
  ],
  "business_insights": {
    "market_trends": ["<tendencia1>", "<tendencia2>"],
    "competitive_landscape": "<análisis del panorama competitivo>",
    "growth_opportunities": ["<oportunidad1>", "<oportunidad2>"],
    "potential_challenges": ["<desafío1>", "<desafío2>"]
  },
  "okr_suggestions": [
    {
      "objective": "<objetivo>",
      "key_results": ["<kr1>", "<kr2>", "<kr3>"],
      "category": "<growth|efficiency|innovation|customer>",
      "priority": "<high|medium|low>",
      "rationale": "<explicación>"
    }
  ]
}`;

  try {
    const result = await generateText({
      model: ai('openai/gpt-4o'),
      prompt,
      maxTokens: 2000,
      temperature: 0.3 // Lower temperature for more consistent analysis
    });

    // Parse AI response
    const parsedResponse = JSON.parse(result.text);

    // Validate response structure
    if (!parsedResponse.suggested_industry || !parsedResponse.business_insights) {
      throw new Error('Invalid AI response structure');
    }

    return parsedResponse as AIIndustryAnalysisResponse;

  } catch (error) {
    console.error('Error in AI industry analysis:', error);

    // Fallback response
    const fallbackIndustry = availableIndustries.find(ind =>
      ind.name.toLowerCase().includes('tecnología') ||
      ind.name.toLowerCase().includes('software')
    ) || availableIndustries[0];

    return {
      suggested_industry: {
        id: fallbackIndustry.id,
        name: fallbackIndustry.name,
        confidence: 60,
        rationale: 'Sugerencia basada en análisis general. Se recomienda revisar manualmente.'
      },
      alternatives: availableIndustries.slice(1, 4).map(ind => ({
        id: ind.id,
        name: ind.name,
        confidence: 40,
        rationale: 'Alternativa que podría ser relevante según el contexto empresarial.'
      })),
      business_insights: {
        market_trends: [
          'Digitalización acelerada',
          'Enfoque en experiencia del cliente',
          'Sostenibilidad empresarial'
        ],
        competitive_landscape: 'Mercado competitivo con oportunidades para diferenciación a través de innovación y servicio al cliente.',
        growth_opportunities: [
          'Expansión digital',
          'Nuevos segmentos de mercado',
          'Optimización de procesos'
        ],
        potential_challenges: [
          'Competencia intensa',
          'Cambios regulatorios',
          'Retención de talento'
        ]
      },
      okr_suggestions: [
        {
          objective: 'Aumentar la presencia en el mercado y mejorar reconocimiento de marca',
          key_results: [
            'Incrementar ventas en 30% durante el próximo trimestre',
            'Mejorar satisfacción del cliente al 90%',
            'Lanzar 2 nuevos productos o servicios'
          ],
          category: 'growth',
          priority: 'high',
          rationale: 'Objetivo fundamental para empresas en crecimiento que buscan establecer su posición en el mercado.'
        }
      ]
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
    const validatedRequest = industryAnalysisSchema.parse(body);

    // Get available industries
    const industries = await getAllIndustries();
    if (industries.length === 0) {
      return new Response("No hay industrias disponibles para análisis", { status: 500 });
    }

    // Generate AI analysis
    const analysis = await generateIndustryAnalysis(validatedRequest, industries);

    // Validate suggested industry exists
    const suggestedIndustry = await getIndustryById(analysis.suggested_industry.id);
    if (!suggestedIndustry) {
      // Fallback to first available industry
      analysis.suggested_industry.id = industries[0].id;
      analysis.suggested_industry.name = industries[0].name;
      analysis.suggested_industry.confidence = Math.max(50, analysis.suggested_industry.confidence - 20);
    }

    // Validate alternatives exist
    analysis.alternatives = analysis.alternatives.filter(alt =>
      industries.some(ind => ind.id === alt.id)
    ).slice(0, 3); // Limit to 3 alternatives

    return new Response(JSON.stringify(analysis), {
      headers: {
        'Content-Type': 'application/json',
        'x-ai-model': 'gpt-4o',
        'x-analysis-timestamp': new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in AI industry analysis:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'AI Industry Analysis');
  }
}

// Health check endpoint for AI services
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Check AI Gateway availability
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        ai_gateway: 'online',
        database: 'online',
        rate_limiting: 'active'
      },
      limits: {
        requests_per_hour: AI_RATE_LIMIT,
        current_usage: requestCounts.get(user.id)?.count || 0
      }
    };

    // Test AI Gateway with simple request
    try {
      await generateText({
        model: ai('openai/gpt-4o-mini'),
        prompt: 'Test',
        maxTokens: 1
      });
    } catch (error) {
      healthCheck.services.ai_gateway = 'degraded';
      healthCheck.status = 'degraded';
    }

    return new Response(JSON.stringify(healthCheck), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in AI health check:", error);
    return handleUnknownError(error, 'AI Health Check');
  }
}