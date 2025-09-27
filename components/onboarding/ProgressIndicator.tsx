'use client';

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";
import { WIZARD_STEPS } from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  completedSteps,
  className
}: ProgressIndicatorProps) {
  const totalSteps = WIZARD_STEPS.length;
  const progressPercentage = Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Progreso del Onboarding
          </span>
          <Badge variant="secondary" className="font-semibold">
            {completedSteps.size} de {totalSteps}
          </Badge>
        </div>
        <Progress
          value={progressPercentage}
          className="h-2"
          aria-label={`Progreso: ${progressPercentage}% completado`}
        />
        <div className="text-xs text-muted-foreground text-right">
          {progressPercentage}% completado
        </div>
      </div>

      {/* Step Indicators */}
      <div className="relative flex justify-between items-center">
        {WIZARD_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.has(stepNumber);
          const isCurrent = currentStep === stepNumber;
          const isAccessible = stepNumber === 1 || completedSteps.has(stepNumber - 1);

          return (
            <div
              key={step.key}
              className={cn(
                "flex flex-col items-center space-y-1 text-center relative z-10",
                "transition-all duration-200"
              )}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 bg-background",
                  {
                    "bg-primary border-primary text-primary-foreground": isCompleted,
                    "bg-primary/20 border-primary text-primary": isCurrent && !isCompleted,
                    "bg-muted border-muted-foreground/30 text-muted-foreground":
                      !isCompleted && !isCurrent && isAccessible,
                    "bg-muted border-muted-foreground/10 text-muted-foreground/50":
                      !isAccessible,
                  }
                )}
                role="button"
                tabIndex={isAccessible ? 0 : -1}
                aria-label={`Paso ${stepNumber}: ${step.title}`}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isAccessible}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-semibold">{stepNumber}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="min-w-0 max-w-[80px]">
                <p
                  className={cn(
                    "text-xs font-medium truncate",
                    {
                      "text-primary": isCurrent || isCompleted,
                      "text-muted-foreground": !isCurrent && !isCompleted && isAccessible,
                      "text-muted-foreground/50": !isAccessible,
                    }
                  )}
                  title={step.title}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}

        {/* Connector Lines - rendered as background */}
        <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 -z-10">
          {WIZARD_STEPS.slice(0, -1).map((_, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.has(stepNumber);

            return (
              <div
                key={index}
                className={cn(
                  "flex-1 h-0.5 transition-colors duration-200",
                  index === 0 ? "ml-4" : "",
                  index === WIZARD_STEPS.length - 2 ? "mr-4" : "",
                  {
                    "bg-primary": isCompleted,
                    "bg-muted-foreground/30": !isCompleted,
                  }
                )}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}