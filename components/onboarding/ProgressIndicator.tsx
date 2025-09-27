'use client';

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";
import { WIZARD_STEPS } from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedCompletedCount, setAnimatedCompletedCount] = useState(0);

  const targetProgress = Math.round((completedSteps.size / totalSteps) * 100);

  // Animate progress changes
  useEffect(() => {
    const progressTimer = setTimeout(() => {
      setAnimatedProgress(targetProgress);
    }, 100);

    const countTimer = setTimeout(() => {
      setAnimatedCompletedCount(completedSteps.size);
    }, 150);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(countTimer);
    };
  }, [targetProgress, completedSteps.size]);

  return (
    <div className={cn("space-y-4 animate-gpu", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground transition-colors duration-300">
            Progreso del Onboarding
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "font-semibold transition-all duration-300 button-scale",
              targetProgress === 100 && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            )}
          >
            <span className="transition-all duration-300">
              {animatedCompletedCount} de {totalSteps}
            </span>
          </Badge>
        </div>
        <div className="relative">
          <Progress
            value={animatedProgress}
            className={cn(
              "h-2 progress-animate",
              "transition-all duration-500 ease-out"
            )}
            aria-label={`Progreso: ${animatedProgress}% completado`}
          />

          {/* Progress flow animation overlay */}
          {animatedProgress > 0 && animatedProgress < 100 && (
            <div className="absolute inset-0 h-2 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/3 animate-progress-flow" />
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-right transition-colors duration-300">
          <span className="transition-all duration-300">
            {animatedProgress}% completado
          </span>
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
                "flex flex-col items-center space-y-1 text-center relative z-10 animate-gpu",
                "transition-all duration-300 ease-spring",
                isCurrent && "animate-pulse-subtle"
              )}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background",
                  "transition-all duration-300 ease-spring button-scale relative overflow-hidden",
                  {
                    "bg-primary border-primary text-primary-foreground shadow-lg": isCompleted,
                    "bg-primary/20 border-primary text-primary ring-2 ring-primary/20": isCurrent && !isCompleted,
                    "bg-muted border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50":
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
                {/* Completion animation overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 bg-primary rounded-full animate-scale-in" />
                )}

                <div className="relative z-10">
                  {isCompleted ? (
                    <CheckCircle
                      className={cn(
                        "w-4 h-4 transition-all duration-300",
                        "animate-scale-in"
                      )}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className={cn(
                      "text-xs font-semibold transition-all duration-300",
                      isCurrent && "animate-bounce-subtle"
                    )}>
                      {stepNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Step Label */}
              <div className="min-w-0 max-w-[80px]">
                <p
                  className={cn(
                    "text-xs font-medium truncate transition-all duration-300",
                    {
                      "text-primary font-semibold": isCurrent || isCompleted,
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
            const nextStepCompleted = completedSteps.has(stepNumber + 1);

            return (
              <div
                key={index}
                className={cn(
                  "flex-1 h-0.5 relative overflow-hidden rounded-full",
                  "transition-all duration-500 ease-spring",
                  index === 0 ? "ml-4" : "",
                  index === WIZARD_STEPS.length - 2 ? "mr-4" : ""
                )}
                style={{
                  transitionDelay: `${(index + 1) * 100}ms`
                }}
                aria-hidden="true"
              >
                {/* Base line */}
                <div className="absolute inset-0 bg-muted-foreground/30 rounded-full" />

                {/* Progress line */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-spring",
                    "bg-gradient-to-r from-primary to-primary/80",
                    {
                      "w-full": isCompleted && nextStepCompleted,
                      "w-1/2": isCompleted && !nextStepCompleted,
                      "w-0": !isCompleted,
                    }
                  )}
                  style={{
                    transitionDelay: `${(index + 1) * 150}ms`
                  }}
                />

                {/* Animated shimmer for active connections */}
                {isCompleted && !nextStepCompleted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent w-1/3 animate-shimmer" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}