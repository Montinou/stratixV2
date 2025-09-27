import React from 'react'
import { renderWithTheme, WorkflowTester, screen, waitFor } from './test-utils'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { WIZARD_STEPS, OnboardingStep } from '@/lib/types/onboarding'
import userEvent from '@testing-library/user-event'

// Mock data for testing
export const mockCompanyData = {
  name: 'Test Company',
  industry: 'Tecnología',
  size: '50-100',
  description: 'A test company for testing purposes',
}

export const mockUserData = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'CEO',
}

export const mockOrganizationData = {
  departments: ['Desarrollo', 'Marketing', 'Ventas'],
  teams: [
    { name: 'Frontend Team', department: 'Desarrollo' },
    { name: 'Backend Team', department: 'Desarrollo' },
  ],
}

// Helper to mock the onboarding store
export function mockOnboardingStore(initialState?: Partial<ReturnType<typeof useOnboardingStore>>) {
  const defaultState = {
    currentStep: 1,
    completedSteps: new Set<number>(),
    formData: {},
    errors: {},
    isLoading: false,
    progress: 0,
  }

  jest.mocked(useOnboardingStore).mockReturnValue({
    ...defaultState,
    ...initialState,
    // Default implementations for methods
    goToStep: jest.fn(),
    completeStep: jest.fn(),
    updateFormData: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
    clearErrors: jest.fn(),
    setLoading: jest.fn(),
    reset: jest.fn(),
    canGoToStep: jest.fn().mockReturnValue(true),
  } as any)
}

// Helper to test wizard navigation
export class OnboardingWizardTester extends WorkflowTester {
  constructor() {
    super()
  }

  async testStepProgress(expectedStep: number) {
    // Check progress indicator shows correct step
    const progressIndicator = screen.getByRole('progressbar')
    expect(progressIndicator).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`${Math.round((expectedStep / WIZARD_STEPS.length) * 100)}%`)
    )

    // Check step indicator shows current step
    const stepButton = screen.getByRole('button', {
      name: new RegExp(`paso ${expectedStep}`, 'i')
    })
    expect(stepButton).toHaveAttribute('aria-current', 'step')

    return this
  }

  async fillWelcomeStep() {
    // Test welcome step interactions
    const continueButton = screen.getByRole('button', { name: /comenzar|continuar/i })
    expect(continueButton).toBeInTheDocument()

    await this.user.click(continueButton)
    return this
  }

  async fillCompanyInfoStep(data = mockCompanyData) {
    // Fill company name
    const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })
    await this.user.type(nameField, data.name)

    // Select industry
    const industrySelect = screen.getByRole('combobox', { name: /industria/i })
    await this.user.click(industrySelect)

    const industryOption = screen.getByRole('option', { name: data.industry })
    await this.user.click(industryOption)

    // Select company size
    const sizeSelect = screen.getByRole('combobox', { name: /tamaño/i })
    await this.user.click(sizeSelect)

    const sizeOption = screen.getByRole('option', { name: data.size })
    await this.user.click(sizeOption)

    // Fill description
    const descriptionField = screen.getByRole('textbox', { name: /descripción/i })
    await this.user.type(descriptionField, data.description)

    return this
  }

  async fillOrganizationStep(data = mockOrganizationData) {
    // Add departments
    for (const department of data.departments) {
      const addDeptButton = screen.getByRole('button', { name: /agregar.*departamento/i })
      await this.user.click(addDeptButton)

      const deptNameField = screen.getByRole('textbox', { name: /nombre.*departamento/i })
      await this.user.type(deptNameField, department)

      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      await this.user.click(confirmButton)
    }

    // Add teams
    for (const team of data.teams) {
      const addTeamButton = screen.getByRole('button', { name: /agregar.*equipo/i })
      await this.user.click(addTeamButton)

      const teamNameField = screen.getByRole('textbox', { name: /nombre.*equipo/i })
      await this.user.type(teamNameField, team.name)

      const deptSelect = screen.getByRole('combobox', { name: /departamento/i })
      await this.user.click(deptSelect)

      const deptOption = screen.getByRole('option', { name: team.department })
      await this.user.click(deptOption)

      const confirmTeamButton = screen.getByRole('button', { name: /confirmar/i })
      await this.user.click(confirmTeamButton)
    }

    return this
  }

  async testFormValidation(fieldName: string, invalidValue: string, expectedError: string) {
    const field = screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') })

    await this.user.clear(field)
    await this.user.type(field, invalidValue)
    await this.user.tab() // Trigger blur for validation

    await waitFor(() => {
      expect(screen.getByText(expectedError)).toBeInTheDocument()
    })

    return this
  }

  async testSkipFunctionality(stepNumber: number) {
    const skipButton = screen.getByRole('button', { name: /omitir/i })
    expect(skipButton).toBeInTheDocument()

    await this.user.click(skipButton)

    // Should advance to next step
    await this.testStepProgress(stepNumber + 1)

    return this
  }

  async testAccessibilityAnnouncements() {
    // Check for screen reader announcements
    const announcements = screen.getAllByRole('status')
    expect(announcements.length).toBeGreaterThan(0)

    return this
  }
}

