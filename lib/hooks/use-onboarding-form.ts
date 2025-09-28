import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import {
  welcomeSchema,
  companySchema,
  organizationSchema,
  WelcomeFormData,
  CompanyFormData,
  OrganizationFormData
} from "@/lib/validations/onboarding-schemas";
import { useCallback, useEffect, useState } from "react";

// Welcome step form hook
export function useWelcomeForm(): UseFormReturn<WelcomeFormData> & {
  onSubmit: (data: WelcomeFormData) => Promise<void>;
  isSubmitting: boolean;
} {
  const { stepData, setStepData, completeStep, nextStep, setLoading } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WelcomeFormData>({
    resolver: zodResolver(welcomeSchema),
    defaultValues: {
      role: "",
      customRole: "",
      experienceLevel: "intermediate"
    }
  });

  // Load saved data on mount
  useEffect(() => {
    const welcomeData = stepData.welcome;
    if (welcomeData?.role || welcomeData?.experienceLevel) {
      form.reset({
        role: welcomeData.role || "",
        customRole: welcomeData.customRole || "",
        experienceLevel: welcomeData.experienceLevel || "intermediate"
      });
    }
  }, [form, stepData.welcome]);

  const onSubmit = useCallback(async (data: WelcomeFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Save to backend API
      const response = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 1,
          data: {
            ...data,
            hasSeenWelcome: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save welcome step');
      }

      // Save to local state
      setStepData('welcome', {
        ...data,
        hasSeenWelcome: true
      });
      completeStep(1);
      nextStep();
    } catch (error) {
      console.error('Error submitting welcome form:', error);
      // Error is handled by error boundary
      throw error;
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  }, [setStepData, completeStep, nextStep, setLoading, isSubmitting]);

  return {
    ...form,
    onSubmit,
    isSubmitting
  };
}

// Company step form hook
export function useCompanyForm(): UseFormReturn<CompanyFormData> & {
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isSubmitting: boolean;
} {
  const { stepData, setStepData, completeStep, nextStep, setLoading } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      industry: "",
      size: "",
      description: "",
      logo: ""
    }
  });

  // Load saved data on mount
  useEffect(() => {
    const companyData = stepData.company;
    if (companyData.name || companyData.industry) {
      form.reset({
        name: companyData.name || "",
        industry: companyData.industry || "",
        size: companyData.size || "",
        description: companyData.description || "",
        logo: companyData.logo || ""
      });
    }
  }, [form, stepData.company]);

  const onSubmit = useCallback(async (data: CompanyFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Save to backend API
      const response = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 2,
          data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save company step');
      }

      // Save to local state
      setStepData('company', data);
      completeStep(2);
      nextStep();
    } catch (error) {
      console.error('Error submitting company form:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  }, [setStepData, completeStep, nextStep, setLoading, isSubmitting]);

  return {
    ...form,
    onSubmit,
    isSubmitting
  };
}

// Organization step form hook
export function useOrganizationForm(): UseFormReturn<OrganizationFormData> & {
  onSubmit: (data: OrganizationFormData) => Promise<void>;
  isSubmitting: boolean;
} {
  const { stepData, setStepData, completeStep, nextStep, setLoading } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      teamSize: 5,
      structure: "hierarchical",
      methodology: "okrs",
      collaborationStyle: "hybrid",
      integrations: [],
      departments: []
    }
  });

  // Load saved data on mount
  useEffect(() => {
    const orgData = stepData.organization;
    if (orgData?.teamSize || orgData?.structure) {
      form.reset({
        teamSize: orgData.teamSize || 5,
        structure: orgData.structure || "hierarchical",
        methodology: orgData.methodology || "okrs",
        collaborationStyle: orgData.collaborationStyle || "hybrid",
        integrations: orgData.integrations || [],
        departments: orgData.departments || []
      });
    }
  }, [form, stepData.organization]);

  const onSubmit = useCallback(async (data: OrganizationFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Save to backend API
      const response = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 3,
          data: {
            departments: data.departments,
            structure: data.structure,
            ...data
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save organization step');
      }

      // Save to local state
      setStepData('organization', {
        departments: data.departments,
        structure: data.structure,
        ...data
      });
      completeStep(3);
      nextStep();
    } catch (error) {
      console.error('Error submitting organization form:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  }, [setStepData, completeStep, nextStep, setLoading, isSubmitting]);

  return {
    ...form,
    onSubmit,
    isSubmitting
  };
}

// Auto-save functionality hook
export function useAutoSave<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  stepKey: 'welcome' | 'company' | 'organization',
  debounceMs: number = 1000
) {
  const { setStepData } = useOnboardingStore();

  useEffect(() => {
    const subscription = form.watch((data) => {
      const timeoutId = setTimeout(() => {
        if (data && Object.keys(data).length > 0) {
          // Type-safe way to set step data based on step key
          if (stepKey === 'welcome' && data) {
            setStepData(stepKey, data as Partial<WelcomeFormData>);
          } else if (stepKey === 'company' && data) {
            setStepData(stepKey, data as Partial<CompanyFormData>);
          } else if (stepKey === 'organization' && data) {
            setStepData(stepKey, data as Partial<OrganizationFormData>);
          }
        }
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [form, stepKey, setStepData, debounceMs]);
}

// Form validation utilities
export function useFormValidation() {
  const validateStep = useCallback((step: number, data: any): boolean => {
    try {
      switch (step) {
        case 1:
          welcomeSchema.parse(data);
          return true;
        case 2:
          companySchema.parse(data);
          return true;
        case 3:
          organizationSchema.parse(data);
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }, []);

  return { validateStep };
}