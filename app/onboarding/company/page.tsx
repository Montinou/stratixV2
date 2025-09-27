'use client';

import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { CompanyInfoStepComponent } from "@/components/onboarding/CompanyInfoStep";

export default function CompanyPage() {
  return (
    <OnboardingLayout step={2}>
      <CompanyInfoStepComponent />
    </OnboardingLayout>
  );
}