// Helper to test specific onboarding step components
export function testOnboardingStep(
  StepComponent: React.ComponentType<{ onNext?: () => void; onPrevious?: () => void }>,
  stepNumber: number,
  stepConfig: OnboardingStep
) {
  describe(`${stepConfig.title} Step`, () => {
    let onNext: jest.Mock
    let onPrevious: jest.Mock

    beforeEach(() => {
      onNext = jest.fn()
      onPrevious = jest.fn()
      mockOnboardingStore({
        currentStep: stepNumber,
        completedSteps: new Set(Array.from({ length: stepNumber - 1 }, (_, i) => i + 1)),
      })
    })

    it('renders step content correctly', () => {
      const { container } = renderWithTheme(
        <StepComponent onNext={onNext} onPrevious={onPrevious} />
      )
      expect(container).toMatchSnapshot()
    })

    it('displays correct step title and description', () => {
      renderWithTheme(<StepComponent onNext={onNext} onPrevious={onPrevious} />)

      expect(screen.getByText(stepConfig.title)).toBeInTheDocument()
      if (stepConfig.description) {
        expect(screen.getByText(stepConfig.description)).toBeInTheDocument()
      }
    })

    it('is accessible', async () => {
      const { container } = renderWithTheme(
        <StepComponent onNext={onNext} onPrevious={onPrevious} />
      )

      // Check for proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      expect(headings.length).toBeGreaterThan(0)

      // Check for form labeling if it's a form step
      const inputs = container.querySelectorAll('input, select, textarea')
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName()
      })
    })

    it('handles keyboard navigation correctly', async () => {
      const user = userEvent.setup()
      renderWithTheme(<StepComponent onNext={onNext} onPrevious={onPrevious} />)

      // Test Tab navigation
      const focusableElements = screen.getAllByRole(/button|textbox|combobox|checkbox|radio/)

      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab()
        expect(focusableElements[i]).toHaveFocus()
      }
    })

    if (stepNumber > 1) {
      it('can navigate to previous step', async () => {
        const user = userEvent.setup()
        renderWithTheme(<StepComponent onNext={onNext} onPrevious={onPrevious} />)

        const prevButton = screen.getByRole('button', { name: /anterior/i })
        await user.click(prevButton)

        expect(onPrevious).toHaveBeenCalled()
      })
    }

    if (stepNumber < WIZARD_STEPS.length) {
      it('can navigate to next step when valid', async () => {
        const user = userEvent.setup()
        renderWithTheme(<StepComponent onNext={onNext} onPrevious={onPrevious} />)

        // Fill out required fields (step-specific implementation needed)
        // This would be customized per step

        const nextButton = screen.getByRole('button', { name: /siguiente/i })
        await user.click(nextButton)

        expect(onNext).toHaveBeenCalled()
      })
    }
  })
}

// Helper to test AI integration components
export function testAIIntegration(
  Component: React.ComponentType<any>,
  aiProps: Record<string, any>
) {
  describe('AI Integration', () => {
    it('shows loading state during AI processing', async () => {
      renderWithTheme(<Component {...aiProps} isLoading={true} />)

      expect(screen.getByTestId('ai-loading-indicator')).toBeInTheDocument()
    })

    it('displays AI suggestions when available', () => {
      const suggestions = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3']
      renderWithTheme(<Component {...aiProps} suggestions={suggestions} />)

      suggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument()
      })
    })

    it('handles AI errors gracefully', () => {
      const errorMessage = 'AI service temporarily unavailable'
      renderWithTheme(<Component {...aiProps} error={errorMessage} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    })
  })
}

// Helper to test theme switching during onboarding
export async function testThemeSwitching() {
  const user = userEvent.setup()

  // Test light to dark theme switch
  const themeToggle = screen.getByRole('button', { name: /cambiar.*tema/i })
  await user.click(themeToggle)

  // Verify theme changed
  expect(document.documentElement).toHaveClass('dark')

  // Test dark to light theme switch
  await user.click(themeToggle)
  expect(document.documentElement).not.toHaveClass('dark')
}

// Mock AI service responses
export const mockAIResponses = {
  companySuggestions: [
    'Optimizar procesos de desarrollo',
    'Mejorar experiencia del usuario',
    'Aumentar retención de clientes',
  ],
  organizationSuggestions: [
    'Equipo de Producto',
    'Equipo de Calidad',
    'Equipo de DevOps',
  ],
  goalSuggestions: [
    'Reducir tiempo de desarrollo en 30%',
    'Aumentar satisfacción del cliente a 4.5/5',
    'Implementar 5 nuevas funcionalidades por sprint',
  ],
}

// Helper to setup AI mocks
export function setupAIMocks() {
  // Mock AI service calls
  jest.mock('@/lib/services/ai-service', () => ({
    generateSuggestions: jest.fn().mockResolvedValue(mockAIResponses.companySuggestions),
    analyzeCompanyData: jest.fn().mockResolvedValue({ score: 0.85, recommendations: [] }),
    validateGoals: jest.fn().mockResolvedValue({ isValid: true, suggestions: [] }),
  }))
}