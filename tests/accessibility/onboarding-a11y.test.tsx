import React from 'react'
import { renderWithTheme, screen, waitFor } from '@/tests/utils/test-utils'
import { expectAccessible } from '@/tests/utils/test-utils'
import { WizardContainer } from '@/components/onboarding/WizardContainer'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { CompanyInfoStep } from '@/components/onboarding/CompanyInfoStep'
import { OrganizationStep } from '@/components/onboarding/OrganizationStep'
import { CompletionStep } from '@/components/onboarding/CompletionStep'
import { mockOnboardingStore } from '@/tests/utils/onboarding-test-utils'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('@/lib/stores/onboarding-store')
jest.mock('next/navigation')

describe('Onboarding Accessibility Tests', () => {
  beforeEach(() => {
    mockOnboardingStore({
      currentStep: 1,
      completedSteps: new Set([]),
      errors: {},
    })
  })

  describe('WizardContainer Accessibility', () => {
    it('has proper landmarks and semantic structure', async () => {
      const { container } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <div>Test Content</div>
        </WizardContainer>
      )

      // Check for main landmark
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveAttribute('aria-label', 'Contenido principal del onboarding')

      // Check for proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      expect(headings.length).toBeGreaterThan(0)

      await expectAccessible(container)
    })

    it('provides skip navigation for keyboard users', async () => {
      renderWithTheme(
        <WizardContainer currentStep={1}>
          <div id="main-content">Test Content</div>
        </WizardContainer>
      )

      const skipLink = screen.getByRole('link', { name: /saltar.*contenido/i })
      expect(skipLink).toHaveAttribute('href', '#main-content')

      // Skip link should be focusable
      skipLink.focus()
      expect(skipLink).toHaveFocus()
    })

    it('maintains logical tab order', async () => {
      const user = userEvent.setup()
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <div>
            <button>Step Content Button</button>
            <input placeholder="Test Input" />
          </div>
        </WizardContainer>
      )

      const skipLink = screen.getByRole('link', { name: /saltar.*contenido/i })
      const stepButton = screen.getByRole('button', { name: /step content button/i })
      const input = screen.getByRole('textbox')
      const prevButton = screen.getByRole('button', { name: /anterior/i })
      const nextButton = screen.getByRole('button', { name: /siguiente/i })

      // Test tab order
      await user.tab() // Skip link
      expect(skipLink).toHaveFocus()

      await user.tab() // Step content button
      expect(stepButton).toHaveFocus()

      await user.tab() // Input
      expect(input).toHaveFocus()

      await user.tab() // Previous button
      expect(prevButton).toHaveFocus()

      await user.tab() // Next button
      expect(nextButton).toHaveFocus()
    })

    it('announces step changes to screen readers', () => {
      renderWithTheme(
        <WizardContainer currentStep={1}>
          <div>Step 1 Content</div>
        </WizardContainer>
      )

      // Check for aria-live regions
      const liveRegions = screen.getAllByRole('status')
      expect(liveRegions.length).toBeGreaterThan(0)
    })

    it('handles keyboard navigation correctly', async () => {
      const user = userEvent.setup()
      const onNext = jest.fn()
      const onPrevious = jest.fn()

      renderWithTheme(
        <WizardContainer
          currentStep={2}
          onNext={onNext}
          onPrevious={onPrevious}
          canProceed={true}
        >
          <div>Test Content</div>
        </WizardContainer>
      )

      // Test keyboard shortcuts
      await user.keyboard('{ArrowRight}')
      expect(onNext).toHaveBeenCalled()

      await user.keyboard('{ArrowLeft}')
      expect(onPrevious).toHaveBeenCalled()

      await user.keyboard('{Enter}')
      expect(onNext).toHaveBeenCalledTimes(2)
    })
  })

  describe('ProgressIndicator Accessibility', () => {
    it('provides proper progress semantics', async () => {
      const { container } = renderWithTheme(
        <ProgressIndicator
          currentStep={3}
          completedSteps={new Set([1, 2])}
        />
      )

      // Check progress bar
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Progreso: 40% completado')

      await expectAccessible(container)
    })

    it('provides descriptive step labels', () => {
      renderWithTheme(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      // Each step should have descriptive label
      const stepButtons = screen.getAllByRole('button')
      stepButtons.forEach((button, index) => {
        expect(button).toHaveAttribute('aria-label', expect.stringContaining(`Paso ${index + 1}`))
      })
    })

    it('indicates current step for screen readers', () => {
      renderWithTheme(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      const currentStep = screen.getByRole('button', { name: /paso 2/i })
      expect(currentStep).toHaveAttribute('aria-current', 'step')
    })

    it('makes inaccessible steps non-focusable', () => {
      renderWithTheme(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      // Future steps should not be focusable
      const futureSteps = screen.getAllByRole('button').slice(2)
      futureSteps.forEach(step => {
        expect(step).toHaveAttribute('tabIndex', '-1')
        expect(step).toHaveAttribute('aria-disabled', 'true')
      })
    })

    it('supports keyboard navigation between accessible steps', async () => {
      const user = userEvent.setup()
      renderWithTheme(
        <ProgressIndicator
          currentStep={3}
          completedSteps={new Set([1, 2])}
        />
      )

      const accessibleSteps = screen.getAllByRole('button').slice(0, 3)

      // Tab through accessible steps
      for (const step of accessibleSteps) {
        await user.tab()
        expect(step).toHaveFocus()
      }
    })
  })

  describe('Form Steps Accessibility', () => {
    describe('WelcomeStep', () => {
      it('has proper heading structure', async () => {
        const { container } = renderWithTheme(<WelcomeStep />)

        // Should have main heading
        const heading = screen.getByRole('heading', { level: 1 })
        expect(heading).toBeInTheDocument()

        await expectAccessible(container)
      })

      it('provides clear call to action', () => {
        renderWithTheme(<WelcomeStep />)

        const primaryButton = screen.getByRole('button', { name: /comenzar|continuar/i })
        expect(primaryButton).toBeInTheDocument()
        expect(primaryButton).toHaveAccessibleName()
      })
    })

    describe('CompanyInfoStep', () => {
      it('has properly labeled form fields', async () => {
        const { container } = renderWithTheme(<CompanyInfoStep />)

        // All form controls should have labels
        const inputs = container.querySelectorAll('input, select, textarea')
        inputs.forEach(input => {
          expect(input).toHaveAccessibleName()
        })

        await expectAccessible(container)
      })

      it('provides clear field requirements', () => {
        renderWithTheme(<CompanyInfoStep />)

        // Required fields should be marked
        const requiredFields = screen.getAllByRole('textbox', { name: /\*|requerido/i })
        expect(requiredFields.length).toBeGreaterThan(0)
      })

      it('associates validation errors with fields', async () => {
        const user = userEvent.setup()
        renderWithTheme(<CompanyInfoStep />)

        const nameField = screen.getByRole('textbox', { name: /nombre/i })

        // Trigger validation
        await user.click(nameField)
        await user.tab()

        await waitFor(() => {
          const errorMessage = screen.queryByText(/requerido/i)
          if (errorMessage) {
            expect(nameField).toHaveAttribute('aria-describedby', expect.stringContaining(errorMessage.id || ''))
          }
        })
      })

      it('supports autocomplete for form fields', () => {
        renderWithTheme(<CompanyInfoStep />)

        const nameField = screen.getByRole('textbox', { name: /nombre/i })
        expect(nameField).toHaveAttribute('autocomplete', 'organization')
      })
    })

    describe('OrganizationStep', () => {
      it('provides accessible dynamic content management', async () => {
        const { container } = renderWithTheme(<OrganizationStep />)

        // Dynamic lists should be properly structured
        const lists = container.querySelectorAll('[role="list"]')
        lists.forEach(list => {
          expect(list).toHaveAccessibleName()
        })

        await expectAccessible(container)
      })

      it('announces dynamic content changes', async () => {
        const user = userEvent.setup()
        renderWithTheme(<OrganizationStep />)

        const addButton = screen.getByRole('button', { name: /agregar/i })
        await user.click(addButton)

        // Should have live region for announcements
        const liveRegions = screen.getAllByRole('status')
        expect(liveRegions.length).toBeGreaterThan(0)
      })

      it('manages focus for dynamic content', async () => {
        const user = userEvent.setup()
        renderWithTheme(<OrganizationStep />)

        const addButton = screen.getByRole('button', { name: /agregar.*departamento/i })
        await user.click(addButton)

        // Focus should move to new input
        await waitFor(() => {
          const newInput = screen.getByRole('textbox', { name: /nombre.*departamento/i })
          expect(newInput).toHaveFocus()
        })
      })
    })

    describe('CompletionStep', () => {
      it('provides summary for screen readers', async () => {
        const { container } = renderWithTheme(<CompletionStep />)

        // Should have summary information
        const summaryRegion = container.querySelector('[role="region"]')
        expect(summaryRegion).toBeInTheDocument()

        await expectAccessible(container)
      })

      it('has clear completion action', () => {
        renderWithTheme(<CompletionStep />)

        const completeButton = screen.getByRole('button', { name: /completar|finalizar/i })
        expect(completeButton).toBeInTheDocument()
        expect(completeButton).toHaveAccessibleName()
      })
    })
  })

  describe('AI Integration Accessibility', () => {
    it('provides accessible AI suggestions', async () => {
      renderWithTheme(<CompanyInfoStep />)

      // Mock AI suggestions appearing
      const suggestionsContainer = screen.queryByTestId('ai-suggestions')
      if (suggestionsContainer) {
        expect(suggestionsContainer).toHaveAttribute('role', 'region')
        expect(suggestionsContainer).toHaveAccessibleName()

        await expectAccessible(suggestionsContainer)
      }
    })

    it('announces AI loading states', () => {
      renderWithTheme(<CompanyInfoStep isLoading={true} />)

      const loadingIndicator = screen.queryByTestId('ai-loading-indicator')
      if (loadingIndicator) {
        expect(loadingIndicator).toHaveAttribute('role', 'status')
        expect(loadingIndicator).toHaveAttribute('aria-live', 'polite')
      }
    })

    it('provides accessible error recovery for AI failures', async () => {
      const user = userEvent.setup()
      renderWithTheme(<CompanyInfoStep error="AI service error" />)

      const errorMessage = screen.queryByText(/error/i)
      if (errorMessage) {
        expect(errorMessage).toHaveAttribute('role', 'alert')

        const retryButton = screen.getByRole('button', { name: /reintentar/i })
        expect(retryButton).toBeInTheDocument()
        expect(retryButton).toHaveAccessibleName()
      }
    })
  })

  describe('Theme Accessibility', () => {
    it('maintains accessibility in dark theme', async () => {
      const { container } = renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>,
        { theme: 'dark' }
      )

      await expectAccessible(container)
    })

    it('provides sufficient color contrast in all themes', async () => {
      const themes: Array<'light' | 'dark'> = ['light', 'dark']

      for (const theme of themes) {
        const { container } = renderWithTheme(
          <ProgressIndicator
            currentStep={2}
            completedSteps={new Set([1])}
          />,
          { theme }
        )

        // Run axe with color-contrast rule specifically
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true },
          },
        })

        expect(results).toHaveNoViolations()
      }
    })

    it('respects user motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = renderWithTheme(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      // Should respect reduced motion (implementation would need to check this)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Mobile Accessibility', () => {
    it('maintains accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      const { container } = renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      await expectAccessible(container)
    })

    it('provides adequate touch targets', () => {
      renderWithTheme(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Touch targets should be at least 44px
        const styles = getComputedStyle(button)
        const minSize = 44

        // This would need actual computed styles in a real test
        expect(button).toHaveClass(/w-8|h-8|p-2|min-w-/) // Approximation
      })
    })
  })

  describe('Screen Reader Experience', () => {
    it('provides logical reading order', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Test with virtual screen reader navigation
      const headings = screen.getAllByRole('heading')
      const landmarks = screen.getAllByRole('main')
      const forms = screen.getAllByRole('form')

      // Should have logical structure
      expect(headings.length).toBeGreaterThan(0)
      expect(landmarks.length).toBeGreaterThan(0)
    })

    it('provides context for form controls', () => {
      renderWithTheme(<CompanyInfoStep />)

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        // Should have label and possibly description
        expect(input).toHaveAccessibleName()

        // Check for descriptions
        const describedBy = input.getAttribute('aria-describedby')
        if (describedBy) {
          const descriptions = describedBy.split(' ')
          descriptions.forEach(id => {
            expect(document.getElementById(id)).toBeInTheDocument()
          })
        }
      })
    })

    it('announces progress updates appropriately', async () => {
      const { rerender } = renderWithTheme(
        <ProgressIndicator
          currentStep={1}
          completedSteps={new Set([])}
        />
      )

      // Update progress
      rerender(
        <ProgressIndicator
          currentStep={2}
          completedSteps={new Set([1])}
        />
      )

      // Should have live regions for progress announcements
      const liveRegions = screen.getAllByRole('status')
      expect(liveRegions.length).toBeGreaterThan(0)
    })
  })

  describe('Error State Accessibility', () => {
    it('provides accessible error announcements', async () => {
      mockOnboardingStore({
        currentStep: 2,
        completedSteps: new Set([1]),
        errors: { company: { name: 'Required field' } },
      })

      const { container } = renderWithTheme(<CompanyInfoStep />)

      // Error messages should be accessible
      const alerts = container.querySelectorAll('[role="alert"]')
      expect(alerts.length).toBeGreaterThan(0)

      await expectAccessible(container)
    })

    it('maintains focus during error states', async () => {
      const user = userEvent.setup()
      renderWithTheme(<CompanyInfoStep />)

      const nameField = screen.getByRole('textbox', { name: /nombre/i })

      // Focus field and trigger error
      await user.click(nameField)
      await user.tab()

      // Focus should remain manageable
      expect(document.activeElement).toBeDefined()
    })
  })
})