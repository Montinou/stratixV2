import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stackServerApp } from '@/stack/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// AI Gateway configuration
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;

const openaiGateway = createOpenAI({
  apiKey: AI_GATEWAY_API_KEY,
  baseURL: 'https://gateway.vercel.app/openai',
});

// Validation schema
const enhanceTextSchema = z.object({
  text: z.string().min(1, 'El texto es requerido').max(5000, 'El texto es demasiado largo'),
  context: z.enum(['organization_description', 'objective', 'key_result', 'initiative', 'general']),
  organizationName: z.string().optional(),
  additionalContext: z.record(z.any()).optional(),
});

/**
 * POST /api/ai/enhance-text
 * Enhance text using AI for better clarity and professionalism
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser({ or: 'redirect' });

    // Parse and validate request body
    const body = await request.json();
    const validation = enhanceTextSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { text, context, organizationName, additionalContext = {} } = validation.data;

    // Build context-specific system prompt
    const systemPrompts: Record<string, string> = {
      organization_description: `Eres un experto en comunicación corporativa. Tu tarea es mejorar la descripción de una organización haciéndola más profesional, clara y atractiva.

Reglas:
- Mantén la esencia y el mensaje original
- Mejora la claridad y profesionalismo
- Usa lenguaje inspirador pero auténtico
- Mantén un tono profesional pero accesible
- Límite: máximo 200 palabras
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`,

      objective: `Eres un experto en OKRs (Objectives and Key Results). Tu tarea es mejorar la redacción de un objetivo para que sea más claro, inspirador y medible.

Reglas:
- El objetivo debe ser ambicioso pero alcanzable
- Debe inspirar y motivar al equipo
- Debe ser claro y fácil de entender
- Mantén la intención original
- Límite: máximo 100 palabras
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`,

      key_result: `Eres un experto en OKRs. Tu tarea es mejorar la redacción de un resultado clave para que sea específico, medible y con plazos claros.

Reglas:
- Debe ser completamente medible
- Debe incluir métricas específicas
- Debe tener un plazo claro o implícito
- Mantén la métrica original si existe
- Límite: máximo 50 palabras
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`,

      initiative: `Eres un experto en gestión de proyectos. Tu tarea es mejorar la descripción de una iniciativa haciéndola más clara y accionable.

Reglas:
- Debe describir claramente la acción a tomar
- Debe ser específica y accionable
- Mantén el propósito original
- Límite: máximo 100 palabras
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`,

      general: `Eres un experto en redacción profesional. Tu tarea es mejorar el texto haciéndolo más claro, conciso y profesional.

Reglas:
- Mantén la intención original
- Mejora la claridad y estructura
- Usa lenguaje profesional
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`,
    };

    const systemPrompt = systemPrompts[context] || systemPrompts.general;

    // Build user prompt with context
    let userPrompt = `Texto original: "${text}"`;

    if (organizationName) {
      userPrompt += `\n\nNombre de la organización: ${organizationName}`;
    }

    if (Object.keys(additionalContext).length > 0) {
      userPrompt += `\n\nContexto adicional: ${JSON.stringify(additionalContext)}`;
    }

    userPrompt += '\n\nPor favor, mejora este texto siguiendo las reglas establecidas.';

    // Generate enhanced text using AI Gateway
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const result = await generateText({
      model: openaiGateway('gpt-4o-mini'),
      messages,
      maxTokens: 500,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      enhancedText: result.text.trim(),
      originalText: text,
      context,
      usage: {
        tokens: result.usage.totalTokens,
        model: 'gpt-4o-mini',
      },
    });
  } catch (error) {
    console.error('Error al mejorar texto con AI:', error);

    return NextResponse.json(
      {
        error: 'Error al mejorar el texto',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
