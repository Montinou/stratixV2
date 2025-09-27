'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { WIZARD_STEPS } from '@/lib/types/onboarding';

interface AccessibilityContextType {
  announceStep: (step: number) => void;
  announceProgress: (completed: number, total: number) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const { currentStep, completedSteps } = useOnboardingStore();

  // Create live region for announcements
  useEffect(() => {
    const liveRegion = document.getElementById('onboarding-live-region');
    if (!liveRegion) {
      const region = document.createElement('div');
      region.id = 'onboarding-live-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }

    return () => {
      const region = document.getElementById('onboarding-live-region');
      if (region) {
        document.body.removeChild(region);
      }
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('onboarding-live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  const announceStep = (step: number) => {
    const stepConfig = WIZARD_STEPS[step - 1];
    if (stepConfig) {
      announce(`Paso ${step} de ${WIZARD_STEPS.length}: ${stepConfig.title}. ${stepConfig.description}`);
    }
  };

  const announceProgress = (completed: number, total: number) => {
    const percentage = Math.round((completed / total) * 100);
    announce(`Progreso actualizado: ${completed} de ${total} pasos completados, ${percentage} por ciento`);
  };

  const announceError = (message: string) => {
    announce(`Error: ${message}`, 'assertive');
  };

  const announceSuccess = (message: string) => {
    announce(`Éxito: ${message}`, 'polite');
  };

  // Announce step changes
  useEffect(() => {
    announceStep(currentStep);
  }, [currentStep]);

  // Announce progress changes
  useEffect(() => {
    if (completedSteps.size > 0) {
      announceProgress(completedSteps.size, WIZARD_STEPS.length);
    }
  }, [completedSteps]);

  // Focus management
  useEffect(() => {
    // Focus the main content when step changes
    const mainContent = document.querySelector('main h1, main h2, main [data-step-title]');
    if (mainContent instanceof HTMLElement) {
      mainContent.focus();
    }
  }, [currentStep]);

  const contextValue = {
    announceStep,
    announceProgress,
    announceError,
    announceSuccess,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook for managing focus traps in modals/dialogs
export function useFocusTrap(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');

    if (!modal) return;

    const firstFocusableElement = modal.querySelector(focusableElements) as HTMLElement;
    const focusableContent = modal.querySelectorAll(focusableElements);
    const lastFocusableElement = focusableContent[focusableContent.length - 1] as HTMLElement;

    // Focus first element
    firstFocusableElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);
}

// Skip link component for keyboard navigation
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg transition-all"
    >
      Saltar al contenido principal
    </a>
  );
}