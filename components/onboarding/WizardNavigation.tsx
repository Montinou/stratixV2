'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { WIZARD_STEPS } from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";

interface WizardNavigationProps {
  currentStep: number;
  canProceed?: boolean;
  isLoading?: boolean;
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  skipLabel?: string;
  className?: string;
}

export function WizardNavigation({
  currentStep,
  canProceed = true,
  isLoading = false,
  onNext,
  onPrevious,
  onSkip,
  showSkip = false,
  nextLabel,
  previousLabel,
  skipLabel = "Omitir",
  className
}: WizardNavigationProps) {
  const router = useRouter();
  const { nextStep, previousStep, completeStep } = useOnboardingStore();

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === WIZARD_STEPS.length;
  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if (!isFirstStep) {
      previousStep();
      const previousStepConfig = WIZARD_STEPS[currentStep - 2];
      router.push(previousStepConfig.path);
    }
  };

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    } else if (!isLastStep) {
      // Complete current step
      completeStep(currentStep);

      // Move to next step
      nextStep();
      const nextStepConfig = WIZARD_STEPS[currentStep];
      router.push(nextStepConfig.path);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else if (!isLastStep && currentStepConfig?.canSkip) {
      // Move to next step without completing current
      nextStep();
      const nextStepConfig = WIZARD_STEPS[currentStep];
      router.push(nextStepConfig.path);
    }
  };

  // Determine button labels
  const defaultNextLabel = isLastStep ? "Finalizar" : "Continuar";
  const defaultPreviousLabel = "Anterior";

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Previous Button */}
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={isFirstStep || isLoading}
        className="flex items-center gap-2"
        aria-label={`Ir al paso anterior: ${isFirstStep ? 'No disponible' : WIZARD_STEPS[currentStep - 2]?.title}`}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        {previousLabel || defaultPreviousLabel}
      </Button>

      {/* Skip Button - Only show if step can be skipped */}
      {showSkip && currentStepConfig?.canSkip && (
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          aria-label={`Omitir paso actual: ${currentStepConfig.title}`}
        >
          <SkipForward className="w-4 h-4" aria-hidden="true" />
          {skipLabel}
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Next Button */}
      <Button
        onClick={handleNext}
        disabled={!canProceed || isLoading}
        className="flex items-center gap-2 min-w-[120px]"
        aria-label={`${nextLabel || defaultNextLabel}${!isLastStep ? `: ir a ${WIZARD_STEPS[currentStep]?.title}` : ''}`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            Procesando...
          </>
        ) : (
          <>
            {nextLabel || defaultNextLabel}
            {!isLastStep && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          </>
        )}
      </Button>
    </div>
  );
}

// Keyboard navigation hook for wizard
export function useWizardKeyboardNavigation({
  currentStep,
  canProceed,
  isLoading,
  onNext,
  onPrevious,
}: {
  currentStep: number;
  canProceed: boolean;
  isLoading: boolean;
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void;
}) {
  const router = useRouter();
  const { nextStep, previousStep, completeStep } = useOnboardingStore();

  const handleKeyDown = async (event: KeyboardEvent) => {
    // Only handle if not in an input field
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'Enter':
        if (canProceed && !isLoading) {
          event.preventDefault();
          if (onNext) {
            await onNext();
          } else if (currentStep < WIZARD_STEPS.length) {
            completeStep(currentStep);
            nextStep();
            const nextStepConfig = WIZARD_STEPS[currentStep];
            router.push(nextStepConfig.path);
          }
        }
        break;

      case 'ArrowLeft':
        if (currentStep > 1 && !isLoading) {
          event.preventDefault();
          if (onPrevious) {
            onPrevious();
          } else {
            previousStep();
            const previousStepConfig = WIZARD_STEPS[currentStep - 2];
            router.push(previousStepConfig.path);
          }
        }
        break;

      case 'Escape':
        // Could be used to cancel/exit wizard
        event.preventDefault();
        router.push('/dashboard');
        break;
    }
  };

  return { handleKeyDown };
}