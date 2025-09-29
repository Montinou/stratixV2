import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  createOrganization,
  addOrganizationMember,
  getUserOrganizations,
  getOrganizationWithMembers
} from "@/lib/database/onboarding-queries";
import type { OrganizationSize } from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request validation schema for creating organization
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'El nombre de la organización es requerido').max(255),
  industry_id: z.number().int().positive().optional(),
  size: z.enum(['startup', 'pyme', 'empresa', 'corporacion'] as const),
  description: z.string().min(1, 'La descripción es requerida'),
  website: z.string().url('URL inválida').optional(),
  country: z.string().min(1, 'El país es requerido').max(100),
  city: z.string().max(100).optional(),
  employee_count: z.number().int().positive().max(100000).optional(),
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  okr_maturity: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  business_goals: z.array(z.string()).default([]),
  current_challenges: z.array(z.string()).default([]),
  initial_role: z.string().default('owner'),
  department: z.string().optional(),
  job_title: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = createOrganizationSchema.parse(body);

    const {
      initial_role,
      department,
      job_title,
      ...organizationData
    } = validatedData;

    // Create organization
    const organization = await createOrganization({
      ...organizationData,
      ai_insights: {
        created_via: 'onboarding_api',
        created_at: new Date().toISOString(),
        user_id: user.id
      },
      created_by: user.id
    });

    // Add user as organization member
    const membership = await addOrganizationMember(
      organization.id,
      user.id,
      initial_role,
      department,
      job_title
    );

    // Get complete organization data with members
    const completeOrganization = await getOrganizationWithMembers(organization.id);

    return new Response(JSON.stringify({
      organization: completeOrganization,
      membership,
      message: 'Organización creada exitosamente'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organization.id
      }
    });

  } catch (error) {
    console.error("Error creating organization:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'Create Organization');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get user's organizations
    const organizations = await getUserOrganizations(user.id);

    // Enrich with additional information
    const enrichedOrganizations = await Promise.all(
      organizations.map(async (org) => {
        const fullOrg = await getOrganizationWithMembers(org.id);
        return {
          ...fullOrg,
          member_count: fullOrg?.members.length || 0,
          user_role: fullOrg?.members.find(m => m.user_id === user.id)?.role || 'member'
        };
      })
    );

    return new Response(JSON.stringify({
      organizations: enrichedOrganizations,
      total: enrichedOrganizations.length
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error("Error fetching user organizations:", error);
    return handleUnknownError(error, 'Fetch User Organizations');
  }
}