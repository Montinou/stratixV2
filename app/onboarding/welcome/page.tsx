'use client';

import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { WelcomeStepComponent } from "@/components/onboarding/WelcomeStep";

export default function WelcomePage() {
  return (
    <OnboardingLayout step={1} showNavigation={false}>
      <WelcomeStepComponent />
    </OnboardingLayout>
  );
}