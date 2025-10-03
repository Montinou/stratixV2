'use server';

import { generateText, streamText, generateObject } from 'ai';
import { stackServerApp } from '@/stack/server';
import { withRLSContext } from '@/lib/database/rls-client';
import {
  aiUsageTracking,
  conversations,
  conversationMessages,
  aiInsights,
  knowledgeBase
} from '@/db/ai-schema';
import { profiles } from '@/db/okr-schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

/**
 * AI Gateway integration using Vercel AI Gateway
 * Implements economical model selection strategy
 * Uses Stack Auth for user context and follows template patterns
 *
 * Documentation: https://vercel.com/docs/ai-gateway
 */

// Vercel AI Gateway configuration with OIDC fallback
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const VERCEL_OIDC_TOKEN = process.env.VERCEL_OIDC_TOKEN;

if (!AI_GATEWAY_API_KEY && !VERCEL_OIDC_TOKEN) {
  console.warn('Neither AI_GATEWAY_API_KEY nor VERCEL_OIDC_TOKEN found. AI features may be limited.');
}

// Economical AI Model configurations with fallback hierarchy
// Using unified Vercel AI Gateway format: provider/model
// Prioritizing cost-effective models while maintaining quality
const ECONOMICAL_MODELS = {
  // Primary economical models (lowest cost, good performance)
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-3-5-haiku': 'anthropic/claude-3-5-haiku-20241022',

  // Secondary models (higher quality, higher cost - use only when needed)
  'gpt-4o': 'openai/gpt-4o',
  'claude-3-5-sonnet': 'anthropic/claude-3-5-sonnet-20241022',
} as const;

// Default economical model selection
const DEFAULT_ECONOMICAL_MODEL = 'gpt-4o-mini';
const DEFAULT_HIGH_QUALITY_MODEL = 'claude-3-5-haiku';

type AIModel = keyof typeof ECONOMICAL_MODELS;

export class AIGatewayService {

