'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// Form Field Skeleton
export function FormFieldSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-3 w-32 opacity-60" />
    </div>
  );
}

// Form Group Skeleton (multiple fields)
export function FormGroupSkeleton({
  className,
  fields = 3
}: SkeletonProps & { fields?: number }) {
  return (
    <div className={cn("space-y-6 animate-gpu", className)}>
      {Array.from({ length: fields }, (_, index) => (
        <FormFieldSkeleton
          key={index}
          className={cn("transition-opacity duration-300")}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        />
      ))}
    </div>
  );
}

// Step Header Skeleton
export function StepHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-4 text-center animate-gpu", className)}>
      {/* Icon placeholder */}
      <div className="flex justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto opacity-70" />
      </div>

      <Separator className="opacity-50" />
    </div>
  );
}

// Complete Step Skeleton
export function StepSkeleton({
  className,
  showHeader = true,
  fields = 3,
  showNavigation = true
}: SkeletonProps & {
  showHeader?: boolean;
  fields?: number;
  showNavigation?: boolean;
}) {
  return (
    <Card className={cn(
      "w-full mx-auto max-w-lg animate-gpu",
      "transition-all duration-300 ease-spring",
      className
    )}>
      {showHeader && (
        <CardHeader>
          <StepHeaderSkeleton />
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        <FormGroupSkeleton fields={fields} />

        {showNavigation && (
          <div className="flex justify-between items-center pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Progress Skeleton
export function ProgressSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-4 animate-gpu", className)}>
      {/* Progress header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-1/3 animate-shimmer" />
        </Skeleton>
        <div className="text-right">
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center relative">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col items-center space-y-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}

        {/* Connector lines */}
        <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 -z-10">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="flex-1 h-0.5 mx-2"
              style={{
                animationDelay: `${index * 200}ms`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Input Field Skeleton with animations
export function InputSkeleton({
  className,
  label = true,
  helper = true
}: SkeletonProps & {
  label?: boolean;
  helper?: boolean;
}) {
  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      {label && (
        <Skeleton className={cn(
          "h-4 w-20 transition-opacity duration-300"
        )} />
      )}
      <div className="relative">
        <Skeleton className={cn(
          "h-10 w-full rounded-md relative overflow-hidden",
          "transition-all duration-300"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent w-1/2 animate-shimmer" />
        </Skeleton>
      </div>
      {helper && (
        <Skeleton className={cn(
          "h-3 w-28 opacity-60 transition-opacity duration-300"
        )} />
      )}
    </div>
  );
}

// Select Field Skeleton
export function SelectSkeleton({
  className,
  label = true
}: SkeletonProps & {
  label?: boolean;
}) {
  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      {label && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-10 w-full rounded-md relative overflow-hidden">
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Skeleton className="h-4 w-4" />
        </div>
      </Skeleton>
    </div>
  );
}

// Checkbox Group Skeleton
export function CheckboxGroupSkeleton({
  className,
  items = 3
}: SkeletonProps & { items?: number }) {
  return (
    <div className={cn("space-y-3 animate-gpu", className)}>
      {Array.from({ length: items }, (_, index) => (
        <div
          key={index}
          className="flex items-center space-x-3"
          style={{
            animationDelay: `${index * 75}ms`
          }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

// Navigation Skeleton
export function NavigationSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 animate-gpu",
      "transition-all duration-300",
      className
    )}>
      <Skeleton className="h-10 w-24" />
      <div className="flex-1" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Company Info specific skeleton
export function CompanyInfoSkeleton({ className }: SkeletonProps) {
  return (
    <StepSkeleton
      className={className}
      fields={0}
      showNavigation={false}
    >
      <div className="space-y-6">
        {/* Company name and description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputSkeleton />
          <SelectSkeleton />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>

        {/* Team size and industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectSkeleton />
          <SelectSkeleton />
        </div>
      </div>
    </StepSkeleton>
  );
}

// Organization structure skeleton
export function OrganizationSkeleton({ className }: SkeletonProps) {
  return (
    <StepSkeleton
      className={className}
      fields={0}
      showNavigation={false}
    >
      <div className="space-y-6">
        {/* Department structure */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <CheckboxGroupSkeleton items={4} />
        </div>

        {/* OKR frequency */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </StepSkeleton>
  );
}

// Loading state wrapper with fade-in animation
export function LoadingWrapper({
  isLoading,
  skeleton,
  children,
  className
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative animate-gpu", className)}>
      <div
        className={cn(
          "transition-all duration-300 ease-spring",
          isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {skeleton}
      </div>
      <div
        className={cn(
          "transition-all duration-300 ease-spring",
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100",
          !isLoading && "step-enter-active"
        )}
      >
        {children}
      </div>
    </div>
  );
}