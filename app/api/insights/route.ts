import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { withRLSContext } from '@/lib/database/rls-client';
import { aiInsights, conversations } from '@/db/ai-schema';
import { profiles } from '@/db/okr-schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/insights
 *
 * Obtiene insights de IA para el usuario actual
 * Incluye insights generados automáticamente y conversaciones activas
 */
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener perfil del usuario
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      });
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Obtener insights del usuario
    const userInsights = await withRLSContext(user.id, async (db) => {
      return await db.query.aiInsights.findMany({
        where: and(eq(aiInsights.userId, user.id), eq(aiInsights.companyId, userProfile.companyId)),
        orderBy: [desc(aiInsights.generatedAt)],
        limit: 20,
      });
    });

    // Obtener conversaciones del usuario
    const userConversations = await withRLSContext(user.id, async (db) => {
      return await db.query.conversations.findMany({
        where: and(
          eq(conversations.userId, user.id),
          eq(conversations.companyId, userProfile.companyId)
        ),
        orderBy: [desc(conversations.lastMessageAt)],
        limit: 10,
        with: {
          messages: {
            orderBy: [desc(conversations.lastMessageAt)],
            limit: 1,
          },
        },
      });
    });

    // Calcular estadísticas
    const stats = {
      dailyInsights: userInsights.filter((i) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return i.generatedAt >= today;
      }).length,
      actionableInsights: userInsights.filter((i) => i.isActionable && !i.isRead).length,
      activeConversations: userConversations.filter((c) => c.messageCount > 0).length,
    };

    // Formatear insights para la UI
    const formattedInsights = userInsights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      content: insight.content,
      category: insight.category,
      confidence: insight.confidence ? Number(insight.confidence) : 0,
      isActionable: insight.isActionable,
      isRead: insight.isRead,
      entityType: insight.entityType,
      entityId: insight.entityId,
      generatedAt: insight.generatedAt.toISOString(),
    }));

    // Formatear conversaciones para la UI
    const formattedConversations = userConversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.messages[0]?.content || 'Sin mensajes',
      messageCount: conv.messageCount,
      lastMessageAt: conv.lastMessageAt?.toISOString(),
      mood: conv.mood,
    }));

    return NextResponse.json({
      success: true,
      stats,
      insights: formattedInsights,
      conversations: formattedConversations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API: Insights] Error:', error);

    return NextResponse.json(
      {
        error: 'Error al obtener insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
