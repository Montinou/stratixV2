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
import { useCallback, useEffect } from "react";

// Welcome step form hook
export function useWelcomeForm(): UseFormReturn<WelcomeFormData> & {
  onSubmit: (data: WelcomeFormData) => void;
} {
  const { stepData, setStepData, completeStep, nextStep } = useOnboardingStore();

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
    const welcomeData = stepData.welcome as any;
    if (welcomeData.role || welcomeData.experienceLevel) {
      form.reset({
        role: welcomeData.role || "",
        customRole: welcomeData.customRole || "",
        experienceLevel: welcomeData.experienceLevel || "intermediate"
      });
    }
  }, [form, stepData.welcome]);

  const onSubmit = useCallback((data: WelcomeFormData) => {
    setStepData('welcome', {
      ...data,
      hasSeenWelcome: true
    });
    completeStep(1);
    nextStep();
  }, [setStepData, completeStep, nextStep]);

  return {
    ...form,
    onSubmit
  };
}

// Company step form hook
export function useCompanyForm(): UseFormReturn<CompanyFormData> & {
  onSubmit: (data: CompanyFormData) => void;
} {
  const { stepData, setStepData, completeStep, nextStep } = useOnboardingStore();

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

  const onSubmit = useCallback((data: CompanyFormData) => {
    setStepData('company', data);
    completeStep(2);
    nextStep();
  }, [setStepData, completeStep, nextStep]);

  return {
    ...form,
    onSubmit
  };
}

// Organization step form hook
export function useOrganizationForm(): UseFormReturn<OrganizationFormData> & {
  onSubmit: (data: OrganizationFormData) => void;
} {
  const { stepData, setStepData, completeStep, nextStep } = useOnboardingStore();

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
    const orgData = stepData.organization as any;
    if (orgData.teamSize || orgData.structure) {
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

  const onSubmit = useCallback((data: OrganizationFormData) => {
    setStepData('organization', {
      departments: data.departments,
      structure: data.structure,
      ...data
    });
    completeStep(3);
    nextStep();
  }, [setStepData, completeStep, nextStep]);

  return {
    ...form,
    onSubmit
  };
}

// Auto-save functionality hook
export function useAutoSave<T>(
  form: UseFormReturn<T>,
  stepKey: 'welcome' | 'company' | 'organization',
  debounceMs: number = 1000
) {
  const { setStepData } = useOnboardingStore();

  useEffect(() => {
    const subscription = form.watch((data) => {
      const timeoutId = setTimeout(() => {
        if (data && Object.keys(data).length > 0) {
          setStepData(stepKey, data as any);
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