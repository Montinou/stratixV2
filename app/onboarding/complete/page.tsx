'use client';

import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { CompletionStepComponent } from "@/components/onboarding/CompletionStep";

export default function CompletePage() {
  return (
    <OnboardingLayout step={4} showNavigation={false}>
      <CompletionStepComponent />
    </OnboardingLayout>
  );
}