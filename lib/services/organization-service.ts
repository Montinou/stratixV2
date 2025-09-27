import {
  createOrganization,
  getOrganizationById,
  getOrganizationWithMembers,
  getUserOrganizations,
  updateOrganization,
  addOrganizationMember,
  getOrganizationMembers,
  updateOrganizationMember,
  removeOrganizationMember,
  getIndustryById
} from '@/lib/database/onboarding-queries';
import type {
  Organization,
  OrganizationMember,
  OrganizationWithMembers,
  OrganizationSize,
  Industry
} from '@/lib/database/onboarding-types';

export interface CreateOrganizationRequest {
  name: string;
  industry_id?: number;
  size: OrganizationSize;
  description: string;
  website?: string;
  country: string;
  city?: string;
  employee_count?: number;
  founded_year?: number;
  okr_maturity?: string;
  business_goals?: string[];
  current_challenges?: string[];
  creator_role?: string;
  creator_department?: string;
  creator_job_title?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  website?: string;
  okr_maturity?: string;
  business_goals?: string[];
  current_challenges?: string[];
}

export interface InviteMemberRequest {
  user_id: string;
  role: string;
  department?: string;
  job_title?: string;
  send_invitation?: boolean;
}

export interface OrganizationAnalytics {
  member_count: number;
  departments: Array<{ name: string; count: number }>;
  roles: Array<{ role: string; count: number }>;
  okr_maturity_distribution: Record<string, number>;
  business_goals_distribution: Array<{ goal: string; frequency: number }>;
  challenges_distribution: Array<{ challenge: string; frequency: number }>;
}

export class OrganizationService {

