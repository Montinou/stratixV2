import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  getOnboardingSessionWithProgress,
  completeOnboardingSession,
  createOrganization,
  addOrganizationMember,
  getIndustryById
} from "@/lib/database/onboarding-queries";
import { ProfilesService } from "@/lib/database/services";
import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
  OnboardingFormData
} from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request validation schemas
const completeOnboardingSchema = z.object({
  session_id: z.string().uuid('ID de sesión inválido'),
  final_data: z.record(z.any()).optional(),
  create_organization: z.boolean().default(true)
});

// Simple completion schema for direct frontend integration
const simpleCompletionSchema = z.object({
  data: z.object({
    welcome: z.object({
      role: z.string(),
      customRole: z.string().optional(),
      experienceLevel: z.string()
    }).optional(),
    company: z.object({
      name: z.string(),
      industry: z.string(),
      size: z.string(),
      description: z.string().optional()
    }).optional(),
    organization: z.object({
      teamSize: z.number(),
      structure: z.string(),
      methodology: z.string(),
      collaborationStyle: z.string(),
      departments: z.array(z.string()).optional()
    }).optional()
  })
});

function generateAISummary(formData: OnboardingFormData, industry?: any): string {
  const welcome = formData.welcome;
  const company = formData.company;
  const organization = formData.organization;
  const preferences = formData.preferences;

  const experienceLevel = welcome?.experience_with_okr || 'none';
  const companySize = company?.company_size || 'startup';
  const urgency = welcome?.urgency_level || 'medium';
  const industryName = industry?.name || 'tecnología';

  let summary = `¡Felicitaciones, ${welcome?.full_name}! Has completado exitosamente la configuración inicial de StratixV2.`;

  // Add context-specific insights
  if (experienceLevel === 'none') {
    summary += ` Como esta es tu primera experiencia con OKRs, he preparado una guía paso a paso que te ayudará a comenzar de manera gradual.`;
  } else if (experienceLevel === 'advanced') {
    summary += ` Con tu experiencia avanzada en OKRs, tienes acceso a todas las características avanzadas desde el inicio.`;
  }

  if (companySize === 'startup') {
    summary += ` Para startups como ${company?.company_name}, es crucial mantener flexibilidad mientras se mantiene el enfoque en resultados clave.`;
  } else if (companySize === 'corporacion') {
    summary += ` Para organizaciones grandes como ${company?.company_name}, la alineación entre equipos será fundamental para el éxito.`;
  }

  if (urgency === 'high') {
    summary += ` He notado que tienes alta urgencia, por lo que priorizaré configuraciones que te permitan ver resultados rápidamente.`;
  }

  summary += ` Tu empresa en el sector ${industryName} tiene características únicas que he considerado en las recomendaciones.`;

  return summary;
}

function generateRecommendedOKRs(formData: OnboardingFormData, industry?: any): Array<{
  objective: string;
  key_results: string[];
  rationale: string;
}> {
  const company = formData.company;
  const organization = formData.organization;
  const companySize = company?.company_size || 'startup';
  const challenges = organization?.current_challenges || [];
  const goals = organization?.business_goals || [];
  const industryName = industry?.name || 'tecnología';

  const recommendations = [];

  // Growth-focused OKR based on business goals
  if (goals.includes('revenue_growth') || goals.includes('market_expansion')) {
    if (companySize === 'startup') {
      recommendations.push({
        objective: "Acelerar el crecimiento de ingresos y base de clientes",
        key_results: [
          "Aumentar ingresos mensuales recurrentes (MRR) en 100%",
          "Adquirir 50 nuevos clientes activos",
          "Reducir el costo de adquisición de clientes (CAC) en 25%"
        ],
        rationale: `Para startups en ${industryName}, el crecimiento acelerado es fundamental. Este OKR equilibra crecimiento con eficiencia.`
      });
    } else {
      recommendations.push({
        objective: "Expandir presencia en el mercado y aumentar ingresos",
        key_results: [
          "Incrementar ingresos en 40% comparado con el trimestre anterior",
          "Lanzar en 2 nuevos mercados geográficos",
          "Mejorar tasa de conversión de leads en 30%"
        ],
        rationale: `Para empresas establecidas en ${industryName}, la expansión sostenible es clave para mantener competitividad.`
      });
    }
  }

  // Operational efficiency OKR based on challenges
  if (challenges.includes('execution') || challenges.includes('resources') || goals.includes('operational_efficiency')) {
    recommendations.push({
      objective: "Optimizar procesos operativos y eficiencia del equipo",
      key_results: [
        "Reducir tiempo de entrega de proyectos en 30%",
        "Automatizar 80% de tareas repetitivas",
        "Aumentar satisfacción del equipo a 4.5/5"
      ],
      rationale: "La eficiencia operativa mejora tanto la productividad como la moral del equipo, creando un círculo virtuoso de rendimiento."
    });
  }

  // Customer-focused OKR
  if (goals.includes('customer_satisfaction') || challenges.includes('communication')) {
    if (industryName.toLowerCase().includes('tecnología') || industryName.toLowerCase().includes('software')) {
      recommendations.push({
        objective: "Elevar la experiencia y satisfacción del cliente",
        key_results: [
          "Alcanzar NPS (Net Promoter Score) de 70+",
          "Reducir tiempo de respuesta de soporte a < 2 horas",
          "Implementar 3 mejoras solicitadas por clientes"
        ],
        rationale: "En tecnología, la experiencia del cliente diferencia productos similares y genera lealtad a largo plazo."
      });
    } else {
      recommendations.push({
        objective: "Fortalecer relaciones con clientes y aumentar retención",
        key_results: [
          "Aumentar tasa de retención de clientes al 90%",
          "Implementar programa de feedback mensual",
          "Reducir quejas de clientes en 50%"
        ],
        rationale: "La retención de clientes es más rentable que la adquisición y fortalece la base de ingresos."
      });
    }
  }

  // Innovation/Product development OKR
  if (goals.includes('product_development') || goals.includes('innovation')) {
    recommendations.push({
      objective: "Acelerar innovación y desarrollo de productos",
      key_results: [
        "Lanzar 2 características principales solicitadas por usuarios",
        "Reducir tiempo de desarrollo de features en 40%",
        "Alcanzar 95% de adopción de nuevas características"
      ],
      rationale: "La innovación continua mantiene relevancia en el mercado y satisface necesidades evolutivas de los clientes."
    });
  }

  // Team development OKR based on challenges
  if (challenges.includes('culture') || goals.includes('team_development') || challenges.includes('alignment')) {
    recommendations.push({
      objective: "Desarrollar capacidades del equipo y cultura organizacional",
      key_results: [
        "100% del equipo completa plan de desarrollo individual",
        "Implementar 1-on-1s semanales con 95% de cumplimiento",
        "Mejorar alineación organizacional a 4.2/5 en encuesta"
      ],
      rationale: "El desarrollo del equipo es la base de todos los demás logros organizacionales y mejora la retención de talento."
    });
  }

  // Return top 3-4 most relevant recommendations
  return recommendations.slice(0, Math.min(4, recommendations.length));
}

