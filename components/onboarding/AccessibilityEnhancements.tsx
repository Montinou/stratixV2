'use client';

import { useEffect, useRef, RefObject, ReactNode } from 'react';
import { useAccessibility } from './AccessibilityProvider';

interface FocusManagementProps {
  children: ReactNode;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export function FocusManagement({
  children,
  autoFocus = true,
  restoreFocus = true
}: FocusManagementProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [data-step-title]'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        if (firstElement) {
          firstElement.focus();
        }
      }, 100);
    }

    return () => {
      // Restore focus when component unmounts
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  return (
    <div ref={containerRef} className="focus-management-container">
      {children}
    </div>
  );
}

interface SkipNavigationProps {
  targets: Array<{
    id: string;
    label: string;
  }>;
}

export function SkipNavigation({ targets }: SkipNavigationProps) {
  return (
    <nav className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-50">
      <ul className="flex gap-2">
        {targets.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="skip-link bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface AccessibleHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}

export function AccessibleHeading({
  level,
  children,
  className,
  id,
  tabIndex = -1
}: AccessibleHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag
      id={id}
      className={className}
      tabIndex={tabIndex}
      data-step-title
    >
      {children}
    </Tag>
  );
}

interface AccessibleFormFieldProps {
  children: ReactNode;
  error?: string;
  description?: string;
  required?: boolean;
}

export function AccessibleFormField({
  children,
  error,
  description,
  required
}: AccessibleFormFieldProps) {
  const fieldId = useRef(`field-${Math.random().toString(36).substr(2, 9)}`);
  const errorId = error ? `${fieldId.current}-error` : undefined;
  const descriptionId = description ? `${fieldId.current}-description` : undefined;

  return (
    <div className="accessible-form-field">
      {children}
      {description && (
        <div
          id={descriptionId}
          className="text-sm text-muted-foreground mt-1"
          role="note"
        >
          {description}
        </div>
      )}
      {error && (
        <div
          id={errorId}
          className="text-sm text-destructive mt-1"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  className?: string;
}

export function AccessibleProgress({
  currentStep,
  totalSteps,
  stepTitle,
  className
}: AccessibleProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={className}>
      <div className="sr-only">
        <div
          role="status"
          aria-live="polite"
          aria-label={`Paso ${currentStep} de ${totalSteps}: ${stepTitle}`}
        >
          Progreso: {percentage.toFixed(0)}% completado
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Progreso del onboarding: ${currentStep} de ${totalSteps} pasos completados`}
        className="w-full bg-muted rounded-full h-2"
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out progress-animate"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="text-sm text-muted-foreground mt-2 text-center">
        Paso {currentStep} de {totalSteps}: {stepTitle}
      </div>
    </div>
  );
}

interface KeyboardNavigationProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation({
  onNext,
  onPrevious,
  onEscape,
  disabled = false
}: KeyboardNavigationProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Don't interfere with form inputs
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onNext?.();
          }
          break;
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onPrevious?.();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onEscape, disabled]);
}

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({
  children,
  loading = false,
  loadingText = 'Cargando...',
  className,
  disabled,
  'aria-describedby': ariaDescribedBy,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Hook for announcing dynamic content changes
export function useAccessibilityAnnouncer() {
  const { announceSuccess, announceError } = useAccessibility();

  const announceFormValidation = (errors: Record<string, any>) => {
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      announceError(`Se encontraron ${errorCount} error${errorCount > 1 ? 'es' : ''} en el formulario. Por favor revisa los campos marcados.`);
    }
  };

  const announceFormSuccess = (message: string = 'Formulario enviado exitosamente') => {
    announceSuccess(message);
  };

  const announceStepChange = (stepNumber: number, stepTitle: string) => {
    announceSuccess(`Avanzaste al paso ${stepNumber}: ${stepTitle}`);
  };

  return {
    announceFormValidation,
    announceFormSuccess,
    announceStepChange,
  };
}