  /**
   * Create a new organization
   */
  static async createOrganization(
    createdBy: string,
    data: CreateOrganizationRequest
  ): Promise<{
    organization: OrganizationWithMembers;
    membership: OrganizationMember;
  }> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('El nombre de la organización es requerido');
    }

    if (!data.description?.trim()) {
      throw new Error('La descripción es requerida');
    }

    if (!data.country?.trim()) {
      throw new Error('El país es requerido');
    }

    // Validate industry if provided
    if (data.industry_id) {
      const industry = await getIndustryById(data.industry_id);
      if (!industry) {
        throw new Error('Industria no válida');
      }
    }

    // Create organization
    const organization = await createOrganization({
      name: data.name,
      industry_id: data.industry_id,
      size: data.size,
      description: data.description,
      website: data.website,
      country: data.country,
      city: data.city,
      employee_count: data.employee_count,
      founded_year: data.founded_year,
      okr_maturity: data.okr_maturity || 'beginner',
      business_goals: data.business_goals || [],
      current_challenges: data.current_challenges || [],
      ai_insights: {
        creation_context: 'organization_service',
        created_at: new Date().toISOString(),
        initial_setup: true
      },
      created_by: createdBy
    });

    // Add creator as organization owner
    const membership = await addOrganizationMember(
      organization.id,
      createdBy,
      data.creator_role || 'owner',
      data.creator_department,
      data.creator_job_title
    );

    // Get complete organization data
    const completeOrganization = await getOrganizationWithMembers(organization.id);

    if (!completeOrganization) {
      throw new Error('Error al obtener la organización creada');
    }

    return {
      organization: completeOrganization,
      membership
    };
  }

  /**
   * Get organization by ID with full details
   */
  static async getOrganization(
    organizationId: string,
    userId: string
  ): Promise<OrganizationWithMembers> {
    const organization = await getOrganizationWithMembers(organizationId);

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verify user has access to this organization
    const userMembership = organization.members.find(m => m.user_id === userId);
    if (!userMembership) {
      throw new Error('No tienes acceso a esta organización');
    }

    return organization;
  }

  /**
   * Get all organizations for a user
   */
  static async getUserOrganizations(
    userId: string
  ): Promise<Array<OrganizationWithMembers & {
    user_role: string;
    member_count: number;
    is_owner: boolean;
  }>> {
    const organizations = await getUserOrganizations(userId);

    const enrichedOrganizations = await Promise.all(
      organizations.map(async (org) => {
        const fullOrg = await getOrganizationWithMembers(org.id);
        if (!fullOrg) {
          throw new Error(`Error al obtener organización ${org.id}`);
        }

        const userMembership = fullOrg.members.find(m => m.user_id === userId);

        return {
          ...fullOrg,
          user_role: userMembership?.role || 'member',
          member_count: fullOrg.members.length,
          is_owner: userMembership?.role === 'owner'
        };
      })
    );

    return enrichedOrganizations;
  }

  /**
   * Update organization information
   */
  static async updateOrganization(
    organizationId: string,
    userId: string,
    updates: UpdateOrganizationRequest
  ): Promise<Organization> {
    // Verify user has permission to update
    const organization = await this.getOrganization(organizationId, userId);
    const userMembership = organization.members.find(m => m.user_id === userId);

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      throw new Error('No tienes permisos para actualizar esta organización');
    }

    // Validate updates
    const validatedUpdates: any = {};

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error('El nombre no puede estar vacío');
      }
      validatedUpdates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      if (!updates.description.trim()) {
        throw new Error('La descripción no puede estar vacía');
      }
      validatedUpdates.description = updates.description.trim();
    }

    if (updates.website !== undefined) {
      if (updates.website && !updates.website.match(/^https?:\/\/.+/)) {
        throw new Error('El sitio web debe incluir http:// o https://');
      }
      validatedUpdates.website = updates.website;
    }

    if (updates.okr_maturity !== undefined) {
      if (!['beginner', 'intermediate', 'advanced'].includes(updates.okr_maturity)) {
        throw new Error('Nivel de madurez OKR no válido');
      }
      validatedUpdates.okr_maturity = updates.okr_maturity;
    }

    if (updates.business_goals !== undefined) {
      validatedUpdates.business_goals = updates.business_goals;
    }

    if (updates.current_challenges !== undefined) {
      validatedUpdates.current_challenges = updates.current_challenges;
    }

    // Add AI insights about the update
    validatedUpdates.ai_insights = {
      ...organization.ai_insights,
      last_updated: new Date().toISOString(),
      updated_by: userId,
      update_fields: Object.keys(validatedUpdates)
    };

    return await updateOrganization(organizationId, validatedUpdates);
  }

  /**
   * Invite a new member to the organization
   */
  static async inviteMember(
    organizationId: string,
    invitedBy: string,
    memberData: InviteMemberRequest
  ): Promise<OrganizationMember> {
    // Verify inviter has permission
    const organization = await this.getOrganization(organizationId, invitedBy);
    const inviterMembership = organization.members.find(m => m.user_id === invitedBy);

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      throw new Error('No tienes permisos para invitar miembros');
    }

    // Validate role
    const validRoles = ['member', 'admin', 'owner'];
    if (!validRoles.includes(memberData.role)) {
      throw new Error('Rol no válido');
    }

    // Prevent multiple owners unless inviter is owner
    if (memberData.role === 'owner' && inviterMembership.role !== 'owner') {
      throw new Error('Solo el propietario puede asignar el rol de propietario');
    }

    // Check if user is already a member
    const existingMember = organization.members.find(m => m.user_id === memberData.user_id);
    if (existingMember) {
      throw new Error('El usuario ya es miembro de esta organización');
    }

    // Add member
    const newMember = await addOrganizationMember(
      organizationId,
      memberData.user_id,
      memberData.role,
      memberData.department,
      memberData.job_title
    );

    // TODO: Send invitation email if requested
    if (memberData.send_invitation) {
      await this.sendInvitationEmail(organization, newMember, invitedBy);
    }

    return newMember;
  }

  /**
   * Update member role or information
   */
  static async updateMember(
    organizationId: string,
    updatedBy: string,
    memberId: string,
    updates: {
      role?: string;
      department?: string;
      job_title?: string;
    }
  ): Promise<OrganizationMember> {
    // Verify updater has permission
    const organization = await this.getOrganization(organizationId, updatedBy);
    const updaterMembership = organization.members.find(m => m.user_id === updatedBy);

    if (!updaterMembership || !['owner', 'admin'].includes(updaterMembership.role)) {
      throw new Error('No tienes permisos para actualizar miembros');
    }

    // Find target member
    const targetMember = organization.members.find(m => m.user_id === memberId);
    if (!targetMember) {
      throw new Error('Miembro no encontrado');
    }

    // Validate role update
    if (updates.role) {
      const validRoles = ['member', 'admin', 'owner'];
      if (!validRoles.includes(updates.role)) {
        throw new Error('Rol no válido');
      }

      // Prevent non-owners from creating owners
      if (updates.role === 'owner' && updaterMembership.role !== 'owner') {
        throw new Error('Solo el propietario puede asignar el rol de propietario');
      }

      // Prevent updating owner role unless you are owner
      if (targetMember.role === 'owner' && updaterMembership.role !== 'owner') {
        throw new Error('Solo el propietario puede modificar su propio rol');
      }
    }

    return await updateOrganizationMember(organizationId, memberId, updates);
  }

  /**
   * Remove member from organization
   */
  static async removeMember(
    organizationId: string,
    removedBy: string,
    memberId: string
  ): Promise<boolean> {
    // Verify remover has permission
    const organization = await this.getOrganization(organizationId, removedBy);
    const removerMembership = organization.members.find(m => m.user_id === removedBy);

    if (!removerMembership || !['owner', 'admin'].includes(removerMembership.role)) {
      throw new Error('No tienes permisos para remover miembros');
    }

    // Find target member
    const targetMember = organization.members.find(m => m.user_id === memberId);
    if (!targetMember) {
      throw new Error('Miembro no encontrado');
    }

    // Prevent removing owner unless you are owner
    if (targetMember.role === 'owner' && removerMembership.role !== 'owner') {
      throw new Error('Solo el propietario puede remover a otro propietario');
    }

    // Prevent last owner from being removed
    const ownerCount = organization.members.filter(m => m.role === 'owner').length;
    if (targetMember.role === 'owner' && ownerCount <= 1) {
      throw new Error('No se puede remover al último propietario de la organización');
    }

    return await removeOrganizationMember(organizationId, memberId);
  }

  /**
   * Get organization analytics
   */
  static async getOrganizationAnalytics(
    organizationId: string,
    userId: string
  ): Promise<OrganizationAnalytics> {
    const organization = await this.getOrganization(organizationId, userId);

    // Department distribution
    const departments = organization.members.reduce((acc, member) => {
      const dept = member.department || 'Sin departamento';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const departmentArray = Object.entries(departments).map(([name, count]) => ({
      name,
      count
    }));

    // Role distribution
    const roles = organization.members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const roleArray = Object.entries(roles).map(([role, count]) => ({
      role,
      count
    }));

    // Business goals and challenges distribution
    const businessGoalsArray = organization.business_goals.map(goal => ({
      goal,
      frequency: 1 // Could be enhanced to track across multiple organizations
    }));

    const challengesArray = organization.current_challenges.map(challenge => ({
      challenge,
      frequency: 1 // Could be enhanced to track across multiple organizations
    }));

    return {
      member_count: organization.members.length,
      departments: departmentArray,
      roles: roleArray,
      okr_maturity_distribution: { [organization.okr_maturity]: 1 },
      business_goals_distribution: businessGoalsArray,
      challenges_distribution: challengesArray
    };
  }

  /**
   * Search organizations (for potential collaboration or benchmarking)
   */
  static async searchOrganizations(
    userId: string,
    query: {
      industry_id?: number;
      size?: OrganizationSize;
      country?: string;
      okr_maturity?: string;
      business_goals?: string[];
    }
  ): Promise<Array<{
    id: string;
    name: string;
    industry?: Industry;
    size: OrganizationSize;
    country: string;
    okr_maturity: string;
    member_count: number;
  }>> {
    // This is a placeholder for organization search functionality
    // In a real implementation, this would search public organizations
    // or organizations open to collaboration

    const userOrgs = await this.getUserOrganizations(userId);

    // Filter user's organizations based on query
    return userOrgs
      .filter(org => {
        if (query.industry_id && org.industry_id !== query.industry_id) return false;
        if (query.size && org.size !== query.size) return false;
        if (query.country && org.country !== query.country) return false;
        if (query.okr_maturity && org.okr_maturity !== query.okr_maturity) return false;

        if (query.business_goals && query.business_goals.length > 0) {
          const hasCommonGoals = query.business_goals.some(goal =>
            org.business_goals.includes(goal)
          );
          if (!hasCommonGoals) return false;
        }

        return true;
      })
      .map(org => ({
        id: org.id,
        name: org.name,
        industry: org.industry,
        size: org.size,
        country: org.country,
        okr_maturity: org.okr_maturity,
        member_count: org.member_count
      }));
  }

  /**
   * Generate organization insights using AI
   */
  static async generateOrganizationInsights(
    organizationId: string,
    userId: string
  ): Promise<{
    strengths: string[];
    opportunities: string[];
    recommendations: string[];
    benchmark_comparisons: string[];
  }> {
    const organization = await this.getOrganization(organizationId, userId);
    const analytics = await this.getOrganizationAnalytics(organizationId, userId);

    // Basic insights based on organization data
    const insights = {
      strengths: [] as string[],
      opportunities: [] as string[],
      recommendations: [] as string[],
      benchmark_comparisons: [] as string[]
    };

    // Analyze team size
    if (analytics.member_count > 10) {
      insights.strengths.push('Equipo sólido con capacidad para iniciativas complejas');
    } else {
      insights.opportunities.push('Oportunidad de crecer el equipo para mayor impacto');
    }

    // Analyze department diversity
    if (analytics.departments.length > 3) {
      insights.strengths.push('Diversidad departamental permite perspectivas variadas');
    } else {
      insights.recommendations.push('Considera involucrar más departamentos en OKRs');
    }

    // Analyze OKR maturity
    if (organization.okr_maturity === 'beginner') {
      insights.recommendations.push('Enfócate en objetivos simples y medibles inicialmente');
      insights.opportunities.push('Gran potencial de mejora con práctica consistente');
    } else if (organization.okr_maturity === 'advanced') {
      insights.strengths.push('Experiencia avanzada en OKRs permite objetivos ambiciosos');
    }

    // Business goals analysis
    if (organization.business_goals.length > 5) {
      insights.recommendations.push('Considera priorizar 2-3 objetivos clave para mayor enfoque');
    } else if (organization.business_goals.length < 2) {
      insights.opportunities.push('Expandir objetivos de negocio puede impulsar crecimiento');
    }

    return insights;
  }

  /**
   * Send invitation email (placeholder)
   */
  private static async sendInvitationEmail(
    organization: OrganizationWithMembers,
    member: OrganizationMember,
    invitedBy: string
  ): Promise<void> {
    // TODO: Implement email sending logic
    console.log(`Sending invitation email for ${member.user_id} to join ${organization.name}`);
  }
}