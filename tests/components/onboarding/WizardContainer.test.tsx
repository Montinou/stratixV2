import React from 'react'
import { renderWithTheme, screen, waitFor } from '@/tests/utils/test-utils'
import { WizardContainer, OnboardingLayout } from '@/components/onboarding/WizardContainer'
import { mockOnboardingStore } from '@/tests/utils/onboarding-test-utils'
import userEvent from '@testing-library/user-event'

// Mock dependencies
jest.mock('@/lib/stores/onboarding-store')
jest.mock('next/navigation')

describe('WizardContainer', () => {
  const defaultProps = {
    currentStep: 1,
    children: <div>Test Content</div>,
  }

  beforeEach(() => {
    mockOnboardingStore({
      currentStep: 1,
      completedSteps: new Set([]),
      errors: {},
    })
  })

  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = renderWithTheme(
        <WizardContainer {...defaultProps} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('applies correct ARIA attributes', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)

      const main = screen.getByRole('main')
      expect(main).toHaveAttribute('aria-label', 'Contenido principal del onboarding')
      expect(main).toHaveAttribute('id', 'main-content')
    })
  })

  describe('Progress Indicator', () => {
    it('shows progress indicator by default', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('hides progress indicator when showProgress is false', () => {
      renderWithTheme(<WizardContainer {...defaultProps} showProgress={false} />)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('displays correct progress for completed steps', () => {
      mockOnboardingStore({
        currentStep: 3,
        completedSteps: new Set([1, 2]),
      })

      renderWithTheme(<WizardContainer {...defaultProps} currentStep={3} />)

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-label', expect.stringContaining('40%'))
    })
  })

  describe('Navigation', () => {
    it('shows navigation by default', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)
      expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument()
    })

    it('hides navigation when showNavigation is false', () => {
      renderWithTheme(<WizardContainer {...defaultProps} showNavigation={false} />)
      expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument()
    })

    it('calls onNext when next button is clicked', async () => {
      const user = userEvent.setup()
      const onNext = jest.fn()

      renderWithTheme(
        <WizardContainer {...defaultProps} onNext={onNext} canProceed={true} />
      )

      const nextButton = screen.getByRole('button', { name: /siguiente/i })
      await user.click(nextButton)

      expect(onNext).toHaveBeenCalled()
    })

    it('calls onPrevious when previous button is clicked', async () => {
      const user = userEvent.setup()
      const onPrevious = jest.fn()

      renderWithTheme(
        <WizardContainer {...defaultProps} currentStep={2} onPrevious={onPrevious} />
      )

      const prevButton = screen.getByRole('button', { name: /anterior/i })
      await user.click(prevButton)

      expect(onPrevious).toHaveBeenCalled()
    })

    it('disables next button when canProceed is false', () => {
      renderWithTheme(<WizardContainer {...defaultProps} canProceed={false} />)

      const nextButton = screen.getByRole('button', { name: /siguiente/i })
      expect(nextButton).toBeDisabled()
    })

    it('shows loading state on buttons when isLoading is true', () => {
      renderWithTheme(<WizardContainer {...defaultProps} isLoading={true} />)

      const nextButton = screen.getByRole('button', { name: /siguiente/i })
      expect(nextButton).toBeDisabled()
      expect(nextButton).toHaveTextContent(/cargando/i)
    })
  })

  describe('Skip Functionality', () => {
    it('shows skip button when showSkip is true', () => {
      renderWithTheme(<WizardContainer {...defaultProps} showSkip={true} />)
      expect(screen.getByRole('button', { name: /omitir/i })).toBeInTheDocument()
    })

    it('hides skip button by default', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /omitir/i })).not.toBeInTheDocument()
    })

    it('calls onSkip when skip button is clicked', async () => {
      const user = userEvent.setup()
      const onSkip = jest.fn()

      renderWithTheme(
        <WizardContainer {...defaultProps} showSkip={true} onSkip={onSkip} />
      )

      const skipButton = screen.getByRole('button', { name: /omitir/i })
      await user.click(skipButton)

      expect(onSkip).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates with arrow keys', async () => {
      const user = userEvent.setup()
      const onNext = jest.fn()
      const onPrevious = jest.fn()

      renderWithTheme(
        <WizardContainer
          {...defaultProps}
          currentStep={2}
          onNext={onNext}
          onPrevious={onPrevious}
          canProceed={true}
        />
      )

      // Test right arrow for next
      await user.keyboard('{ArrowRight}')
      expect(onNext).toHaveBeenCalled()

      // Test left arrow for previous
      await user.keyboard('{ArrowLeft}')
      expect(onPrevious).toHaveBeenCalled()
    })

    it('handles Enter key for next action', async () => {
      const user = userEvent.setup()
      const onNext = jest.fn()

      renderWithTheme(
        <WizardContainer {...defaultProps} onNext={onNext} canProceed={true} />
      )

      await user.keyboard('{Enter}')
      expect(onNext).toHaveBeenCalled()
    })

    it('ignores keyboard navigation when disabled', async () => {
      const user = userEvent.setup()
      const onNext = jest.fn()

      renderWithTheme(
        <WizardContainer {...defaultProps} onNext={onNext} canProceed={false} />
      )

      await user.keyboard('{ArrowRight}')
      expect(onNext).not.toHaveBeenCalled()
    })
  })

  describe('Route Protection', () => {
    it('redirects when user cannot access current step', async () => {
      const mockReplace = jest.fn()
      const mockSetError = jest.fn()

      jest.mocked(require('next/navigation').useRouter).mockReturnValue({
        replace: mockReplace,
      })

      mockOnboardingStore({
        currentStep: 3,
        completedSteps: new Set([1]), // Missing step 2
        setError: mockSetError,
      })

      renderWithTheme(<WizardContainer {...defaultProps} currentStep={3} />)

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(
          'navigation',
          expect.stringContaining('No puedes acceder')
        )
        expect(mockReplace).toHaveBeenCalled()
      })
    })

    it('clears navigation errors when access is valid', () => {
      const mockClearError = jest.fn()

      mockOnboardingStore({
        currentStep: 2,
        completedSteps: new Set([1]),
        clearError: mockClearError,
      })

      renderWithTheme(<WizardContainer {...defaultProps} currentStep={2} />)

      expect(mockClearError).toHaveBeenCalledWith('navigation')
    })
  })

  describe('Accessibility', () => {
    it('has proper skip link', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)

      const skipLink = screen.getByRole('link', { name: /saltar.*contenido/i })
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()
      renderWithTheme(<WizardContainer {...defaultProps} />)

      // Skip link should focus main content when activated
      const skipLink = screen.getByRole('link', { name: /saltar.*contenido/i })
      await user.click(skipLink)

      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveFocus()
    })

    it('announces step changes to screen readers', () => {
      renderWithTheme(<WizardContainer {...defaultProps} />)

      // Check for screen reader announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('renders correctly in light theme', () => {
      const { container } = renderWithTheme(<WizardContainer {...defaultProps} />, {
        theme: 'light',
      })

      expect(container.firstChild).toHaveClass('bg-gradient-to-br')
      expect(container).toMatchSnapshot('light-theme')
    })

    it('renders correctly in dark theme', () => {
      const { container } = renderWithTheme(<WizardContainer {...defaultProps} />, {
        theme: 'dark',
      })

      expect(container.firstChild).toHaveClass('bg-gradient-to-br')
      expect(container).toMatchSnapshot('dark-theme')
    })
  })

  describe('Performance', () => {
    it('renders efficiently with multiple re-renders', () => {
      const { rerender } = renderWithTheme(<WizardContainer {...defaultProps} />)

      const startTime = performance.now()

      // Simulate multiple state updates
      for (let i = 1; i <= 5; i++) {
        rerender(<WizardContainer {...defaultProps} currentStep={i} />)
      }

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100)
    })
  })
})

describe('OnboardingLayout', () => {
  const defaultProps = {
    step: 1,
    children: <div>Step Content</div>,
  }

  beforeEach(() => {
    mockOnboardingStore({
      currentStep: 1,
      completedSteps: new Set([]),
    })
  })

  it('renders step indicator for screen readers', () => {
    renderWithTheme(<OnboardingLayout {...defaultProps} />)

    const heading = screen.getByRole('heading', { level: 1, hidden: true })
    expect(heading).toHaveTextContent('Paso 1 de 5')
  })

  it('includes step description for screen readers', () => {
    renderWithTheme(<OnboardingLayout {...defaultProps} />)

    // Should include step description from WIZARD_STEPS
    expect(screen.getByText(/bienvenido/i)).toBeInTheDocument()
  })

  it('passes props to WizardContainer', () => {
    const onNext = jest.fn()
    renderWithTheme(<OnboardingLayout {...defaultProps} onNext={onNext} />)

    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <OnboardingLayout {...defaultProps} className="custom-layout" />
    )

    expect(container.firstChild).toHaveClass('custom-layout')
  })
})