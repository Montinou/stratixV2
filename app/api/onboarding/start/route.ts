import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  createOnboardingSession,
  getUserActiveSession,
  updateOnboardingSession,
  createOnboardingProgress
} from "@/lib/database/onboarding-queries";
import type {
  CreateOnboardingSessionResponse
} from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";
import {
  TOTAL_STEPS,
  getStepInfo,
  getStepName
} from "@/lib/config/onboarding-config";

export const runtime = 'nodejs';

// Request validation schema
const startOnboardingSchema = z.object({
  user_preferences: z.object({
    language: z.enum(['es', 'en']).default('es'),
    communication_style: z.enum(['formal', 'informal']).default('formal'),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')
  }).optional(),
  context: z.object({
    source: z.string().optional(),
    utm_params: z.record(z.string()).optional()
  }).optional(),
  restart: z.boolean().default(false)
});

// Step configurations are now imported from centralized config

function generateAIGreeting(userPreferences: any, experienceLevel: string): string {
  const style = userPreferences?.communication_style || 'formal';
  const lang = userPreferences?.language || 'es';

  if (lang === 'en') {
    return style === 'formal'
      ? `Welcome to StratixV2! I'll help you set up your OKR management system. Based on your ${experienceLevel} experience level, I'll provide appropriate guidance throughout the process.`
      : `Hey there! 👋 Welcome to StratixV2! I'm here to help you get started with OKRs. Don't worry if you're ${experienceLevel === 'none' ? 'new to this' : 'still learning'} - we'll make it easy!`;
  }

  return style === 'formal'
    ? `Bienvenido a StratixV2. Le ayudaré a configurar su sistema de gestión de OKRs. Basándome en su nivel de experiencia ${experienceLevel}, proporcionaré la orientación adecuada durante todo el proceso.`
    : `¡Hola! 👋 ¡Bienvenido a StratixV2! Estoy aquí para ayudarte a empezar con los OKRs. ${experienceLevel === 'none' ? 'No te preocupes si es tu primera vez' : 'Tranquilo si aún estás aprendiendo'} - ¡lo haremos fácil!`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = startOnboardingSchema.parse(body);

    const { user_preferences, context, restart } = validatedRequest;

    // Check for existing active session
    let existingSession = null;
    if (!restart) {
      existingSession = await getUserActiveSession(user.id);
    }

    let session;
    if (existingSession && !restart) {
      // Resume existing session
      session = existingSession;
    } else {
      // Create new session (or restart)
      if (existingSession && restart) {
        // Mark existing session as abandoned
        await updateOnboardingSession(existingSession.id, { status: 'abandoned' });
      }

      // Create new session
      session = await createOnboardingSession(user.id, TOTAL_STEPS);

      // Initialize first step
      await createOnboardingProgress(
        session.id,
        1,
        getStepName(1),
        {},
        false,
        false
      );

      // Store user preferences in session if provided
      if (user_preferences || context) {
        await updateOnboardingSession(session.id, {
          form_data: {
            user_preferences,
            context
          }
        });
      }
    }

    // Get current step info
    const currentStep = getStepInfo(session.current_step);
    if (!currentStep) {
      throw new Error('Invalid step number');
    }

    // Generate AI greeting
    const experienceLevel = user_preferences?.experience_level || 'beginner';
    const aiGreeting = generateAIGreeting(user_preferences, experienceLevel);

    const response: CreateOnboardingSessionResponse = {
      session,
      next_step: currentStep,
      ai_greeting: aiGreeting
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': session.id,
        'x-step-number': session.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error starting onboarding:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'Onboarding Start');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get user's active session
    const activeSession = await getUserActiveSession(user.id);

    if (!activeSession) {
      return new Response(JSON.stringify({
        has_active_session: false,
        message: 'No hay sesión de onboarding activa'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current step info
    const currentStep = getStepInfo(activeSession.current_step);

    return new Response(JSON.stringify({
      has_active_session: true,
      session: activeSession,
      next_step: currentStep
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': activeSession.id,
        'x-step-number': activeSession.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return handleUnknownError(error, 'Onboarding Status');
  }
}