function generateNextSteps(formData: OnboardingFormData): string[] {
  const welcome = formData.welcome;
  const preferences = formData.preferences;
  const review = formData.review;

  const experienceLevel = welcome?.experience_with_okr || 'none';
  const aiAssistance = preferences?.ai_assistance_level || 'moderate';
  const setupDemo = review?.setup_demo;
  const inviteTeam = review?.invite_team_members;

  const steps = [];

  // Experience-based next steps
  if (experienceLevel === 'none') {
    steps.push("📚 Revisa la guía 'OKRs para Principiantes' en tu dashboard");
    steps.push("🎯 Define tu primer objetivo usando la plantilla sugerida");
  } else if (experienceLevel === 'advanced') {
    steps.push("⚡ Configura integraciones avanzadas en Configuración > Integraciones");
    steps.push("📊 Personaliza tu dashboard con métricas específicas");
  } else {
    steps.push("🔍 Explora los OKRs sugeridos y personalízalos según tu contexto");
    steps.push("📈 Configura tus primeras métricas de seguimiento");
  }

  // AI assistance based steps
  if (aiAssistance === 'extensive') {
    steps.push("🤖 Activa notificaciones de IA para obtener sugerencias proactivas");
  }

  // Demo setup
  if (setupDemo === 'yes') {
    steps.push("📅 Un especialista te contactará en 24-48 horas para agendar tu demo personalizada");
  }

  // Team invitation
  if (inviteTeam === 'immediately' || inviteTeam === 'soon') {
    steps.push("👥 Invita a tu equipo usando el botón 'Invitar Miembros' en tu dashboard");
    steps.push("🔐 Configura permisos y roles para cada miembro del equipo");
  }

  // General next steps
  steps.push("✅ Crea tu primer OKR siguiendo las recomendaciones personalizadas");
  steps.push("📝 Programa tu primera revisión semanal de progreso");
  steps.push("🎯 Explora la biblioteca de plantillas de OKRs para tu industria");

  // Return top 6 steps to avoid overwhelming
  return steps.slice(0, 6);
}

