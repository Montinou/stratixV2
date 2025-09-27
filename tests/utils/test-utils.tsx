import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider } from '@/components/theme-provider'
import { AccessibilityProvider } from '@/components/onboarding/AccessibilityProvider'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Types for theme testing
export type Theme = 'light' | 'dark' | 'system'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: Theme
  withAccessibility?: boolean
  withAnimations?: boolean
}

// Custom render function for shadcn components with theme support
export function renderWithTheme(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    theme = 'light',
    withAccessibility = true,
    withAnimations = false,
    ...renderOptions
  } = options

  function AllTheProviders({ children }: { children: ReactNode }) {
    const content = (
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={theme === 'system'}
        disableTransitionOnChange={!withAnimations}
      >
        {children}
      </ThemeProvider>
    )

    if (withAccessibility) {
      return (
        <AccessibilityProvider>
          {content}
        </AccessibilityProvider>
      )
    }

    return content
  }

  const result = render(ui, { wrapper: AllTheProviders, ...renderOptions })

  return {
    ...result,
    user: userEvent.setup(),
  }
}

// Helper for testing both light and dark themes
export function renderWithBothThemes(ui: ReactElement, options?: CustomRenderOptions) {
  const lightResult = renderWithTheme(ui, { ...options, theme: 'light' })
  const darkResult = renderWithTheme(ui, { ...options, theme: 'dark' })

  return {
    light: lightResult,
    dark: darkResult,
  }
}

// Accessibility testing helper
export async function expectAccessible(container: HTMLElement) {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Helper to test component variants
export function testComponentVariants<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  variants: Array<{ props: T; description: string }>,
  baseProps?: Partial<T>
) {
  variants.forEach(({ props, description }) => {
    it(`renders correctly with ${description}`, () => {
      const { container } = renderWithTheme(
        <Component {...(baseProps as T)} {...props} />
      )
      expect(container.firstChild).toMatchSnapshot()
    })

    it(`is accessible with ${description}`, async () => {
      const { container } = renderWithTheme(
        <Component {...(baseProps as T)} {...props} />
      )
      await expectAccessible(container)
    })
  })
}

// Helper for testing keyboard navigation
export async function testKeyboardNavigation(
  element: HTMLElement,
  keys: string[],
  expectedBehavior: (step: number) => void
) {
  const user = userEvent.setup()

  for (let i = 0; i < keys.length; i++) {
    await user.keyboard(keys[i])
    expectedBehavior(i)
  }
}

// Helper for testing focus management
export async function testFocusManagement(
  container: HTMLElement,
  expectedFocusSequence: string[]
) {
  const user = userEvent.setup()

  for (const selector of expectedFocusSequence) {
    const element = container.querySelector(selector) as HTMLElement
    expect(element).toBeInTheDocument()

    await user.tab()
    expect(element).toHaveFocus()
  }
}

// Helper for testing animations
export function testAnimations(
  element: HTMLElement,
  animationClass: string,
  duration?: number
) {
  // Check if animation class is applied
  expect(element).toHaveClass(animationClass)

  // Mock animation completion
  if (duration) {
    setTimeout(() => {
      element.dispatchEvent(new Event('animationend'))
    }, duration)
  }
}

// Helper for testing loading states
export async function testLoadingState(
  renderComponent: (loading: boolean) => ReactElement,
  loadingSelector: string
) {
  // Test loading state
  const { rerender } = renderWithTheme(renderComponent(true))
  expect(screen.getByTestId(loadingSelector)).toBeInTheDocument()

  // Test loaded state
  rerender(renderComponent(false))
  expect(screen.queryByTestId(loadingSelector)).not.toBeInTheDocument()
}

// Helper for testing error boundaries
export function testErrorBoundary(
  ThrowError: React.ComponentType,
  ErrorBoundary: React.ComponentType<{ children: ReactNode }>
) {
  // Suppress console.error for this test
  const originalError = console.error
  console.error = jest.fn()

  const { container } = renderWithTheme(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(container).toHaveTextContent(/something went wrong/i)

  // Restore console.error
  console.error = originalError
}

// Helper for testing responsive behavior
export function testResponsive(
  component: ReactElement,
  breakpoints: Record<string, number>
) {
  Object.entries(breakpoints).forEach(([name, width]) => {
    it(`renders correctly at ${name} breakpoint (${width}px)`, () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })

      // Trigger resize event
      window.dispatchEvent(new Event('resize'))

      const { container } = renderWithTheme(component)
      expect(container.firstChild).toMatchSnapshot(`${name}-breakpoint`)
    })
  })
}

// Performance testing helper
export function measureComponentPerformance(
  component: ReactElement,
  iterations: number = 10
): number {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    renderWithTheme(component)
    const end = performance.now()
    times.push(end - start)
  }

  return times.reduce((sum, time) => sum + time, 0) / times.length
}

// Helper for testing form interactions
export async function testFormField(
  fieldSelector: string,
  value: string,
  validationMessage?: string
) {
  const user = userEvent.setup()
  const field = screen.getByRole('textbox', { name: new RegExp(fieldSelector, 'i') })

  // Test typing
  await user.type(field, value)
  expect(field).toHaveValue(value)

  // Test validation if provided
  if (validationMessage) {
    await user.tab() // Trigger blur
    await waitFor(() => {
      expect(screen.getByText(validationMessage)).toBeInTheDocument()
    })
  }
}

// Helper for testing multi-step workflows
export class WorkflowTester {
  private currentStep = 0
  private steps: Array<() => void | Promise<void>> = []

  constructor(private user = userEvent.setup()) {}

  addStep(stepFunction: () => void | Promise<void>) {
    this.steps.push(stepFunction)
    return this
  }

  async executeStep(stepIndex?: number) {
    const index = stepIndex ?? this.currentStep
    if (index >= this.steps.length) {
      throw new Error(`Step ${index} does not exist`)
    }

    await this.steps[index]()
    this.currentStep = index + 1
    return this
  }

  async executeAllSteps() {
    for (let i = 0; i < this.steps.length; i++) {
      await this.executeStep(i)
    }
    return this
  }

  async goToNextStep() {
    const nextButton = screen.getByRole('button', { name: /siguiente|next/i })
    expect(nextButton).toBeEnabled()
    await this.user.click(nextButton)
    return this
  }

  async goToPreviousStep() {
    const prevButton = screen.getByRole('button', { name: /anterior|previous/i })
    expect(prevButton).toBeEnabled()
    await this.user.click(prevButton)
    return this
  }

  expectStepActive(stepNumber: number) {
    const stepIndicator = screen.getByRole('button', {
      name: new RegExp(`paso ${stepNumber}`, 'i')
    })
    expect(stepIndicator).toHaveAttribute('aria-current', 'step')
    return this
  }
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
export { userEvent }

// Re-export common test utilities
export { screen, waitFor, within } from '@testing-library/react'