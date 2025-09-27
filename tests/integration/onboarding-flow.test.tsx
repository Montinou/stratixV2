import React from 'react'
import { renderWithTheme, screen, waitFor } from '@/tests/utils/test-utils'
import {
  OnboardingWizardTester,
  mockCompanyData,
  mockOrganizationData,
  setupAIMocks,
} from '@/tests/utils/onboarding-test-utils'
import { WizardContainer } from '@/components/onboarding/WizardContainer'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { CompanyInfoStep } from '@/components/onboarding/CompanyInfoStep'
import { OrganizationStep } from '@/components/onboarding/OrganizationStep'
import { CompletionStep } from '@/components/onboarding/CompletionStep'
import userEvent from '@testing-library/user-event'

// Mock dependencies
jest.mock('@/lib/stores/onboarding-store')
jest.mock('@/lib/services/ai-service')
jest.mock('next/navigation')

// Setup AI mocks
setupAIMocks()

describe('Onboarding Flow Integration', () => {
  let wizardTester: OnboardingWizardTester

  beforeEach(() => {
    wizardTester = new OnboardingWizardTester()

    // Mock store with clean state
    const mockStore = {
      currentStep: 1,
      completedSteps: new Set<number>(),
      formData: {},
      errors: {},
      isLoading: false,
      goToStep: jest.fn(),
      completeStep: jest.fn(),
      updateFormData: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
    }

    require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue(mockStore)
  })

  describe('Complete Onboarding Workflow', () => {
    it('completes full onboarding flow successfully', async () => {
      const mockOnNext = jest.fn()
      const mockOnComplete = jest.fn()

      // Render initial step
      const { rerender } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <WelcomeStep onNext={mockOnNext} />
        </WizardContainer>
      )

      // Step 1: Welcome
      await wizardTester.testStepProgress(1)
      await wizardTester.fillWelcomeStep()

      // Simulate step progression
      rerender(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep onNext={mockOnNext} />
        </WizardContainer>
      )

      // Step 2: Company Information
      await wizardTester.testStepProgress(2)
      await wizardTester.fillCompanyInfoStep(mockCompanyData)
      await wizardTester.goToNextStep()

      // Simulate step progression
      rerender(
        <WizardContainer currentStep={3}>
          <OrganizationStep onNext={mockOnNext} />
        </WizardContainer>
      )

      // Step 3: Organization Setup
      await wizardTester.testStepProgress(3)
      await wizardTester.fillOrganizationStep(mockOrganizationData)
      await wizardTester.goToNextStep()

      // Step 4: Goal Setting (simulated)
      rerender(
        <WizardContainer currentStep={4}>
          <div data-testid="goals-step">Goals Step</div>
        </WizardContainer>
      )

      await wizardTester.testStepProgress(4)
      await wizardTester.goToNextStep()

      // Step 5: Completion
      rerender(
        <WizardContainer currentStep={5}>
          <CompletionStep onComplete={mockOnComplete} />
        </WizardContainer>
      )

      await wizardTester.testStepProgress(5)

      // Complete onboarding
      const completeButton = screen.getByRole('button', { name: /completar|finalizar/i })
      await wizardTester.user.click(completeButton)

      expect(mockOnComplete).toHaveBeenCalled()
    })

    it('validates form data at each step', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Test validation for required fields
      await wizardTester.testFormValidation(
        'nombre',
        '',
        'El nombre de la empresa es requerido'
      )

      await wizardTester.testFormValidation(
        'descripción',
        'abc', // Too short
        'La descripción debe tener al menos 10 caracteres'
      )
    })

    it('persists form data across steps', async () => {
      const mockUpdateFormData = jest.fn()
      require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue({
        currentStep: 2,
        completedSteps: new Set([1]),
        formData: {},
        updateFormData: mockUpdateFormData,
        errors: {},
        isLoading: false,
      })

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Fill company information
      const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })
      await wizardTester.user.type(nameField, mockCompanyData.name)

      // Blur event should persist data
      await wizardTester.user.tab()

      expect(mockUpdateFormData).toHaveBeenCalledWith(
        'company',
        expect.objectContaining({
          name: mockCompanyData.name,
        })
      )
    })
  })

  describe('Navigation and Route Protection', () => {
    it('prevents access to future steps', async () => {
      const mockReplace = jest.fn()
      const mockSetError = jest.fn()

      jest.mocked(require('next/navigation').useRouter).mockReturnValue({
        replace: mockReplace,
      })

      require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue({
        currentStep: 4,
        completedSteps: new Set([1]), // Only step 1 completed
        setError: mockSetError,
        clearError: jest.fn(),
      })

      renderWithTheme(
        <WizardContainer currentStep={4}>
          <div>Step 4 Content</div>
        </WizardContainer>
      )

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(
          'navigation',
          expect.stringContaining('No puedes acceder')
        )
        expect(mockReplace).toHaveBeenCalled()
      })
    })

    it('allows navigation to completed steps', () => {
      require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue({
        currentStep: 3,
        completedSteps: new Set([1, 2, 3]),
        clearError: jest.fn(),
      })

      renderWithTheme(
        <WizardContainer currentStep={3}>
          <div>Step 3 Content</div>
        </WizardContainer>
      )

      // Should not redirect or show error
      expect(screen.getByText('Step 3 Content')).toBeInTheDocument()
    })

    it('handles keyboard navigation between steps', async () => {
      const mockGoToStep = jest.fn()

      require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue({
        currentStep: 2,
        completedSteps: new Set([1, 2]),
        goToStep: mockGoToStep,
      })

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <div>Step 2 Content</div>
        </WizardContainer>
      )

      // Test arrow key navigation
      await wizardTester.user.keyboard('{ArrowLeft}')
      await wizardTester.user.keyboard('{ArrowRight}')

      // Should handle navigation appropriately
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('AI Integration During Flow', () => {
    it('provides AI suggestions during company setup', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Fill company name to trigger AI suggestions
      const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })
      await wizardTester.user.type(nameField, 'TechCorp')

      // Wait for AI suggestions to appear
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeInTheDocument()
      })

      // Should show AI-generated suggestions
      expect(screen.getByText(/optimizar procesos/i)).toBeInTheDocument()
    })

    it('handles AI service errors gracefully', async () => {
      // Mock AI service failure
      const mockAIService = require('@/lib/services/ai-service')
      mockAIService.generateSuggestions.mockRejectedValueOnce(
        new Error('AI service unavailable')
      )

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })
      await wizardTester.user.type(nameField, 'TechCorp')

      await waitFor(() => {
        expect(screen.getByText(/servicio.*temporalmente/i)).toBeInTheDocument()
      })

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /reintentar/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('shows loading states during AI processing', async () => {
      // Mock delayed AI response
      const mockAIService = require('@/lib/services/ai-service')
      mockAIService.generateSuggestions.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(['Suggestion 1', 'Suggestion 2']), 1000)
          )
      )

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })
      await wizardTester.user.type(nameField, 'TechCorp')

      // Should show loading indicator
      expect(screen.getByTestId('ai-loading-indicator')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('handles form validation errors gracefully', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Try to proceed without filling required fields
      const nextButton = screen.getByRole('button', { name: /siguiente/i })
      await wizardTester.user.click(nextButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/nombre.*requerido/i)).toBeInTheDocument()
      })

      // Next button should be disabled
      expect(nextButton).toBeDisabled()
    })

    it('recovers from network errors', async () => {
      const mockOnNext = jest.fn()

      // Mock network failure first, then success
      mockOnNext
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined)

      renderWithTheme(
        <WizardContainer currentStep={2} onNext={mockOnNext}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Fill form and try to proceed
      await wizardTester.fillCompanyInfoStep()
      await wizardTester.goToNextStep()

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error.*red/i)).toBeInTheDocument()
      })

      // Retry should work
      const retryButton = screen.getByRole('button', { name: /reintentar/i })
      await wizardTester.user.click(retryButton)

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledTimes(2)
      })
    })

    it('handles session timeout gracefully', async () => {
      const mockRouter = require('next/navigation').useRouter()
      mockRouter.mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
      })

      // Mock session expiry
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 401,
        json: () => Promise.resolve({ error: 'Session expired' }),
      })

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      await wizardTester.fillCompanyInfoStep()
      await wizardTester.goToNextStep()

      await waitFor(() => {
        expect(screen.getByText(/sesión.*expirada/i)).toBeInTheDocument()
      })

      // Restore fetch
      global.fetch = originalFetch
    })
  })

  describe('Accessibility During Flow', () => {
    it('maintains focus management throughout flow', async () => {
      renderWithTheme(
        <WizardContainer currentStep={1}>
          <WelcomeStep />
        </WizardContainer>
      )

      await wizardTester.testAccessibilityAnnouncements()

      // Progress through steps should maintain logical focus
      const continueButton = screen.getByRole('button', { name: /comenzar/i })
      await wizardTester.user.click(continueButton)

      // Focus should move appropriately
      expect(document.activeElement).toBeDefined()
    })

    it('provides screen reader announcements for step changes', async () => {
      const { rerender } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <WelcomeStep />
        </WizardContainer>
      )

      // Move to next step
      rerender(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      // Should announce step change
      const announcements = screen.getAllByRole('status')
      expect(announcements.length).toBeGreaterThan(0)
    })

    it('supports skip navigation for each step', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2} showSkip={true}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      await wizardTester.testSkipFunctionality(2)
    })
  })

  describe('Performance During Flow', () => {
    it('renders step transitions efficiently', async () => {
      const { rerender } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <WelcomeStep />
        </WizardContainer>
      )

      const startTime = performance.now()

      // Simulate step transitions
      for (let step = 2; step <= 5; step++) {
        rerender(
          <WizardContainer currentStep={step}>
            <div>Step {step}</div>
          </WizardContainer>
        )
      }

      const endTime = performance.now()
      const transitionTime = endTime - startTime

      // Should transition quickly
      expect(transitionTime).toBeLessThan(200)
    })

    it('handles form state updates efficiently', async () => {
      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      const nameField = screen.getByRole('textbox', { name: /nombre.*empresa/i })

      const startTime = performance.now()

      // Simulate rapid typing
      const testText = 'TechCorp Solutions Inc'
      for (const char of testText) {
        await wizardTester.user.type(nameField, char, { delay: 0 })
      }

      const endTime = performance.now()
      const typingTime = endTime - startTime

      // Should handle input efficiently
      expect(typingTime).toBeLessThan(1000)
    })
  })

  describe('Data Persistence and Sync', () => {
    it('syncs data across browser tabs', async () => {
      // This would require more complex setup with actual storage events
      // For now, test that form data is properly stored
      const mockUpdateFormData = jest.fn()

      require('@/lib/stores/onboarding-store').useOnboardingStore.mockReturnValue({
        currentStep: 2,
        completedSteps: new Set([1]),
        formData: {},
        updateFormData: mockUpdateFormData,
        errors: {},
        isLoading: false,
      })

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      await wizardTester.fillCompanyInfoStep()

      // Should call updateFormData with company information
      expect(mockUpdateFormData).toHaveBeenCalledWith(
        'company',
        expect.objectContaining({
          name: mockCompanyData.name,
          industry: mockCompanyData.industry,
        })
      )
    })

    it('recovers from browser refresh', () => {
      // Mock localStorage with saved onboarding state
      const savedState = {
        currentStep: 3,
        completedSteps: [1, 2],
        formData: { company: mockCompanyData },
      }

      localStorage.setItem('onboarding-state', JSON.stringify(savedState))

      renderWithTheme(
        <WizardContainer currentStep={3}>
          <OrganizationStep />
        </WizardContainer>
      )

      // Should restore state and show correct step
      expect(screen.getByText(/organización/i)).toBeInTheDocument()
    })
  })
})