async function handleSimpleCompletion(body: any, stackUser: any) {
  try {
    // Validate the simple completion data
    const validatedData = simpleCompletionSchema.parse(body);
    const { data } = validatedData;

    // Using standard Neon Auth approach - user data comes from neon_auth.users_sync
    // No need to manage users table, Stack Auth handles this automatically

    // Check if user already has a profile to avoid duplication
    const existingProfile = await ProfilesService.getByUserId(stackUser.id);
    if (existingProfile) {
      return new Response(JSON.stringify({
        success: true,
        message: "Profile already exists",
        profile: existingProfile
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let companyId: string | null = null;

    // Create a basic company if company data is provided
    if (data.company?.name) {
      const { CompaniesService } = await import("@/lib/database/services");
      const company = await CompaniesService.create({
        name: data.company.name,
        industry: data.company.industry,
        size: data.company.size,
        description: data.company.description
      });
      companyId = company.id;
    }

    // Create user profile using Stack Auth user ID directly (Neon Auth standard pattern)
    const profile = await ProfilesService.create({
      userId: stackUser.id,
      fullName: stackUser.displayName || stackUser.primaryEmail || "User",
      roleType: mapRoleToUserRole(data.welcome?.role || "individual"),
      department: data.organization?.departments?.[0] || "General",
      companyId: companyId || "" // Use empty string if no company
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Onboarding completed successfully",
      profile,
      company_id: companyId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in simple completion:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to complete onboarding"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function mapRoleToUserRole(role: string): "corporativo" | "gerente" | "empleado" {
  switch (role) {
    case "ceo":
    case "custom":
      return "corporativo";
    case "manager":
    case "team_lead":
      return "gerente";
    case "individual":
    default:
      return "empleado";
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Check if this is a simple completion or session-based completion
    if (body.data && !body.session_id) {
      return await handleSimpleCompletion(body, user);
    }

    // Handle traditional session-based completion
    const validatedRequest = completeOnboardingSchema.parse(body);
    const { session_id, final_data, create_organization } = validatedRequest;

    // Get session with progress
    const sessionWithProgress = await getOnboardingSessionWithProgress(session_id);
    if (!sessionWithProgress) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (sessionWithProgress.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    if (sessionWithProgress.status !== 'in_progress') {
      return new Response("La sesión de onboarding ya está completada", { status: 400 });
    }

    // Verify all steps are completed
    const completedSteps = sessionWithProgress.progress.filter(p => p.completed).length;
    if (completedSteps < sessionWithProgress.total_steps) {
      return new Response(
        `Faltan ${sessionWithProgress.total_steps - completedSteps} pasos por completar`,
        { status: 400 }
      );
    }

    // Extract form data from session
    const formData: OnboardingFormData = sessionWithProgress.form_data as OnboardingFormData;

    // Merge any final data
    if (final_data) {
      Object.assign(formData, final_data);
    }

    let organization = null;
    let industry = null;

    // Create organization if requested and data is available
    if (create_organization && formData.company) {
      const companyData = formData.company;
      const orgData = formData.organization;

      // Get industry information if provided
      if (companyData.industry_id) {
        industry = await getIndustryById(companyData.industry_id);
      }

      // Create organization
      organization = await createOrganization({
        name: companyData.company_name,
        industry_id: companyData.industry_id,
        size: companyData.company_size,
        description: companyData.description,
        website: companyData.website,
        country: companyData.country,
        city: companyData.city,
        employee_count: companyData.employee_count,
        founded_year: companyData.founded_year,
        okr_maturity: orgData?.okr_maturity || 'beginner',
        business_goals: orgData?.business_goals || [],
        current_challenges: orgData?.current_challenges || [],
        ai_insights: {
          onboarding_context: {
            experience_level: formData.welcome?.experience_with_okr,
            urgency_level: formData.welcome?.urgency_level,
            primary_goal: formData.welcome?.primary_goal,
            communication_style: formData.preferences?.communication_style,
            ai_assistance_level: formData.preferences?.ai_assistance_level,
            completed_at: new Date().toISOString()
          }
        },
        created_by: user.id
      });

      // Add user as organization owner
      await addOrganizationMember(
        organization.id,
        user.id,
        'owner',
        orgData?.department,
        formData.welcome?.job_title
      );
    }

    // Complete the onboarding session
    const completedSession = await completeOnboardingSession(session_id);

    // Generate AI summary and recommendations
    const aiSummary = generateAISummary(formData, industry);
    const recommendedOKRs = generateRecommendedOKRs(formData, industry);
    const nextSteps = generateNextSteps(formData);

    // Prepare response
    const response: CompleteOnboardingResponse = {
      session: completedSession,
      organization,
      ai_summary: aiSummary,
      next_steps: nextSteps,
      recommended_okrs: recommendedOKRs
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': session_id,
        'x-organization-id': organization?.id || '',
        'x-onboarding-completed': 'true'
      }
    });

  } catch (error) {
    console.error("Error completing onboarding:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'Complete Onboarding');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return new Response("session_id es requerido", { status: 400 });
    }

    // Get session with progress
    const sessionWithProgress = await getOnboardingSessionWithProgress(sessionId);
    if (!sessionWithProgress) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (sessionWithProgress.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Check if already completed
    if (sessionWithProgress.status !== 'completed') {
      return new Response("La sesión de onboarding no está completada", { status: 400 });
    }

    // Return completion summary (useful for showing results again)
    const formData: OnboardingFormData = sessionWithProgress.form_data as OnboardingFormData;
    const aiSummary = generateAISummary(formData);
    const recommendedOKRs = generateRecommendedOKRs(formData);
    const nextSteps = generateNextSteps(formData);

    return new Response(JSON.stringify({
      session: sessionWithProgress,
      ai_summary: aiSummary,
      next_steps: nextSteps,
      recommended_okrs: recommendedOKRs,
      completed_at: sessionWithProgress.completed_at
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
        'x-onboarding-completed': 'true'
      }
    });

  } catch (error) {
    console.error("Error getting completion summary:", error);
    return handleUnknownError(error, 'Get Completion Summary');
  }
}