'use server';

import { generateText, streamText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { stackServerApp } from '@/stack/server';
import db from '@/db';
import {
  aiUsageTracking,
  conversations,
  conversationMessages,
  aiInsights,
  knowledgeBase
} from '@/db/ai-schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

/**
 * AI Gateway integration adapted for internal tooling template
 * Uses Stack Auth for user context and follows template patterns
 */

// AI Model configurations
const AI_MODELS = {
  'gpt-4o': openai('gpt-4o'),
  'gpt-4o-mini': openai('gpt-4o-mini'),
  'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
  'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022'),
} as const;

type AIModel = keyof typeof AI_MODELS;

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
        model: AI_MODELS[model],
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
      console.error('AI Gateway error:', error);
      throw new Error('Failed to generate completion');
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
      model: AI_MODELS[model],
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
        model: AI_MODELS[model],
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
      console.error('AI Gateway structured generation error:', error);
      throw new Error('Failed to generate structured data');
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
    const userProfile = await db.query.profiles.findFirst({
      where: eq(db.profiles?.userId, user.id),
      with: { company: true },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const { model = 'gpt-4o-mini', context = {} } = options;

    let conversation;

    // Get or create conversation
    if (conversationId) {
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: { messages: { orderBy: [desc(conversationMessages.createdAt)] } },
      });
    }

    if (!conversation) {
      // Create new conversation
      const [newConversation] = await db.insert(conversations).values({
        userId: user.id,
        title: message.slice(0, 100) + '...',
        context: context,
        companyId: userProfile.companyId,
        tenantId: userProfile.tenantId,
      }).returning();

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
        model: AI_MODELS[model],
        messages,
        maxTokens: 2000,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;

      // Save user message
      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        role: 'user',
        content: message,
        companyId: userProfile.companyId,
        tenantId: userProfile.tenantId,
      });

      // Save assistant response
      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        role: 'assistant',
        content: result.text,
        tokensUsed: result.usage.totalTokens,
        responseTimeMs: responseTime,
        companyId: userProfile.companyId,
        tenantId: userProfile.tenantId,
      });

      // Update conversation
      await db.update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: conversation.messageCount + 2,
          tokensUsed: (conversation.tokensUsed || 0) + result.usage.totalTokens,
        })
        .where(eq(conversations.id, conversation.id));

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
      console.error('AI Chat error:', error);
      throw new Error('Failed to generate chat response');
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
    const userProfile = await db.query.profiles.findFirst({
      where: eq(db.profiles?.userId, user.id),
      with: { company: true },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const systemPrompt = `
      You are an expert OKR advisor. Analyze the provided data and generate actionable insights.
      Focus on:
      - Performance trends and patterns
      - Risk identification
      - Optimization opportunities
      - Strategic recommendations

      Provide insights that are:
      - Specific and actionable
      - Data-driven
      - Relevant to the user's role (${userProfile.roleType})
      - Focused on ${data.type} level analysis
    `;

    const prompt = `
      Analyze this OKR data and provide insights:

      Context: ${JSON.stringify(data.context, null, 2)}

      Generate specific insights and recommendations.
    `;

    try {
      const result = await this.generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt,
        maxTokens: 1500,
      });

      // Save insight to database
      await db.insert(aiInsights).values({
        userId: user.id,
        title: `${data.type} Analysis Insight`,
        content: result.text,
        category: 'performance',
        entityType: data.type,
        entityId: data.entityId,
        confidence: 85, // Could be calculated based on data quality
        isActionable: true,
        companyId: userProfile.companyId,
        tenantId: userProfile.tenantId,
      });

      return {
        insight: result.text,
        category: 'performance',
        confidence: 85,
      };
    } catch (error) {
      console.error('AI Insights generation error:', error);
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Build system prompt with user context
   */
  private static async buildSystemPrompt(
    userProfile: any,
    context: Record<string, any> = {}
  ): Promise<string> {
    const knowledge = await this.getRelevantKnowledge(userProfile.companyId);

    return `
You are StratixAI, an expert OKR management assistant for ${userProfile.company?.name || 'the organization'}.

User Context:
- Name: ${userProfile.fullName}
- Role: ${userProfile.roleType}
- Department: ${userProfile.department}

Your capabilities:
- Provide OKR methodology guidance
- Analyze performance data and trends
- Suggest improvements and optimizations
- Help with goal setting and tracking
- Offer strategic recommendations

Knowledge Base:
${knowledge.map(k => `- ${k.title}: ${k.content}`).join('\n')}

Always provide:
- Actionable recommendations
- Data-driven insights
- Role-appropriate guidance
- Spanish language responses (the organization operates in Spanish)

Current context: ${JSON.stringify(context, null, 2)}
    `.trim();
  }

  /**
   * Get relevant knowledge for user context
   */
  private static async getRelevantKnowledge(companyId: string, limit = 5) {
    return await db.query.knowledgeBase.findMany({
      where: and(
        eq(knowledgeBase.isActive, true),
        eq(knowledgeBase.companyId, companyId)
      ),
      orderBy: [desc(knowledgeBase.priority)],
      limit,
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
    const userProfile = await db.query.profiles.findFirst({
      where: eq(db.profiles?.userId, data.userId),
    });

    if (!userProfile) return;

    try {
      await db.insert(aiUsageTracking).values({
        userId: data.userId,
        operationType: data.operationType,
        provider: data.provider,
        model: data.model,
        tokensUsed: data.tokensUsed,
        requestCost: data.requestCost?.toString(),
        responseTimeMs: data.responseTimeMs,
        companyId: userProfile.companyId,
        tenantId: userProfile.tenantId,
      });
    } catch (error) {
      console.error('Failed to track AI usage:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Get user's AI usage statistics
   */
  static async getUserUsageStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await db.query.aiUsageTracking.findMany({
      where: and(
        eq(aiUsageTracking.userId, userId),
        // Add date filter when available in schema
      ),
      orderBy: [desc(aiUsageTracking.createdAt)],
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