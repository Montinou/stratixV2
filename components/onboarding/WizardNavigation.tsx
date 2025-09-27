'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { WIZARD_STEPS } from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";

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
  const [isNextHovered, setIsNextHovered] = useState(false);
  const [isPreviousHovered, setIsPreviousHovered] = useState(false);
  const [buttonClickState, setButtonClickState] = useState<'next' | 'previous' | 'skip' | null>(null);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === WIZARD_STEPS.length;
  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  const handlePrevious = () => {
    setButtonClickState('previous');
    setTimeout(() => setButtonClickState(null), 200);

    if (onPrevious) {
      onPrevious();
    } else if (!isFirstStep) {
      previousStep();
      const previousStepConfig = WIZARD_STEPS[currentStep - 2];
      router.push(previousStepConfig.path);
    }
  };

  const handleNext = async () => {
    setButtonClickState('next');
    setTimeout(() => setButtonClickState(null), 200);

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
    setButtonClickState('skip');
    setTimeout(() => setButtonClickState(null), 200);

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
    <nav
      id="wizard-navigation"
      className={cn(
        "flex items-center justify-between gap-4 animate-gpu",
        "transition-all duration-300 ease-spring",
        className
      )}
      role="navigation"
      aria-label="Navegación del onboarding"
    >
      {/* Previous Button */}
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={isFirstStep || isLoading}
        onMouseEnter={() => setIsPreviousHovered(true)}
        onMouseLeave={() => setIsPreviousHovered(false)}
        className={cn(
          "flex items-center gap-2 button-scale animate-gpu",
          "transition-all duration-200 ease-spring",
          buttonClickState === 'previous' && "animate-scale-in",
          isPreviousHovered && "shadow-md",
          isFirstStep && "opacity-50 cursor-not-allowed"
        )}
        aria-label={`Ir al paso anterior: ${isFirstStep ? 'No disponible' : WIZARD_STEPS[currentStep - 2]?.title}`}
        aria-describedby={isFirstStep ? "prev-disabled-desc" : undefined}
      >
        <ChevronLeft
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isPreviousHovered && !isFirstStep && "transform -translate-x-0.5"
          )}
          aria-hidden="true"
        />
        <span className="transition-all duration-200">
          {previousLabel || defaultPreviousLabel}
        </span>
      </Button>

      {/* Skip Button - Only show if step can be skipped */}
      {showSkip && currentStepConfig?.canSkip && (
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 text-muted-foreground hover:text-foreground",
            "button-scale animate-gpu transition-all duration-200 ease-spring",
            buttonClickState === 'skip' && "animate-scale-in",
            "hover:bg-muted/50"
          )}
          aria-label={`Omitir paso actual: ${currentStepConfig.title}`}
        >
          <SkipForward
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              "hover:translate-x-0.5"
            )}
            aria-hidden="true"
          />
          <span className="transition-all duration-200">
            {skipLabel}
          </span>
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Next Button */}
      <Button
        onClick={handleNext}
        disabled={!canProceed || isLoading}
        onMouseEnter={() => setIsNextHovered(true)}
        onMouseLeave={() => setIsNextHovered(false)}
        className={cn(
          "flex items-center gap-2 min-w-[120px] button-scale animate-gpu",
          "transition-all duration-200 ease-spring relative overflow-hidden",
          buttonClickState === 'next' && "animate-scale-in",
          isNextHovered && "shadow-lg",
          isLastStep && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
          !canProceed && "opacity-50 cursor-not-allowed"
        )}
        aria-label={`${nextLabel || defaultNextLabel}${!isLastStep ? `: ir a ${WIZARD_STEPS[currentStep]?.title}` : ''}`}
      >
        {/* Success shimmer for last step */}
        {isLastStep && isNextHovered && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/3 animate-shimmer" />
        )}

        <div className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span className="transition-all duration-200">Procesando...</span>
            </>
          ) : (
            <>
              <span className="transition-all duration-200">
                {nextLabel || defaultNextLabel}
              </span>
              {!isLastStep && (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isNextHovered && "transform translate-x-0.5"
                  )}
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </div>
      </Button>

      {/* Hidden accessibility descriptions */}
      {isFirstStep && (
        <div id="prev-disabled-desc" className="sr-only">
          Estás en el primer paso del onboarding
        </div>
      )}

      {!canProceed && (
        <div id="next-disabled-desc" className="sr-only">
          Completa todos los campos requeridos para continuar
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="sr-only">
        Atajos de teclado: Ctrl + flecha derecha para siguiente, Ctrl + flecha izquierda para anterior, Escape para salir
      </div>
    </nav>
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

  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
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
  }, [currentStep, canProceed, isLoading, onNext, onPrevious, router, nextStep, previousStep, completeStep]);

  return { handleKeyDown };
}