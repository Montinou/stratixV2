'use client';

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useOnboardingStore, canAccessStep } from "@/lib/stores/onboarding-store";
import { WIZARD_STEPS } from "@/lib/types/onboarding";
import { ProgressIndicator } from "./ProgressIndicator";
import { WizardNavigation, useWizardKeyboardNavigation } from "./WizardNavigation";
import { AccessibilityProvider, SkipLink } from "./AccessibilityProvider";
import { cn } from "@/lib/utils";

interface WizardContainerProps {
  children: ReactNode;
  currentStep: number;
  className?: string;
  contentClassName?: string;
  showProgress?: boolean;
  showNavigation?: boolean;
  canProceed?: boolean;
  isLoading?: boolean;
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  navigationClassName?: string;
}

export function WizardContainer({
  children,
  currentStep,
  className,
  contentClassName,
  showProgress = true,
  showNavigation = true,
  canProceed = true,
  isLoading = false,
  onNext,
  onPrevious,
  onSkip,
  showSkip = false,
  navigationClassName
}: WizardContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentStep: storeCurrentStep,
    completedSteps,
    goToStep,
    setError,
    clearError
  } = useOnboardingStore();

  // Sync store step with current step prop
  useEffect(() => {
    if (storeCurrentStep !== currentStep) {
      goToStep(currentStep);
    }
  }, [currentStep, storeCurrentStep, goToStep]);

  // Route protection - redirect if user can't access current step
  useEffect(() => {
    const canAccess = canAccessStep(currentStep, completedSteps);

    if (!canAccess) {
      // Find the highest accessible step
      let highestAccessibleStep = 1;
      for (let i = 1; i <= WIZARD_STEPS.length; i++) {
        if (canAccessStep(i, completedSteps)) {
          highestAccessibleStep = i;
        } else {
          break;
        }
      }

      // Redirect to highest accessible step
      const redirectStep = WIZARD_STEPS[highestAccessibleStep - 1];
      if (redirectStep && pathname !== redirectStep.path) {
        setError('navigation', 'No puedes acceder a este paso aún. Complete los pasos anteriores primero.');
        router.replace(redirectStep.path);
        return;
      }
    } else {
      clearError('navigation');
    }
  }, [currentStep, completedSteps, pathname, router, setError, clearError]);

  // Setup keyboard navigation
  const { handleKeyDown } = useWizardKeyboardNavigation({
    currentStep,
    canProceed,
    isLoading,
    onNext,
    onPrevious
  });

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AccessibilityProvider>
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
        "flex flex-col",
        className
      )}>
        <SkipLink />

        {/* Progress Section */}
        {showProgress && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
            <div className="max-w-4xl mx-auto p-4">
              <ProgressIndicator
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "flex-1 flex items-center justify-center p-4 py-8",
            contentClassName
          )}
          role="main"
          aria-label="Contenido principal del onboarding"
        >
          <div className="w-full max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        {/* Navigation Section */}
        {showNavigation && (
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t">
            <div className="max-w-4xl mx-auto p-4">
              <WizardNavigation
                currentStep={currentStep}
                canProceed={canProceed}
                isLoading={isLoading}
                onNext={onNext}
                onPrevious={onPrevious}
                onSkip={onSkip}
                showSkip={showSkip}
                className={navigationClassName}
              />
            </div>
          </div>
        )}
      </div>
    </AccessibilityProvider>
  );
}

// Layout component for onboarding pages
export function OnboardingLayout({
  children,
  step,
  className,
  ...props
}: {
  children: ReactNode;
  step: number;
  className?: string;
} & Omit<WizardContainerProps, 'children' | 'currentStep'>) {
  const currentStepConfig = WIZARD_STEPS[step - 1];

  return (
    <WizardContainer
      currentStep={step}
      className={className}
      {...props}
    >
      <div className="space-y-8">
        {/* Step indicator for screen readers */}
        <div className="sr-only">
          <h1>
            Paso {step} de {WIZARD_STEPS.length}: {currentStepConfig?.title}
          </h1>
          <p>{currentStepConfig?.description}</p>
        </div>

        {children}
      </div>
    </WizardContainer>
  );
}