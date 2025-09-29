import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import {
  getOnboardingSessionWithProgress,
  deleteOnboardingSession,
  updateOnboardingSession
} from "@/lib/database/onboarding-queries";
import { handleUnknownError } from "@/lib/api/error-handler";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const sessionId = params.id;

    // Get session with progress
    const sessionWithProgress = await getOnboardingSessionWithProgress(sessionId);
    if (!sessionWithProgress) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (sessionWithProgress.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Calculate additional metrics
    const completedSteps = sessionWithProgress.progress.filter(p => p.completed).length;
    const skippedSteps = sessionWithProgress.progress.filter(p => p.skipped).length;
    const totalTime = sessionWithProgress.progress
      .filter(p => p.completion_time)
      .reduce((total, p) => {
        const created = new Date(p.created_at).getTime();
        const completed = new Date(p.completion_time!).getTime();
        return total + (completed - created);
      }, 0);

    return new Response(JSON.stringify({
      ...sessionWithProgress,
      metrics: {
        completed_steps: completedSteps,
        skipped_steps: skippedSteps,
        remaining_steps: sessionWithProgress.total_steps - completedSteps,
        total_time_minutes: Math.round(totalTime / (1000 * 60)),
        estimated_remaining_minutes: (sessionWithProgress.total_steps - completedSteps) * 3
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
        'x-step-number': sessionWithProgress.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error fetching onboarding session:", error);
    return handleUnknownError(error, 'Fetch Onboarding Session');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const sessionId = params.id;

    // Verify session ownership
    const session = await getOnboardingSessionWithProgress(sessionId);
    if (!session) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (session.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Don't allow deletion of completed sessions
    if (session.status === 'completed') {
      return new Response("No se puede eliminar una sesión completada", { status: 400 });
    }

    // Mark as abandoned instead of hard delete to preserve analytics
    await updateOnboardingSession(sessionId, { status: 'abandoned' });

    return new Response(JSON.stringify({
      success: true,
      message: 'Sesión de onboarding marcada como abandonada'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error deleting onboarding session:", error);
    return handleUnknownError(error, 'Delete Onboarding Session');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const sessionId = params.id;
    const body = await request.json();

    // Verify session ownership
    const session = await getOnboardingSessionWithProgress(sessionId);
    if (!session) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (session.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Only allow updates to in_progress sessions
    if (session.status !== 'in_progress') {
      return new Response("Solo se pueden actualizar sesiones en progreso", { status: 400 });
    }

    // Validate allowed fields
    const allowedFields = ['current_step', 'form_data', 'ai_suggestions', 'ai_analysis'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response("No hay campos válidos para actualizar", { status: 400 });
    }

    // Update session
    const updatedSession = await updateOnboardingSession(sessionId, updates);

    return new Response(JSON.stringify(updatedSession), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      }
    });

  } catch (error) {
    console.error("Error updating onboarding session:", error);
    return handleUnknownError(error, 'Update Onboarding Session');
  }
}