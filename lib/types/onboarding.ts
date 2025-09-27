export interface WelcomeData {
  hasSeenWelcome: boolean;
}

export interface CompanyData {
  name: string;
  industry: string;
  size: string;
  description?: string;
}

export interface OrganizationData {
  departments: Department[];
  structure: OrganizationStructure;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export type OrganizationStructure = 'hierarchical' | 'flat' | 'matrix';

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  stepData: {
    welcome: WelcomeData;
    company: CompanyData;
    organization: OrganizationData;
  };
  isLoading: boolean;
  errors: Record<string, string>;
  // Navigation methods
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeStep: (step: number) => void;
  setStepData: <T extends keyof OnboardingState['stepData']>(
    step: T,
    data: Partial<OnboardingState['stepData'][T]>
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  reset: () => void;
}

export type WizardStep = 'welcome' | 'company' | 'organization' | 'complete';

export interface WizardStepConfig {
  key: WizardStep;
  title: string;
  description: string;
  path: string;
  isOptional?: boolean;
  canSkip?: boolean;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    key: 'welcome',
    title: 'Bienvenido',
    description: 'Comencemos con la configuración de tu organización',
    path: '/onboarding/welcome',
  },
  {
    key: 'company',
    title: 'Información de la Empresa',
    description: 'Cuéntanos sobre tu empresa',
    path: '/onboarding/company',
  },
  {
    key: 'organization',
    title: 'Estructura Organizacional',
    description: 'Define los departamentos y estructura',
    path: '/onboarding/organization',
  },
  {
    key: 'complete',
    title: 'Completado',
    description: 'Tu configuración está lista',
    path: '/onboarding/complete',
  },
];

export const TOTAL_STEPS = WIZARD_STEPS.length;