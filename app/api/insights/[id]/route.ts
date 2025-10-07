import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { withRLSContext } from '@/lib/database/rls-client';
import { aiInsights } from '@/db/ai-schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/insights/[id]
 *
 * Actualiza un insight (marcar como leído, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { isRead } = await request.json();

    // Actualizar insight
    const updated = await withRLSContext(user.id, async (db) => {
      const [insight] = await db
        .update(aiInsights)
        .set({ isRead })
        .where(eq(aiInsights.id, params.id))
        .returning();

      return insight;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Insight no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      insight: updated,
    });
  } catch (error) {
    console.error('[API: Insights] Error updating insight:', error);

    return NextResponse.json(
      {
        error: 'Error al actualizar insight',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/insights/[id]
 *
 * Elimina un insight
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Eliminar insight
    await withRLSContext(user.id, async (db) => {
      await db.delete(aiInsights).where(eq(aiInsights.id, params.id));
    });

    return NextResponse.json({
      success: true,
      message: 'Insight eliminado',
    });
  } catch (error) {
    console.error('[API: Insights] Error deleting insight:', error);

    return NextResponse.json(
      {
        error: 'Error al eliminar insight',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
