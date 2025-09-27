# Testing & Documentation System for shadcn Components

This comprehensive testing and documentation system ensures high-quality, accessible, and performant shadcn components in the StratixV2 onboarding system.

## Overview

The testing system provides:

- **Unit Testing**: Component-level testing with React Testing Library
- **Integration Testing**: Workflow and user journey testing
- **Accessibility Testing**: WCAG 2.1 AA compliance verification
- **Performance Testing**: 60fps animations and fast interactions
- **Visual Regression Testing**: Storybook with Chromatic integration
- **E2E Testing**: Full user flow validation
- **Documentation**: Comprehensive component guides and patterns

## Test Coverage Requirements

- **Unit Tests**: >90% coverage for onboarding components
- **Integration Tests**: Complete user workflows
- **Accessibility Tests**: 100% WCAG compliance
- **Performance Tests**: <16ms frame time, <100ms interactions
- **Visual Tests**: Cross-browser and responsive consistency

## Quick Start

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci

# Run specific test suites
npm test -- tests/components/
npm test -- tests/integration/
npm test -- tests/accessibility/
npm test -- tests/performance/
```

### Running Storybook

```bash
# Start Storybook development server
npm run storybook

# Build Storybook for production
npm run storybook:build

# Run visual regression tests
npm run test:visual
```

### Running Lighthouse Audits

```bash
# Build and audit the application
npm run build
npm run start &
npx lighthouse-ci autorun
```

## Test Structure

### Directory Organization

```
tests/
├── components/           # Unit tests for individual components
│   ├── onboarding/      # Onboarding-specific component tests
│   │   ├── WizardContainer.test.tsx
│   │   ├── ProgressIndicator.test.tsx
│   │   └── ...
│   └── ui/              # Base UI component tests
├── integration/         # Integration and workflow tests
│   ├── onboarding-flow.test.tsx
│   ├── ai-integration.test.tsx
│   └── theme-switching.test.tsx
├── accessibility/       # Accessibility-focused tests
│   ├── onboarding-a11y.test.tsx
│   └── keyboard-navigation.test.tsx
├── performance/         # Performance and optimization tests
│   ├── shadcn-performance.test.tsx
│   └── animation-performance.test.tsx
├── utils/              # Testing utilities and helpers
│   ├── test-utils.tsx  # Custom render functions
│   ├── onboarding-test-utils.tsx
│   └── accessibility-helpers.ts
└── setup.ts            # Jest setup and configuration
```

### Documentation Structure

```
docs/
├── components/         # Component documentation
│   ├── shadcn-extensions.md
│   ├── custom-variants.md
│   └── theming-guide.md
├── patterns/          # Design patterns and best practices
│   ├── form-patterns.md
│   ├── animation-patterns.md
│   └── accessibility-patterns.md
└── integration/       # Integration guides
    ├── ai-service-integration.md
    └── onboarding-flow-guide.md
```

## Testing Utilities

### Custom Render Functions

```typescript
import { renderWithTheme, screen, waitFor } from '@/tests/utils/test-utils'

// Render component with theme support
const { user } = renderWithTheme(
  <WizardContainer currentStep={1}>
    <div>Test Content</div>
  </WizardContainer>,
  { theme: 'dark' }
)

// Test both themes
const { light, dark } = renderWithBothThemes(<ProgressIndicator />)
```

### Accessibility Testing

```typescript
import { expectAccessible } from '@/tests/utils/test-utils'

test('component is accessible', async () => {
  const { container } = renderWithTheme(<MyComponent />)
  await expectAccessible(container)
})
```

### Performance Testing

```typescript
import { measureComponentPerformance } from '@/tests/utils/test-utils'

test('component renders quickly', () => {
  const renderTime = measureComponentPerformance(<MyComponent />, 10)
  expect(renderTime).toBeLessThan(50) // 50ms threshold
})
```

### Workflow Testing

```typescript
import { OnboardingWizardTester } from '@/tests/utils/onboarding-test-utils'

