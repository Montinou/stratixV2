'use client';

import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { OrganizationStepComponent } from "@/components/onboarding/OrganizationStep";

export default function OrganizationPage() {
  return (
    <OnboardingLayout step={3}>
      <OrganizationStepComponent />
    </OnboardingLayout>
  );
}