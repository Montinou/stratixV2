import React from 'react'
import { renderWithTheme, screen, waitFor } from '@/tests/utils/test-utils'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { WIZARD_STEPS } from '@/lib/types/onboarding'
import userEvent from '@testing-library/user-event'

describe('ProgressIndicator', () => {
  const defaultProps = {
    currentStep: 1,
    completedSteps: new Set<number>(),
  }

  describe('Rendering', () => {
    it('renders progress bar correctly', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Progreso: 0% completado')
    })

    it('renders step indicators for all wizard steps', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} />)

      WIZARD_STEPS.forEach((step, index) => {
        const stepButton = screen.getByRole('button', {
          name: `Paso ${index + 1}: ${step.title}`,
        })
        expect(stepButton).toBeInTheDocument()
      })
    })

    it('applies custom className', () => {
      const { container } = renderWithTheme(
        <ProgressIndicator {...defaultProps} className="custom-progress" />
      )

      expect(container.firstChild).toHaveClass('custom-progress')
    })
  })

  describe('Progress Calculation', () => {
    it('calculates progress correctly with no completed steps', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} />)

      expect(screen.getByText('0 de 5')).toBeInTheDocument()
      expect(screen.getByText('0% completado')).toBeInTheDocument()
    })

    it('calculates progress correctly with some completed steps', () => {
      const completedSteps = new Set([1, 2])
      renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      expect(screen.getByText('2 de 5')).toBeInTheDocument()
      expect(screen.getByText('40% completado')).toBeInTheDocument()
    })

    it('calculates progress correctly with all steps completed', () => {
      const completedSteps = new Set([1, 2, 3, 4, 5])
      renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      expect(screen.getByText('5 de 5')).toBeInTheDocument()
      expect(screen.getByText('100% completado')).toBeInTheDocument()
    })
  })

  describe('Step States', () => {
    it('marks current step correctly', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} currentStep={2} />)

      const currentStepButton = screen.getByRole('button', {
        name: `Paso 2: ${WIZARD_STEPS[1].title}`,
      })
      expect(currentStepButton).toHaveAttribute('aria-current', 'step')
    })

    it('marks completed steps correctly', () => {
      const completedSteps = new Set([1, 2])
      renderWithTheme(
        <ProgressIndicator
          {...defaultProps}
          currentStep={3}
          completedSteps={completedSteps}
        />
      )

      // Completed steps should have checkmark
      const completedStep1 = screen.getByRole('button', {
        name: `Paso 1: ${WIZARD_STEPS[0].title}`,
      })
      expect(completedStep1).toHaveClass('bg-primary')

      const completedStep2 = screen.getByRole('button', {
        name: `Paso 2: ${WIZARD_STEPS[1].title}`,
      })
      expect(completedStep2).toHaveClass('bg-primary')
    })

    it('marks inaccessible steps correctly', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} currentStep={1} />)

      // Steps 3, 4, 5 should be inaccessible
      const inaccessibleStep = screen.getByRole('button', {
        name: `Paso 3: ${WIZARD_STEPS[2].title}`,
      })
      expect(inaccessibleStep).toHaveAttribute('aria-disabled', 'true')
      expect(inaccessibleStep).toHaveAttribute('tabIndex', '-1')
    })

    it('determines accessibility correctly based on completed steps', () => {
      const completedSteps = new Set([1, 2])
      renderWithTheme(
        <ProgressIndicator
          {...defaultProps}
          currentStep={3}
          completedSteps={completedSteps}
        />
      )

      // Step 3 should be accessible (current)
      const step3 = screen.getByRole('button', {
        name: `Paso 3: ${WIZARD_STEPS[2].title}`,
      })
      expect(step3).toHaveAttribute('tabIndex', '0')

      // Step 4 should not be accessible
      const step4 = screen.getByRole('button', {
        name: `Paso 4: ${WIZARD_STEPS[3].title}`,
      })
      expect(step4).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Visual Elements', () => {
    it('shows completion badge with correct styling', () => {
      const completedSteps = new Set([1, 2, 3, 4, 5])
      renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      const badge = screen.getByText('5 de 5')
      expect(badge.closest('.bg-green-100')).toBeInTheDocument()
    })

    it('renders progress flow animation when in progress', () => {
      const completedSteps = new Set([1, 2])
      const { container } = renderWithTheme(
        <ProgressIndicator
          {...defaultProps}
          currentStep={3}
          completedSteps={completedSteps}
        />
      )

      const progressFlow = container.querySelector('.animate-progress-flow')
      expect(progressFlow).toBeInTheDocument()
    })

    it('does not render progress flow when completed', () => {
      const completedSteps = new Set([1, 2, 3, 4, 5])
      const { container } = renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      const progressFlow = container.querySelector('.animate-progress-flow')
      expect(progressFlow).not.toBeInTheDocument()
    })
  })

  describe('Connection Lines', () => {
    it('renders connection lines between steps', () => {
      const { container } = renderWithTheme(<ProgressIndicator {...defaultProps} />)

      // Should have connector lines (one less than total steps)
      const connectors = container.querySelectorAll('.flex-1.h-0\\.5')
      expect(connectors).toHaveLength(WIZARD_STEPS.length - 1)
    })

    it('fills connection lines based on completed steps', () => {
      const completedSteps = new Set([1, 2])
      const { container } = renderWithTheme(
        <ProgressIndicator
          {...defaultProps}
          currentStep={3}
          completedSteps={completedSteps}
        />
      )

      // First connector should be fully filled (both steps completed)
      const firstConnector = container.querySelector('.w-full')
      expect(firstConnector).toBeInTheDocument()
    })

    it('shows shimmer animation on active connections', () => {
      const completedSteps = new Set([1])
      const { container } = renderWithTheme(
        <ProgressIndicator
          {...defaultProps}
          currentStep={2}
          completedSteps={completedSteps}
        />
      )

      const shimmer = container.querySelector('.animate-shimmer')
      expect(shimmer).toBeInTheDocument()
    })
  })

  describe('Animations', () => {
    it('animates progress changes with delay', async () => {
      const { rerender } = renderWithTheme(<ProgressIndicator {...defaultProps} />)

      // Initially 0%
      expect(screen.getByText('0% completado')).toBeInTheDocument()

      // Update to 40%
      const completedSteps = new Set([1, 2])
      rerender(<ProgressIndicator {...defaultProps} completedSteps={completedSteps} />)

      // Should eventually show 40%
      await waitFor(
        () => {
          expect(screen.getByText('40% completado')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('animates step count changes', async () => {
      const { rerender } = renderWithTheme(<ProgressIndicator {...defaultProps} />)

      // Initially 0 of 5
      expect(screen.getByText('0 de 5')).toBeInTheDocument()

      // Update to 2 of 5
      const completedSteps = new Set([1, 2])
      rerender(<ProgressIndicator {...defaultProps} completedSteps={completedSteps} />)

      // Should eventually show 2 of 5
      await waitFor(
        () => {
          expect(screen.getByText('2 de 5')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('applies staggered animations to step indicators', () => {
      const { container } = renderWithTheme(<ProgressIndicator {...defaultProps} />)

      const stepIndicators = container.querySelectorAll('[style*="animation-delay"]')
      expect(stepIndicators.length).toBeGreaterThan(0)

      // Check that animation delays are staggered
      stepIndicators.forEach((indicator, index) => {
        const expectedDelay = `${index * 50}ms`
        expect(indicator).toHaveStyle(`animation-delay: ${expectedDelay}`)
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for progress bar', () => {
      const completedSteps = new Set([1, 2])
      renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Progreso: 40% completado')
    })

    it('provides proper ARIA labels for step buttons', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} currentStep={2} />)

      WIZARD_STEPS.forEach((step, index) => {
        const stepButton = screen.getByRole('button', {
          name: `Paso ${index + 1}: ${step.title}`,
        })

        if (index + 1 === 2) {
          expect(stepButton).toHaveAttribute('aria-current', 'step')
        } else {
          expect(stepButton).not.toHaveAttribute('aria-current')
        }
      })
    })

    it('makes inaccessible steps non-focusable', () => {
      renderWithTheme(<ProgressIndicator {...defaultProps} currentStep={1} />)

      // Step 3 should not be focusable
      const step3 = screen.getByRole('button', {
        name: `Paso 3: ${WIZARD_STEPS[2].title}`,
      })
      expect(step3).toHaveAttribute('tabIndex', '-1')
      expect(step3).toHaveAttribute('aria-disabled', 'true')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithTheme(<ProgressIndicator {...defaultProps} currentStep={2} />)

      // Focus first accessible step
      const step1 = screen.getByRole('button', {
        name: `Paso 1: ${WIZARD_STEPS[0].title}`,
      })

      await user.tab()
      expect(step1).toHaveFocus()

      // Tab to next accessible step
      await user.tab()
      const step2 = screen.getByRole('button', {
        name: `Paso 2: ${WIZARD_STEPS[1].title}`,
      })
      expect(step2).toHaveFocus()
    })
  })

  describe('Theme Support', () => {
    it('renders correctly in light theme', () => {
      const { container } = renderWithTheme(<ProgressIndicator {...defaultProps} />, {
        theme: 'light',
      })

      expect(container).toMatchSnapshot('progress-light-theme')
    })

    it('renders correctly in dark theme', () => {
      const { container } = renderWithTheme(<ProgressIndicator {...defaultProps} />, {
        theme: 'dark',
      })

      expect(container).toMatchSnapshot('progress-dark-theme')
    })

    it('adapts colors based on theme', () => {
      const { container: lightContainer } = renderWithTheme(
        <ProgressIndicator {...defaultProps} />,
        { theme: 'light' }
      )

      const { container: darkContainer } = renderWithTheme(
        <ProgressIndicator {...defaultProps} />,
        { theme: 'dark' }
      )

      // Both should have theme-appropriate styling
      expect(lightContainer.firstChild).toHaveClass('animate-gpu')
      expect(darkContainer.firstChild).toHaveClass('animate-gpu')
    })
  })

  describe('Performance', () => {
    it('handles rapid progress updates efficiently', () => {
      const { rerender } = renderWithTheme(<ProgressIndicator {...defaultProps} />)

      const startTime = performance.now()

      // Simulate rapid progress updates
      for (let i = 0; i <= 5; i++) {
        const completedSteps = new Set(Array.from({ length: i }, (_, idx) => idx + 1))
        rerender(<ProgressIndicator {...defaultProps} completedSteps={completedSteps} />)
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      // Should handle updates efficiently
      expect(updateTime).toBeLessThan(100)
    })

    it('memoizes step calculations correctly', () => {
      const completedSteps = new Set([1, 2])
      const { rerender } = renderWithTheme(
        <ProgressIndicator {...defaultProps} completedSteps={completedSteps} />
      )

      // Re-render with same props should not cause unnecessary calculations
      rerender(<ProgressIndicator {...defaultProps} completedSteps={completedSteps} />)

      // Component should render consistently
      expect(screen.getByText('40% completado')).toBeInTheDocument()
    })
  })
})