test('complete onboarding flow', async () => {
  const tester = new OnboardingWizardTester()

  await tester
    .fillWelcomeStep()
    .goToNextStep()
    .fillCompanyInfoStep()
    .goToNextStep()
    .fillOrganizationStep()
    .testStepProgress(3)
})
```

## Component Testing Patterns

### Basic Component Test

```typescript
import { renderWithTheme, screen } from '@/tests/utils/test-utils'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithTheme(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const onAction = jest.fn()
    const { user } = renderWithTheme(<MyComponent onAction={onAction} />)

    await user.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalled()
  })

  it('is accessible', async () => {
    const { container } = renderWithTheme(<MyComponent />)
    await expectAccessible(container)
  })

  it('works in both themes', () => {
    const { light, dark } = renderWithBothThemes(<MyComponent />)

    expect(light.container).toMatchSnapshot('light-theme')
    expect(dark.container).toMatchSnapshot('dark-theme')
  })
})
```

### Form Component Testing

```typescript
describe('FormComponent', () => {
  it('validates required fields', async () => {
    const { user } = renderWithTheme(<FormComponent />)

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const onSubmit = jest.fn()
    const { user } = renderWithTheme(<FormComponent onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/name/i), 'Test Name')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Test Name' })
  })
})
```

### Animation Testing

```typescript
describe('AnimatedComponent', () => {
  it('respects reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: true }))
    })

    const { container } = renderWithTheme(<AnimatedComponent />)

    // Should not have animation classes when reduced motion is preferred
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('animates smoothly', () => {
    const { triggerFrame, cleanup } = mockAnimationFrame()

    renderWithTheme(<AnimatedComponent />)

    // Trigger animation frames and verify performance
    for (let i = 0; i < 60; i++) {
      triggerFrame()
    }

    cleanup()
  })
})
```

## Storybook Integration

### Writing Stories

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    docs: {
      description: {
        component: 'Component description and usage guidelines'
      }
    },
    a11y: {
      config: {
        rules: {
          'color-contrast': { enabled: true },
        }
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary'],
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Default state'
  }
}

export const Interactive: Story = {
  args: {
    children: 'Interactive example'
  },
  play: async ({ canvasElement }) => {
    // Automated interactions for testing
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
  }
}

// Visual regression testing
export const AllVariants: Story = {
  parameters: {
    chromatic: {
      modes: {
        'light desktop': { theme: 'light', viewport: 'desktop' },
        'dark desktop': { theme: 'dark', viewport: 'desktop' },
        'light mobile': { theme: 'light', viewport: 'mobile' },
        'dark mobile': { theme: 'dark', viewport: 'mobile' },
      }
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite runs automatically on:

- **Push to main/develop**: Full test suite
- **Pull Requests**: Full test suite + visual regression
- **Scheduled**: Daily accessibility and performance audits

### Quality Gates

All tests must pass before merge:

1. **Linting**: ESLint and TypeScript checks
2. **Unit Tests**: >90% coverage requirement
3. **Accessibility Tests**: 100% WCAG compliance
4. **Performance Tests**: Meet performance thresholds
5. **Visual Tests**: No unintended visual changes
6. **Security Scan**: No high-severity vulnerabilities

### Coverage Reports

- **Codecov Integration**: Automatic coverage reporting
- **PR Comments**: Coverage changes highlighted
- **Quality Trends**: Track coverage over time

## Performance Thresholds

### Component Performance

- **Mount Time**: <50ms for simple components
- **Re-render Time**: <20ms for updates
- **Interaction Response**: <100ms for user actions
- **Animation Frame Time**: <16ms (60fps target)

### Web Vitals

- **First Contentful Paint**: <2s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Total Blocking Time**: <300ms

### Lighthouse Scores

- **Performance**: >80
- **Accessibility**: >95
- **Best Practices**: >90
- **SEO**: >80

## Accessibility Standards

### WCAG 2.1 AA Compliance

- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader Support**: Comprehensive ARIA implementation
- **Focus Management**: Visible focus indicators
- **Motion Sensitivity**: Respect for `prefers-reduced-motion`

### Testing Tools

- **jest-axe**: Automated accessibility testing
- **@testing-library/jest-dom**: Accessibility-focused matchers
- **Storybook a11y addon**: Visual accessibility testing
- **Lighthouse**: Comprehensive auditing

## Troubleshooting

### Common Test Issues

#### Tests Timing Out

```bash
# Increase test timeout
npm test -- --testTimeout=10000

# Or in specific test
test('slow test', async () => {
  // test code
}, 10000)
```

#### Mock Issues

```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks()
})

// Mock external dependencies
jest.mock('@/lib/services/ai-service', () => ({
  generateSuggestions: jest.fn().mockResolvedValue(['suggestion'])
}))
```

#### Accessibility Test Failures

```typescript
// Debug accessibility issues
import { axe } from 'jest-axe'

test('debug accessibility', async () => {
  const { container } = renderWithTheme(<Component />)
  const results = await axe(container)

  console.log('Accessibility violations:', results.violations)
})
```

### Performance Issues

#### Slow Test Execution

- Use `--maxWorkers=1` for debugging
- Check for memory leaks in components
- Ensure proper cleanup in `afterEach`

#### Animation Testing Issues

- Mock `requestAnimationFrame` for consistent results
- Use `act()` for state updates during animations
- Test animation end states rather than intermediate frames

## Best Practices

### Test Organization

1. **Group related tests** in describe blocks
2. **Use descriptive test names** that explain behavior
3. **Test behavior, not implementation** details
4. **Keep tests focused** on single behaviors
5. **Use setup/teardown** for common test state

### Component Testing

1. **Test user interactions** over internal state
2. **Use accessible queries** (getByRole, getByLabelText)
3. **Test edge cases** and error states
4. **Verify accessibility** for all components
5. **Test responsive behavior** across breakpoints

### Performance Testing

1. **Set realistic thresholds** based on user experience
2. **Test on lower-end devices** (CPU throttling)
3. **Monitor Core Web Vitals** in CI/CD
4. **Profile components** during development
5. **Test memory usage** for complex components

### Documentation

1. **Write clear examples** in Storybook
2. **Document accessibility features** and requirements
3. **Provide usage guidelines** for each component
4. **Include performance considerations** in docs
5. **Keep documentation updated** with code changes

## Resources

### Documentation

- [Component Extensions Guide](./docs/components/shadcn-extensions.md)
- [Animation Patterns](./docs/patterns/animation-patterns.md)
- [Accessibility Patterns](./docs/patterns/accessibility-patterns.md)

### Tools and Libraries

- [Jest](https://jestjs.io/) - Testing framework
- [React Testing Library](https://testing-library.com/react) - Component testing
- [jest-axe](https://github.com/nickcolley/jest-axe) - Accessibility testing
- [Storybook](https://storybook.js.org/) - Component documentation
- [Chromatic](https://www.chromatic.com/) - Visual regression testing
- [Lighthouse](https://lighthouse-ci.com/) - Performance auditing

### External Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing Guide](https://web.dev/accessibility-testing/)

---

This testing system ensures that the StratixV2 onboarding components meet the highest standards for quality, accessibility, and performance while providing comprehensive documentation for future development.