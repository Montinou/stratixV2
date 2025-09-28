import { sql, authenticatedQuery } from '@/lib/database/neon-client';
import type {
  OnboardingSession,
  OnboardingProgress,
  Organization,
  OrganizationMember,
  Industry,
  OnboardingSessionWithProgress,
  OrganizationWithMembers,
  OnboardingStatus,
  OrganizationSize
} from './onboarding-types';

// ============================================================================
// ONBOARDING SESSIONS
// ============================================================================

export async function createOnboardingSession(
  userId: string,
  totalSteps: number = 5
): Promise<OnboardingSession> {
  const result = await authenticatedQuery<OnboardingSession>(
    `INSERT INTO onboarding_sessions (user_id, total_steps)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, totalSteps]
  );

  if (!result[0]) {
    throw new Error('Failed to create onboarding session');
  }

  return result[0];
}

export async function getOnboardingSession(
  sessionId: string
): Promise<OnboardingSession | null> {
  const result = await authenticatedQuery<OnboardingSession>(
    `SELECT * FROM onboarding_sessions WHERE id = $1`,
    [sessionId]
  );

  return result[0] || null;
}

export async function getOnboardingSessionWithProgress(
  sessionId: string
): Promise<OnboardingSessionWithProgress | null> {
  const session = await getOnboardingSession(sessionId);
  if (!session) return null;

  const progress = await getOnboardingProgress(sessionId);

  return {
    ...session,
    progress
  };
}

export async function getUserActiveSession(
  userId: string
): Promise<OnboardingSession | null> {
  const result = await authenticatedQuery<OnboardingSession>(
    `SELECT * FROM onboarding_sessions
     WHERE user_id = $1 AND status = 'in_progress'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  return result[0] || null;
}

export async function getOnboardingSessionByUserId(
  userId: string
): Promise<OnboardingSession | null> {
  const result = await authenticatedQuery<OnboardingSession>(
    `SELECT * FROM onboarding_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  return result[0] || null;
}

export async function updateOnboardingSession(
  sessionId: string,
  updates: Partial<Pick<OnboardingSession, 'status' | 'current_step' | 'form_data' | 'ai_suggestions' | 'ai_analysis' | 'completion_percentage'>>
): Promise<OnboardingSession> {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    paramIndex++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(sessionId);

  const result = await authenticatedQuery<OnboardingSession>(
    `UPDATE onboarding_sessions
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!result[0]) {
    throw new Error('Failed to update onboarding session');
  }

  return result[0];
}

export async function completeOnboardingSession(
  sessionId: string
): Promise<OnboardingSession> {
  const result = await authenticatedQuery<OnboardingSession>(
    `UPDATE onboarding_sessions
     SET status = 'completed', completed_at = NOW(), completion_percentage = 100, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );

  if (!result[0]) {
    throw new Error('Failed to complete onboarding session');
  }

  return result[0];
}

export async function deleteOnboardingSession(sessionId: string): Promise<boolean> {
  const result = await authenticatedQuery(
    `DELETE FROM onboarding_sessions WHERE id = $1`,
    [sessionId]
  );

  return result.length === 0; // DELETE returns empty array on success
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await sql(
    `SELECT public.cleanup_expired_onboarding_sessions() as deleted_count`
  );

  return result[0]?.deleted_count || 0;
}

// ============================================================================
// ONBOARDING PROGRESS
// ============================================================================

export async function createOnboardingProgress(
  sessionId: string,
  stepNumber: number,
  stepName: string,
  stepData: Record<string, any> = {},
  completed: boolean = false,
  skipped: boolean = false
): Promise<OnboardingProgress> {
  const result = await authenticatedQuery<OnboardingProgress>(
    `INSERT INTO onboarding_progress (session_id, step_number, step_name, step_data, completed, skipped)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id, step_number)
     DO UPDATE SET
       step_data = EXCLUDED.step_data,
       completed = EXCLUDED.completed,
       skipped = EXCLUDED.skipped,
       completion_time = CASE WHEN EXCLUDED.completed THEN NOW() ELSE NULL END,
       updated_at = NOW()
     RETURNING *`,
    [sessionId, stepNumber, stepName, JSON.stringify(stepData), completed, skipped]
  );

  if (!result[0]) {
    throw new Error('Failed to create/update onboarding progress');
  }

  return result[0];
}

export async function getOnboardingProgress(
  sessionId: string
): Promise<OnboardingProgress[]> {
  const result = await authenticatedQuery<OnboardingProgress>(
    `SELECT * FROM onboarding_progress
     WHERE session_id = $1
     ORDER BY step_number`,
    [sessionId]
  );

  return result;
}

export async function getProgressStep(
  sessionId: string,
  stepNumber: number
): Promise<OnboardingProgress | null> {
  const result = await authenticatedQuery<OnboardingProgress>(
    `SELECT * FROM onboarding_progress
     WHERE session_id = $1 AND step_number = $2`,
    [sessionId, stepNumber]
  );

  return result[0] || null;
}

export async function updateProgressStep(
  sessionId: string,
  stepNumber: number,
  updates: Partial<Pick<OnboardingProgress, 'step_data' | 'completed' | 'skipped' | 'ai_validation'>>
): Promise<OnboardingProgress> {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    paramIndex++;
  }

  // Add completion time if marked as completed
  if (updates.completed) {
    setClauses.push(`completion_time = NOW()`);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(sessionId, stepNumber);

  const result = await authenticatedQuery<OnboardingProgress>(
    `UPDATE onboarding_progress
     SET ${setClauses.join(', ')}
     WHERE session_id = $${paramIndex} AND step_number = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (!result[0]) {
    throw new Error('Failed to update progress step');
  }

  return result[0];
}

// ============================================================================
// INDUSTRIES
// ============================================================================

export async function getAllIndustries(): Promise<Industry[]> {
  const result = await sql<Industry>(
    `SELECT * FROM industries ORDER BY category, name`
  );

  return result;
}

export async function getIndustryById(industryId: number): Promise<Industry | null> {
  const result = await sql<Industry>(
    `SELECT * FROM industries WHERE id = $1`,
    [industryId]
  );

  return result[0] || null;
}

export async function searchIndustries(query: string): Promise<Industry[]> {
  const result = await sql<Industry>(
    `SELECT * FROM industries
     WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
     ORDER BY
       CASE WHEN name ILIKE $1 THEN 1 ELSE 2 END,
       name`,
    [`%${query}%`]
  );

  return result;
}

export async function getIndustriesByCategory(category: string): Promise<Industry[]> {
  const result = await sql<Industry>(
    `SELECT * FROM industries WHERE category = $1 ORDER BY name`,
    [category]
  );

  return result;
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export async function createOrganization(
  organizationData: {
    name: string;
    industry_id?: number;
    size: OrganizationSize;
    description?: string;
    website?: string;
    country?: string;
    city?: string;
    employee_count?: number;
    founded_year?: number;
    okr_maturity?: string;
    business_goals?: string[];
    current_challenges?: string[];
    ai_insights?: Record<string, any>;
    created_by: string;
  }
): Promise<Organization> {
  const {
    name,
    industry_id,
    size,
    description,
    website,
    country,
    city,
    employee_count,
    founded_year,
    okr_maturity = 'beginner',
    business_goals = [],
    current_challenges = [],
    ai_insights = {},
    created_by
  } = organizationData;

  const result = await authenticatedQuery<Organization>(
    `INSERT INTO organizations (
      name, industry_id, size, description, website, country, city,
      employee_count, founded_year, okr_maturity, business_goals,
      current_challenges, ai_insights, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      name, industry_id, size, description, website, country, city,
      employee_count, founded_year, okr_maturity, JSON.stringify(business_goals),
      JSON.stringify(current_challenges), JSON.stringify(ai_insights), created_by
    ]
  );

  if (!result[0]) {
    throw new Error('Failed to create organization');
  }

  return result[0];
}

export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const result = await authenticatedQuery<Organization>(
    `SELECT * FROM organizations WHERE id = $1`,
    [organizationId]
  );

  return result[0] || null;
}

export async function getOrganizationWithMembers(
  organizationId: string
): Promise<OrganizationWithMembers | null> {
  const organization = await getOrganizationById(organizationId);
  if (!organization) return null;

  const members = await getOrganizationMembers(organizationId);
  const industry = organization.industry_id ? await getIndustryById(organization.industry_id) : undefined;

  return {
    ...organization,
    members,
    industry
  };
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const result = await authenticatedQuery<Organization>(
    `SELECT o.* FROM organizations o
     JOIN organization_members om ON o.id = om.organization_id
     WHERE om.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );

  return result;
}

export async function updateOrganization(
  organizationId: string,
  updates: Partial<Pick<Organization, 'name' | 'description' | 'website' | 'okr_maturity' | 'business_goals' | 'current_challenges' | 'ai_insights'>>
): Promise<Organization> {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    paramIndex++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(organizationId);

  const result = await authenticatedQuery<Organization>(
    `UPDATE organizations
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!result[0]) {
    throw new Error('Failed to update organization');
  }

  return result[0];
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: string = 'member',
  department?: string,
  jobTitle?: string
): Promise<OrganizationMember> {
  const result = await authenticatedQuery<OrganizationMember>(
    `INSERT INTO organization_members (organization_id, user_id, role, department, job_title)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (organization_id, user_id) DO UPDATE SET
       role = EXCLUDED.role,
       department = EXCLUDED.department,
       job_title = EXCLUDED.job_title,
       updated_at = NOW()
     RETURNING *`,
    [organizationId, userId, role, department, jobTitle]
  );

  if (!result[0]) {
    throw new Error('Failed to add organization member');
  }

  return result[0];
}

export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const result = await authenticatedQuery<OrganizationMember>(
    `SELECT * FROM organization_members
     WHERE organization_id = $1
     ORDER BY role, joined_at`,
    [organizationId]
  );

  return result;
}

export async function updateOrganizationMember(
  organizationId: string,
  userId: string,
  updates: Partial<Pick<OrganizationMember, 'role' | 'department' | 'job_title'>>
): Promise<OrganizationMember> {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(organizationId, userId);

  const result = await authenticatedQuery<OrganizationMember>(
    `UPDATE organization_members
     SET ${setClauses.join(', ')}
     WHERE organization_id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (!result[0]) {
    throw new Error('Failed to update organization member');
  }

  return result[0];
}

export async function removeOrganizationMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const result = await authenticatedQuery(
    `DELETE FROM organization_members
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId]
  );

  return result.length === 0; // DELETE returns empty array on success
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export async function getOnboardingAnalytics(
  startDate?: string,
  endDate?: string
): Promise<{
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  average_completion_time_hours: number;
  step_completion_rates: Array<{
    step_number: number;
    step_name: string;
    completion_rate: number;
  }>;
  industry_distribution: Array<{
    industry_name: string;
    count: number;
  }>;
}> {
  const dateFilter = startDate && endDate
    ? `WHERE created_at >= $1 AND created_at <= $2`
    : '';
  const dateParams = startDate && endDate ? [startDate, endDate] : [];

  // Basic session stats
  const sessionStats = await sql(
    `SELECT
       COUNT(*) as total_sessions,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
       ROUND(
         COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric /
         NULLIF(COUNT(*), 0) * 100, 2
       ) as completion_rate,
       ROUND(
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric, 2
       ) as average_completion_time_hours
     FROM onboarding_sessions ${dateFilter}`,
    dateParams
  );

  // Step completion rates
  const stepStats = await sql(
    `SELECT
       p.step_number,
       p.step_name,
       ROUND(
         COUNT(CASE WHEN p.completed THEN 1 END)::numeric /
         NULLIF(COUNT(DISTINCT p.session_id), 0) * 100, 2
       ) as completion_rate
     FROM onboarding_progress p
     JOIN onboarding_sessions s ON p.session_id = s.id ${dateFilter.replace('created_at', 's.created_at')}
     GROUP BY p.step_number, p.step_name
     ORDER BY p.step_number`,
    dateParams
  );

  // Industry distribution
  const industryStats = await sql(
    `SELECT
       i.name as industry_name,
       COUNT(o.id) as count
     FROM organizations o
     JOIN industries i ON o.industry_id = i.id
     JOIN onboarding_sessions s ON o.created_by = s.user_id ${dateFilter.replace('created_at', 's.created_at')}
     GROUP BY i.name
     ORDER BY count DESC
     LIMIT 10`,
    dateParams
  );

  return {
    total_sessions: sessionStats[0]?.total_sessions || 0,
    completed_sessions: sessionStats[0]?.completed_sessions || 0,
    completion_rate: sessionStats[0]?.completion_rate || 0,
    average_completion_time_hours: sessionStats[0]?.average_completion_time_hours || 0,
    step_completion_rates: stepStats,
    industry_distribution: industryStats
  };
}

// ============================================================================
// ADDITIONAL HELPER FUNCTIONS FOR STATUS API
// ============================================================================

export async function getUserActiveOrganizations(
  userId: string
): Promise<OrganizationMember[]> {
  const result = await authenticatedQuery<OrganizationMember>(
    `SELECT om.*, o.name as organization_name
     FROM organization_members om
     JOIN organizations o ON om.organization_id = o.id
     WHERE om.user_id = $1 AND om.status = 'active'
     ORDER BY om.role DESC, om.joined_at ASC`,
    [userId]
  );

  return result;
}

export async function getOrganizationById(
  organizationId: string
): Promise<Organization | null> {
  const result = await authenticatedQuery<Organization>(
    `SELECT * FROM organizations WHERE id = $1`,
    [organizationId]
  );

  return result[0] || null;
}