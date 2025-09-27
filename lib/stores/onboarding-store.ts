import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  OnboardingState,
  TOTAL_STEPS,
  WelcomeData,
  CompanyData,
  OrganizationData
} from '@/lib/types/onboarding';

const initialStepData = {
  welcome: {
    hasSeenWelcome: false,
  } as WelcomeData,
  company: {
    name: '',
    industry: '',
    size: '',
    description: '',
  } as CompanyData,
  organization: {
    departments: [],
    structure: 'hierarchical' as const,
  } as OrganizationData,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      totalSteps: TOTAL_STEPS,
      completedSteps: new Set<number>(),
      stepData: initialStepData,
      isLoading: false,
      errors: {},

      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      goToStep: (step: number) => {
        const { totalSteps } = get();
        if (step >= 1 && step <= totalSteps) {
          set({ currentStep: step });
        }
      },

      completeStep: (step: number) => {
        const { completedSteps } = get();
        const newCompletedSteps = new Set(completedSteps);
        newCompletedSteps.add(step);
        set({ completedSteps: newCompletedSteps });
      },

      setStepData: (step, data) => {
        set((state) => ({
          stepData: {
            ...state.stepData,
            [step]: {
              ...state.stepData[step],
              ...data,
            },
          },
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (field: string, error: string) => {
        set((state) => ({
          errors: {
            ...state.errors,
            [field]: error,
          },
        }));
      },

      clearError: (field: string) => {
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[field];
          return { errors: newErrors };
        });
      },

      reset: () => {
        set({
          currentStep: 1,
          completedSteps: new Set<number>(),
          stepData: initialStepData,
          isLoading: false,
          errors: {},
        });
      },
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: Array.from(state.completedSteps),
        stepData: state.stepData,
      }),
      // Custom storage interface to handle Set serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert completedSteps array back to Set
          if (data.state?.completedSteps && Array.isArray(data.state.completedSteps)) {
            data.state.completedSteps = new Set(data.state.completedSteps);
          }
          return data;
        },
        setItem: (name, value) => {
          const data = { ...value };
          // Convert Set to array for storage
          if (data.state?.completedSteps && data.state.completedSteps instanceof Set) {
            data.state.completedSteps = Array.from(data.state.completedSteps);
          }
          localStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Utility function to check if a step can be accessed
export const canAccessStep = (stepNumber: number, completedSteps: Set<number>): boolean => {
  // First step is always accessible
  if (stepNumber === 1) return true;

  // Can access step if previous step is completed
  return completedSteps.has(stepNumber - 1);
};

// Utility function to calculate completion percentage
export const getCompletionPercentage = (completedSteps: Set<number>, totalSteps: number): number => {
  return Math.round((completedSteps.size / totalSteps) * 100);
};