  /**
   * Generate text completion with usage tracking
   */
  static async generateCompletion(
    prompt: string,
    options: {
      model?: AIModel;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const { model = 'gpt-4o-mini', maxTokens = 1000, temperature = 0.7, systemPrompt } = options;

    const startTime = Date.now();

    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system' as const, content: systemPrompt });
      }
      messages.push({ role: 'user' as const, content: prompt });

      const result = await generateText({
        model: ECONOMICAL_MODELS[model],
        messages,
        maxTokens,
        temperature,
      });

      const responseTime = Date.now() - startTime;

      // Track usage
      await this.trackUsage({
        userId: user.id,
        operationType: 'text_generation',
        provider: model.startsWith('gpt') ? 'openai' : 'anthropic',
        model,
        tokensUsed: result.usage.totalTokens,
        responseTimeMs: responseTime,
      });

      return result;
    } catch (error) {
      console.error('Error en AI Gateway:', error);
      throw new Error('Error al generar completado');
    }
  }

  /**
   * Generate streaming text response
   */
  static async generateStreamingCompletion(
    prompt: string,
    options: {
      model?: AIModel;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const { model = 'gpt-4o-mini', maxTokens = 1000, temperature = 0.7, systemPrompt } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }
    messages.push({ role: 'user' as const, content: prompt });

    const startTime = Date.now();

    const result = streamText({
      model: ECONOMICAL_MODELS[model],
      messages,
      maxTokens,
      temperature,
      onFinish: async (result) => {
        const responseTime = Date.now() - startTime;

        // Track usage when stream finishes
        await this.trackUsage({
          userId: user.id,
          operationType: 'text_generation',
          provider: model.startsWith('gpt') ? 'openai' : 'anthropic',
          model,
          tokensUsed: result.usage.totalTokens,
          responseTimeMs: responseTime,
        });
      },
    });

    return result;
  }

  /**
   * Generate structured data using schema
   */
  static async generateStructuredData<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options: {
      model?: AIModel;
      systemPrompt?: string;
    } = {}
  ): Promise<T> {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const { model = 'gpt-4o-mini', systemPrompt } = options;

    const startTime = Date.now();

    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system' as const, content: systemPrompt });
      }
      messages.push({ role: 'user' as const, content: prompt });

      const result = await generateObject({
        model: ECONOMICAL_MODELS[model],
        messages,
        schema,
      });

      const responseTime = Date.now() - startTime;

      // Track usage
      await this.trackUsage({
        userId: user.id,
        operationType: 'text_generation',
        provider: model.startsWith('gpt') ? 'openai' : 'anthropic',
        model,
        tokensUsed: result.usage.totalTokens,
        responseTimeMs: responseTime,
      });

      return result.object;
    } catch (error) {
      console.error('Error en generación estructurada de AI Gateway:', error);
      throw new Error('Error al generar datos estructurados');
    }
  }

  /**
   * Create or continue conversation
   */
  static async chat(
    message: string,
    conversationId?: string,
    options: {
      model?: AIModel;
      context?: Record<string, any>;
    } = {}
  ) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
        with: {
          company: true,
          area: true
        },
      });
    });

    if (!userProfile) {
      throw new Error('Perfil de usuario no encontrado');
    }

    const { model = 'gpt-4o-mini', context = {} } = options;

    let conversation;

    // Get or create conversation using RLS
    if (conversationId) {
      conversation = await withRLSContext(user.id, async (db) => {
        return await db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId),
          with: { messages: { orderBy: [desc(conversationMessages.createdAt)] } },
        });
      });
    }

    if (!conversation) {
      // Create new conversation using RLS
      const [newConversation] = await withRLSContext(user.id, async (db) => {
        return await db.insert(conversations).values({
          userId: user.id,
          title: message.slice(0, 100) + '...',
          context: context,
          companyId: userProfile.companyId,
        }).returning();
      });

      conversation = { ...newConversation, messages: [] };
    }

    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: await this.buildSystemPrompt(userProfile, context),
      },
      // Add previous messages in correct order
      ...conversation.messages.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      // Add new user message
      { role: 'user' as const, content: message },
    ];

    const startTime = Date.now();

    try {
      const result = await generateText({
        model: ECONOMICAL_MODELS[model],
        messages,
        maxTokens: 2000,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;

      // Save user message using RLS
      await withRLSContext(user.id, async (db) => {
        await db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: 'user',
          content: message,
          companyId: userProfile.companyId
        });
      });

      // Save assistant response using RLS
      await withRLSContext(user.id, async (db) => {
        await db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: 'assistant',
          content: result.text,
          tokensUsed: result.usage.totalTokens,
          responseTimeMs: responseTime,
          companyId: userProfile.companyId
        });
      });

      // Update conversation using RLS
      await withRLSContext(user.id, async (db) => {
        await db.update(conversations)
          .set({
            lastMessageAt: new Date(),
            messageCount: conversation.messageCount + 2,
            tokensUsed: (conversation.tokensUsed || 0) + result.usage.totalTokens,
          })
          .where(eq(conversations.id, conversation.id));
      });

      // Track usage
      await this.trackUsage({
        userId: user.id,
        operationType: 'chat_completion',
        provider: model.startsWith('gpt') ? 'openai' : 'anthropic',
        model,
        tokensUsed: result.usage.totalTokens,
        responseTimeMs: responseTime,
      });

      return {
        conversationId: conversation.id,
        response: result.text,
        usage: result.usage,
      };
    } catch (error) {
      console.error('Error en chat de AI:', error);
      throw new Error('Error al generar respuesta de chat');
    }
  }

  /**
   * Generate insights for OKR data
   */
  static async generateInsights(data: {
    type: 'objective' | 'initiative' | 'activity' | 'general';
    entityId?: string;
    context: Record<string, any>;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
        with: {
          company: true,
          area: true
        },
      });
    });

    if (!userProfile) {
      throw new Error('Perfil de usuario no encontrado');
    }

    const systemPrompt = `
      Eres un asesor experto en OKRs. Analiza los datos proporcionados y genera insights accionables.
      Enfócate en:
      - Tendencias y patrones de rendimiento
      - Identificación de riesgos
      - Oportunidades de optimización
      - Recomendaciones estratégicas

      Proporciona insights que sean:
      - Específicos y accionables
      - Basados en datos
      - Relevantes para el rol del usuario (${userProfile.role})
      - Enfocados en análisis a nivel de ${data.type}
    `;

    const prompt = `
      Analiza estos datos de OKR y proporciona insights:

      Contexto: ${JSON.stringify(data.context, null, 2)}

      Genera insights específicos y recomendaciones.
    `;

    try {
      const result = await this.generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt,
        maxTokens: 1500,
      });

      // Save insight to database using RLS
      await withRLSContext(user.id, async (db) => {
        await db.insert(aiInsights).values({
          userId: user.id,
          title: `Análisis de ${data.type}`,
          content: result.text,
          category: 'performance',
          entityType: data.type,
          entityId: data.entityId,
          confidence: 85, // Could be calculated based on data quality
          isActionable: true,
          companyId: userProfile.companyId
        });
      });

      return {
        insight: result.text,
        category: 'performance',
        confidence: 85,
      };
    } catch (error) {
      console.error('Error al generar insights de AI:', error);
      throw new Error('Error al generar insights');
    }
  }

  /**
   * Build system prompt with user context
   */
  private static async buildSystemPrompt(
    userProfile: any,
    context: Record<string, any> = {}
  ): Promise<string> {
    const knowledge = await this.getRelevantKnowledge(userProfile.id, userProfile.companyId);

    return `
Eres StratixAI, un asistente experto en gestión de OKRs para ${userProfile.company?.name || 'la organización'}.

Contexto del Usuario:
- Nombre: ${userProfile.fullName}
- Rol: ${userProfile.role}
- Área: ${userProfile.area?.name || 'No asignada'}

Tus capacidades:
- Proporcionar orientación sobre metodología OKR
- Analizar datos de rendimiento y tendencias
- Sugerir mejoras y optimizaciones
- Ayudar con la definición y seguimiento de objetivos
- Ofrecer recomendaciones estratégicas

Base de Conocimiento:
${knowledge.map(k => `- ${k.title}: ${k.content}`).join('\n')}

Siempre proporciona:
- Recomendaciones accionables
- Insights basados en datos
- Orientación apropiada al rol del usuario
- Respuestas en español

Contexto actual: ${JSON.stringify(context, null, 2)}
    `.trim();
  }

  /**
   * Get relevant knowledge for user context
   */
  private static async getRelevantKnowledge(userId: string, companyId: string, limit = 5) {
    return await withRLSContext(userId, async (db) => {
      return await db.query.knowledgeBase.findMany({
        where: and(
          eq(knowledgeBase.isActive, true),
          eq(knowledgeBase.companyId, companyId)
        ),
        orderBy: [desc(knowledgeBase.priority)],
        limit,
      });
    });
  }

  /**
   * Track AI usage for analytics and billing
   */
  private static async trackUsage(data: {
    userId: string;
    operationType: 'text_generation' | 'chat_completion' | 'embedding' | 'analysis';
    provider: 'openai' | 'anthropic' | 'google' | 'vercel';
    model: string;
    tokensUsed: number;
    responseTimeMs: number;
    requestCost?: number;
  }) {
    const userProfile = await withRLSContext(data.userId, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, data.userId),
      });
    });

    if (!userProfile) return;

    try {
      await withRLSContext(data.userId, async (db) => {
        await db.insert(aiUsageTracking).values({
          userId: data.userId,
          operationType: data.operationType,
          provider: data.provider,
          model: data.model,
          tokensUsed: data.tokensUsed,
          requestCost: data.requestCost?.toString(),
          responseTimeMs: data.responseTimeMs,
          companyId: userProfile.companyId,
        });
      });
    } catch (error) {
      console.error('Error al rastrear uso de AI:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Get user's AI usage statistics
   */
  static async getUserUsageStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await withRLSContext(userId, async (db) => {
      return await db.query.aiUsageTracking.findMany({
        where: and(
          eq(aiUsageTracking.userId, userId),
          // Add date filter when available in schema
        ),
        orderBy: [desc(aiUsageTracking.createdAt)],
      });
    });

    const totalTokens = usage.reduce((sum, record) => sum + record.tokensUsed, 0);
    const totalRequests = usage.length;
    const avgResponseTime = usage.reduce((sum, record) => sum + (record.responseTimeMs || 0), 0) / totalRequests;

    return {
      totalTokens,
      totalRequests,
      avgResponseTime,
      usage,
    };
  }
}