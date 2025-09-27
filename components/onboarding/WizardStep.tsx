'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

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
  maxWidth = "lg"
}: WizardStepProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full"
  };

  return (
    <Card className={cn(
      "w-full mx-auto transition-all duration-200",
      maxWidthClasses[maxWidth],
      className
    )}>
      <CardHeader className={cn("space-y-4", headerClassName)}>
        {icon && (
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
              {description}
            </CardDescription>
          )}
        </div>

        {showSeparator && <Separator />}
      </CardHeader>

      <CardContent className={cn("space-y-6", contentClassName)}>
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
      className={cn("border-primary/20", className)}
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
      className={className}
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
      className={cn("border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10", className)}
      {...props}
    >
      {children}
    </WizardStep>
  );
}