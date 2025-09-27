'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";

interface WizardStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  showSeparator?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  isVisible?: boolean;
  animationDirection?: "left" | "right" | "up" | "down";
  delayContent?: boolean;
}

export function WizardStep({
  title,
  description,
  children,
  icon,
  className,
  contentClassName,
  headerClassName,
  showSeparator = true,
  maxWidth = "lg",
  isVisible = true,
  animationDirection = "right",
  delayContent = false
}: WizardStepProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [showContent, setShowContent] = useState(!delayContent);

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full"
  };

  const animationClasses = {
    left: "animate-slide-in-from-left",
    right: "animate-slide-in-from-right",
    up: "animate-fade-in translate-y-4",
    down: "animate-fade-in -translate-y-4"
  };

  // Handle entrance animation
  useEffect(() => {
    if (isVisible) {
      setIsEntering(true);
      if (delayContent) {
        const timer = setTimeout(() => setShowContent(true), 200);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, delayContent]);

  return (
    <Card className={cn(
      "w-full mx-auto card-hover animate-gpu",
      "transition-all duration-500 ease-spring",
      maxWidthClasses[maxWidth],
      isEntering && animationClasses[animationDirection],
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      className
    )}>
      <CardHeader className={cn(
        "space-y-4 transition-all duration-300",
        showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        headerClassName
      )}
      style={{
        transitionDelay: delayContent ? "100ms" : "0ms"
      }}>
        {icon && (
          <div className="flex justify-center">
            <div className={cn(
              "p-3 rounded-full bg-primary/10 text-primary animate-gpu",
              "transition-all duration-300 ease-spring",
              "hover:bg-primary/20 hover:scale-105",
              showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            style={{
              transitionDelay: delayContent ? "200ms" : "50ms"
            }}>
              {icon}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <CardTitle className={cn(
            "text-2xl font-semibold tracking-tight transition-all duration-300",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          )}
          style={{
            transitionDelay: delayContent ? "250ms" : "100ms"
          }}>
            {title}
          </CardTitle>
          {description && (
            <CardDescription className={cn(
              "text-base text-muted-foreground max-w-md mx-auto",
              "transition-all duration-300",
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
            style={{
              transitionDelay: delayContent ? "300ms" : "150ms"
            }}>
              {description}
            </CardDescription>
          )}
        </div>

        {showSeparator && (
          <Separator className={cn(
            "transition-all duration-300",
            showContent ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
          )}
          style={{
            transitionDelay: delayContent ? "350ms" : "200ms"
          }} />
        )}
      </CardHeader>

      <CardContent className={cn(
        "space-y-6 transition-all duration-400 ease-spring",
        showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        contentClassName
      )}
      style={{
        transitionDelay: delayContent ? "400ms" : "250ms"
      }}>
        {children}
      </CardContent>
    </Card>
  );
}

// Specialized step layouts for different step types
export function WelcomeStep({
  title,
  description,
  children,
  className,
  ...props
}: Omit<WizardStepProps, "icon" | "maxWidth">) {
  return (
    <WizardStep
      title={title}
      description={description}
      maxWidth="xl"
      animationDirection="up"
      delayContent={true}
      className={cn(
        "border-primary/20 shadow-lg",
        "hover:shadow-xl hover:border-primary/30",
        className
      )}
      {...props}
    >
      {children}
    </WizardStep>
  );
}

export function FormStep({
  title,
  description,
  children,
  className,
  ...props
}: Omit<WizardStepProps, "maxWidth">) {
  return (
    <WizardStep
      title={title}
      description={description}
      maxWidth="2xl"
      animationDirection="right"
      delayContent={true}
      className={cn(
        "hover:shadow-md transition-shadow duration-300",
        className
      )}
      {...props}
    >
      {children}
    </WizardStep>
  );
}

export function CompletionStep({
  title,
  description,
  children,
  className,
  ...props
}: Omit<WizardStepProps, "icon" | "maxWidth">) {
  return (
    <WizardStep
      title={title}
      description={description}
      maxWidth="lg"
      animationDirection="up"
      delayContent={true}
      className={cn(
        "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10",
        "shadow-lg shadow-green-100/50 dark:shadow-green-900/20",
        "hover:shadow-xl hover:shadow-green-200/50 dark:hover:shadow-green-800/30",
        "animate-pulse-subtle",
        className
      )}
      {...props}
    >
      {children}
    </WizardStep>
  );
}