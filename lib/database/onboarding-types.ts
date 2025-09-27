// TypeScript types for onboarding system
export type OnboardingStatus = 'in_progress' | 'completed' | 'abandoned';
export type OrganizationSize = 'startup' | 'pyme' | 'empresa' | 'corporacion';

export interface Industry {
  id: number;
  name: string;
  category: string;
  description?: string;
  ai_context: Record<string, any>;
  okr_examples: Array<{
    objective: string;
    key_results: string[];
  }>;
  created_at: string;
  updated_at: string;
}

export interface OnboardingSession {
  id: string;
  user_id: string;
  status: OnboardingStatus;
  current_step: number;
  total_steps: number;
  form_data: Record<string, any>;
  ai_suggestions: Record<string, any>;
  ai_analysis: Record<string, any>;
  completion_percentage: number;
  completed_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  industry_id?: number;
  size: OrganizationSize;
  description?: string;
  website?: string;
  country?: string;
  city?: string;
  employee_count?: number;
  founded_year?: number;
  okr_maturity: string;
  business_goals: string[];
  current_challenges: string[];
  ai_insights: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  department?: string;
  job_title?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgress {
  id: string;
  session_id: string;
  step_number: number;
  step_name: string;
  step_data: Record<string, any>;
  completed: boolean;
  skipped: boolean;
  ai_validation: Record<string, any>;
  completion_time?: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface CreateOnboardingSessionRequest {
  user_preferences?: {
    language?: 'es' | 'en';
    communication_style?: 'formal' | 'informal';
    experience_level?: 'beginner' | 'intermediate' | 'advanced';
  };
  context?: {
    source?: string;
    utm_params?: Record<string, string>;
  };
}

export interface CreateOnboardingSessionResponse {
  session: OnboardingSession;
  next_step: OnboardingStepInfo;
  ai_greeting?: string;
}

export interface UpdateProgressRequest {
  session_id: string;
  step_number: number;
  step_data: Record<string, any>;
  completed?: boolean;
  skipped?: boolean;
}

export interface UpdateProgressResponse {
  progress: OnboardingProgress;
  session: OnboardingSession;
  next_step?: OnboardingStepInfo;
  ai_feedback?: string;
  validation_errors?: string[];
}

export interface CompleteOnboardingRequest {
  session_id: string;
  final_data?: Record<string, any>;
  create_organization?: boolean;
}

export interface CompleteOnboardingResponse {
  session: OnboardingSession;
  organization?: Organization;
  ai_summary: string;
  next_steps: string[];
  recommended_okrs?: Array<{
    objective: string;
    key_results: string[];
    rationale: string;
  }>;
}

export interface OnboardingStepInfo {
  step_number: number;
  step_name: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    type: 'text' | 'email' | 'select' | 'multiselect' | 'textarea' | 'number';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
  ai_hints?: string[];
  estimated_time?: number; // in minutes
}

export interface AIIndustryAnalysisRequest {
  company_name: string;
  description?: string;
  website?: string;
  existing_industry?: string;
}

export interface AIIndustryAnalysisResponse {
  suggested_industry: {
    id: number;
    name: string;
    confidence: number;
    rationale: string;
  };
  alternatives: Array<{
    id: number;
    name: string;
    confidence: number;
    rationale: string;
  }>;
  business_insights: {
    market_trends: string[];
    competitive_landscape: string;
    growth_opportunities: string[];
    potential_challenges: string[];
  };
  okr_suggestions: Array<{
    objective: string;
    key_results: string[];
    category: 'growth' | 'efficiency' | 'innovation' | 'customer';
    priority: 'high' | 'medium' | 'low';
    rationale: string;
  }>;
}

export interface AIValidationRequest {
  session_id: string;
  step_data: Record<string, any>;
  step_name: string;
  context?: Record<string, any>;
}

export interface AIValidationResponse {
  is_valid: boolean;
  validation_score: number;
  suggestions: string[];
  warnings: string[];
  auto_corrections: Record<string, any>;
  next_step_hints: string[];
}

// Database query result types
export interface OnboardingSessionWithProgress extends OnboardingSession {
  progress: OnboardingProgress[];
  organization?: Organization;
}

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[];
  industry?: Industry;
}

// Form data structure for each step
export interface WelcomeStepData {
  full_name: string;
  job_title: string;
  experience_with_okr: 'none' | 'basic' | 'intermediate' | 'advanced';
  primary_goal: string;
  urgency_level: 'low' | 'medium' | 'high';
}

export interface CompanyStepData {
  company_name: string;
  industry_id?: number;
  company_size: OrganizationSize;
  description: string;
  website?: string;
  country: string;
  city?: string;
  employee_count?: number;
  founded_year?: number;
}

export interface OrganizationStepData {
  department?: string;
  team_size?: number;
  okr_maturity: 'beginner' | 'intermediate' | 'advanced';
  current_challenges: string[];
  business_goals: string[];
  success_metrics: string[];
}

export interface PreferencesStepData {
  communication_style: 'formal' | 'informal';
  language: 'es' | 'en';
  notification_frequency: 'daily' | 'weekly' | 'monthly';
  focus_areas: string[];
  ai_assistance_level: 'minimal' | 'moderate' | 'extensive';
}

export interface ReviewStepData {
  confirmed: boolean;
  additional_notes?: string;
  setup_demo?: boolean;
  invite_team_members?: boolean;
}

// Complete form data type
export interface OnboardingFormData {
  welcome?: WelcomeStepData;
  company?: CompanyStepData;
  organization?: OrganizationStepData;
  preferences?: PreferencesStepData;
  review?: ReviewStepData;
}

// Error types
export interface OnboardingError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface OnboardingApiError {
  error: string;
  message: string;
  errors?: OnboardingError[];
  session_id?: string;
}