# shadcn/ui Component Extensions and Customizations

This document outlines all custom extensions, variants, and patterns implemented for shadcn/ui components in the StratixV2 onboarding system.

## Table of Contents

- [Overview](#overview)
- [Component Extensions](#component-extensions)
- [Custom Variants](#custom-variants)
- [Animation Patterns](#animation-patterns)
- [Theme Integration](#theme-integration)
- [Accessibility Enhancements](#accessibility-enhancements)
- [Testing Patterns](#testing-patterns)

## Overview

The StratixV2 project extends shadcn/ui components with additional functionality, custom variants, and enhanced accessibility features specifically designed for the onboarding workflow. All extensions maintain compatibility with the base shadcn/ui design system while adding specialized behaviors.

### Design Principles

- **Consistency**: All extensions follow shadcn/ui design patterns
- **Accessibility**: WCAG 2.1 AA compliance for all custom components
- **Performance**: Optimized for 60fps animations and fast interactions
- **Modularity**: Extensions can be used independently or combined
- **Themability**: Full support for light/dark themes with custom CSS variables

## Component Extensions

### WizardContainer

A specialized layout component that wraps the onboarding flow with progress tracking, navigation, and accessibility features.

#### Features

- **Progress Tracking**: Integrated progress indicator with step management
- **Navigation**: Previous/Next buttons with keyboard shortcuts
- **Route Protection**: Prevents access to unauthorized steps
- **Accessibility**: Skip links, focus management, screen reader support
- **Theme Support**: Seamless light/dark mode transitions

#### Props

```typescript
interface WizardContainerProps {
  children: ReactNode
  currentStep: number
  className?: string
  contentClassName?: string
  showProgress?: boolean
  showNavigation?: boolean
  canProceed?: boolean
  isLoading?: boolean
  onNext?: () => void | Promise<void>
  onPrevious?: () => void
  onSkip?: () => void
  showSkip?: boolean
  navigationClassName?: string
}
```

#### Usage

```tsx
import { WizardContainer } from '@/components/onboarding/WizardContainer'

function OnboardingStep() {
  return (
    <WizardContainer
      currentStep={2}
      canProceed={formIsValid}
      onNext={handleNext}
      onPrevious={handlePrevious}
    >
      <StepContent />
    </WizardContainer>
  )
}
```

#### Accessibility Features

- **Skip Links**: Direct navigation to main content
- **ARIA Landmarks**: Proper semantic structure
- **Keyboard Navigation**: Arrow keys and Enter support
- **Screen Reader**: Live regions for status updates
- **Focus Management**: Logical tab order and focus restoration

### ProgressIndicator

An enhanced progress component showing multi-step workflow completion with animations and accessibility features.

#### Features

- **Animated Progress**: Smooth transitions between states
- **Step Indicators**: Visual representation of all steps
- **Connection Lines**: Animated connectors between steps
- **State Management**: Current, completed, accessible, and disabled states
- **Responsive Design**: Adapts to different screen sizes

#### Props

```typescript
interface ProgressIndicatorProps {
  currentStep: number
  completedSteps: Set<number>
  className?: string
}
```

#### Usage

```tsx
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'

function OnboardingHeader() {
  return (
    <ProgressIndicator
      currentStep={3}
      completedSteps={new Set([1, 2])}
    />
  )
}
```

#### Visual States

- **Current Step**: Highlighted with ring and pulse animation
- **Completed Steps**: Green background with checkmark icon
- **Accessible Steps**: Previous steps that can be navigated to
- **Future Steps**: Disabled and non-interactive

### Enhanced Button Variants

Extended button component with additional variants for onboarding flows.

#### New Variants

```typescript
// Wizard navigation buttons
<Button variant="wizard-next">Continue</Button>
<Button variant="wizard-prev">Back</Button>
<Button variant="wizard-skip">Skip</Button>

// Loading states
<Button variant="loading" disabled>
  <Spinner className="mr-2" />
  Processing...
</Button>

// AI integration buttons
<Button variant="ai-suggestion">
  <Sparkles className="mr-2" />
  Use AI Suggestion
</Button>
```

#### Custom Styling

```css
/* Wizard-specific button styles */
.btn-wizard-next {
  @apply bg-primary hover:bg-primary/90 text-primary-foreground;
  @apply shadow-lg hover:shadow-xl transition-all duration-200;
  @apply focus:ring-2 focus:ring-primary focus:ring-offset-2;
}

.btn-wizard-prev {
  @apply bg-secondary hover:bg-secondary/80 text-secondary-foreground;
  @apply border border-input hover:border-primary/50;
}

.btn-ai-suggestion {
  @apply bg-gradient-to-r from-purple-500 to-blue-500;
  @apply hover:from-purple-600 hover:to-blue-600;
  @apply text-white shadow-lg hover:shadow-xl;
  @apply animate-shimmer bg-[length:200%_100%];
}
```

### Form Field Extensions

Enhanced form components with improved validation, accessibility, and AI integration.

#### SmartFormField

```tsx
interface SmartFormFieldProps extends InputProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  aiSuggestions?: string[]
  onAISuggestionSelect?: (suggestion: string) => void
}

function SmartFormField({
  label,
  description,
  error,
  required,
  aiSuggestions,
  onAISuggestionSelect,
  ...props
}: SmartFormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-muted-foreground" id={`${props.id}-description`}>
          {description}
        </p>
      )}

      <div className="relative">
        <Input
          {...props}
          aria-describedby={[
            description && `${props.id}-description`,
            error && `${props.id}-error`,
          ].filter(Boolean).join(' ') || undefined}
          aria-invalid={!!error}
          className={cn(error && "border-destructive", props.className)}
        />

        {aiSuggestions && aiSuggestions.length > 0 && (
          <AISuggestionPanel
            suggestions={aiSuggestions}
            onSelect={onAISuggestionSelect}
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" id={`${props.id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

## Custom Variants

### Button Variants

Extended button variants for specialized use cases:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // ... existing variants
        "wizard-next": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl animate-pulse-on-hover",
        "wizard-prev": "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        "wizard-skip": "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline",
        "ai-suggestion": "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 animate-shimmer",
        "loading": "bg-muted text-muted-foreground cursor-not-allowed",
      },
      size: {
        // ... existing sizes
        "wizard": "h-12 px-8 py-3 text-base",
        "ai-compact": "h-8 px-3 text-xs",
      },
    },
  }
)
```

### Progress Variants

Custom progress bar variants for different contexts:

```typescript
const progressVariants = cva(
  "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      variant: {
        default: "bg-secondary",
        onboarding: "bg-secondary border border-border shadow-inner",
        success: "bg-green-100 dark:bg-green-900",
        warning: "bg-yellow-100 dark:bg-yellow-900",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        flow: "relative overflow-hidden after:animate-flow",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "none",
    },
  }
)
```

### Card Variants

Enhanced card variants for onboarding content:

```typescript
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border bg-card",
        onboarding: "border-2 bg-gradient-to-br from-card to-card/50 shadow-lg",
        step: "border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors",
        ai: "border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950",
        success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
        error: "border-destructive bg-destructive/5",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        wizard: "p-8 max-w-2xl mx-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## Animation Patterns

### CSS Animations

Custom animations for enhanced user experience:

```css
/* Progress flow animation */
@keyframes progress-flow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

.animate-progress-flow {
  animation: progress-flow 2s ease-in-out infinite;
}

/* Shimmer effect for AI elements */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* Scale-in animation for completed steps */
@keyframes scale-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out forwards;
}

/* Subtle pulse for current step */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

/* Bounce animation for interactive elements */
@keyframes bounce-subtle {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
  60% { transform: translateY(-2px); }
}

.animate-bounce-subtle {
  animation: bounce-subtle 1s ease-in-out infinite;
}
```

### Component Animation Hooks

```typescript
// useStepTransition hook for smooth step changes
export function useStepTransition(currentStep: number) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionToStep = useCallback(async (newStep: number) => {
    setIsTransitioning(true)

    // Exit animation
    await new Promise(resolve => setTimeout(resolve, 150))

    // Step change logic here

    // Enter animation
    await new Promise(resolve => setTimeout(resolve, 150))

    setIsTransitioning(false)
  }, [])

  return {
    isTransitioning,
    transitionToStep,
  }
}

// useProgressAnimation hook for smooth progress updates
export function useProgressAnimation(targetProgress: number) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(targetProgress)
    }, 100)

    return () => clearTimeout(timer)
  }, [targetProgress])

  return animatedProgress
}
```

## Theme Integration

### CSS Variables

Custom CSS variables for onboarding-specific theming:

```css
:root {
  /* Onboarding-specific colors */
  --onboarding-progress: 217 91% 60%; /* Blue-500 */
  --onboarding-success: 142 76% 36%; /* Green-600 */
  --onboarding-warning: 45 93% 47%; /* Yellow-500 */
  --onboarding-ai: 262 83% 58%; /* Purple-500 */

  /* Animation durations */
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;

  /* Spacing for wizard layout */
  --wizard-content-max-width: 56rem; /* 896px */
  --wizard-step-gap: 2rem;
  --wizard-progress-height: 0.5rem;
}

.dark {
  /* Dark theme adjustments */
  --onboarding-progress: 217 91% 60%;
  --onboarding-success: 142 69% 58%;
  --onboarding-warning: 45 93% 47%;
  --onboarding-ai: 262 83% 58%;
}
```

### Theme-Aware Components

```typescript
// useTheme hook integration
export function ThemeAwareProgressIndicator({
  currentStep,
  completedSteps
}: ProgressIndicatorProps) {
  const { theme } = useTheme()

  const progressColor = theme === 'dark'
    ? 'hsl(var(--onboarding-progress))'
    : 'hsl(var(--onboarding-progress))'

  return (
    <div
      className="progress-indicator"
      style={{
        '--progress-color': progressColor,
      } as CSSProperties}
    >
      {/* Component content */}
    </div>
  )
}
```

## Accessibility Enhancements

### Focus Management

```typescript
// useFocusManagement hook for wizard navigation
export function useFocusManagement(currentStep: number) {
  const focusTargets = useRef<Map<number, HTMLElement>>(new Map())

  const registerFocusTarget = useCallback((step: number, element: HTMLElement) => {
    focusTargets.current.set(step, element)
  }, [])

  const focusStep = useCallback((step: number) => {
    const target = focusTargets.current.get(step)
    if (target) {
      target.focus()
    }
  }, [])

  useEffect(() => {
    // Focus current step when it changes
    focusStep(currentStep)
  }, [currentStep, focusStep])

  return {
    registerFocusTarget,
    focusStep,
  }
}
```

### Screen Reader Support

```typescript
// useAnnouncements hook for screen reader updates
export function useAnnouncements() {
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('')
    setTimeout(() => {
      setAnnouncement(message)
    }, 100)
  }, [])

  return {
    announcement,
    announce,
    AnnouncementRegion: () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    ),
  }
}
```

### Keyboard Navigation

```typescript
// useKeyboardNavigation hook for wizard controls
export function useKeyboardNavigation({
  currentStep,
  canProceed,
  onNext,
  onPrevious,
}: {
  currentStep: number
  canProceed: boolean
  onNext?: () => void
  onPrevious?: () => void
}) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'Enter':
        if (canProceed && onNext) {
          event.preventDefault()
          onNext()
        }
        break
      case 'ArrowLeft':
        if (currentStep > 1 && onPrevious) {
          event.preventDefault()
          onPrevious()
        }
        break
      case 'Escape':
        // Handle escape key (e.g., show exit confirmation)
        break
    }
  }, [currentStep, canProceed, onNext, onPrevious])

  return { handleKeyDown }
}
```

## Testing Patterns

### Component Testing

```typescript
// Test utilities for shadcn extensions
export function renderWizardComponent(
  component: React.ReactElement,
  options: {
    step?: number
    completedSteps?: number[]
    theme?: 'light' | 'dark'
  } = {}
) {
  const { step = 1, completedSteps = [], theme = 'light' } = options

  return renderWithTheme(
    <OnboardingProvider initialStep={step} completedSteps={new Set(completedSteps)}>
      {component}
    </OnboardingProvider>,
    { theme }
  )
}

// Animation testing helper
export function testComponentAnimations(
  component: React.ReactElement,
  animations: string[]
) {
  const { container } = renderWizardComponent(component)

  animations.forEach(animationClass => {
    expect(container.querySelector(`.${animationClass}`)).toBeInTheDocument()
  })
}

// Accessibility testing for wizard components
export async function testWizardAccessibility(component: React.ReactElement) {
  const { container } = renderWizardComponent(component)

  // Test keyboard navigation
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  expect(focusableElements.length).toBeGreaterThan(0)

  // Test ARIA attributes
  expect(container.querySelector('[role="main"]')).toBeInTheDocument()

  // Run axe accessibility tests
  await expectAccessible(container)
}
```

### Performance Testing

```typescript
// Performance benchmarks for wizard components
export const WIZARD_PERFORMANCE_THRESHOLDS = {
  stepTransition: 200, // ms
  progressUpdate: 50,  // ms
  formValidation: 100, // ms
  aiSuggestion: 300,   // ms
}

export function testWizardPerformance(component: React.ReactElement) {
  const renderTime = measureComponentPerformance(component, 5)
  expect(renderTime).toBeLessThan(WIZARD_PERFORMANCE_THRESHOLDS.stepTransition)
}
```

## Best Practices

### Component Composition

```typescript
// Good: Composable wizard step
function CompanyInfoStep() {
  return (
    <WizardStep>
      <WizardHeader
        title="Company Information"
        description="Tell us about your company"
      />
      <WizardContent>
        <SmartFormField
          name="companyName"
          label="Company Name"
          required
          aiSuggestions={companySuggestions}
        />
        <SmartFormField
          name="industry"
          label="Industry"
          type="select"
          options={industryOptions}
        />
      </WizardContent>
      <WizardFooter>
        <Button variant="wizard-prev">Previous</Button>
        <Button variant="wizard-next">Continue</Button>
      </WizardFooter>
    </WizardStep>
  )
}
```

### Error Handling

```typescript
// Error boundary for wizard components
export function WizardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Card variant="error">
          <CardContent>
            <h2>Something went wrong</h2>
            <p>Please refresh the page and try again.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
```

### Performance Optimization

```typescript
// Memoized wizard components
export const WizardContainer = memo(function WizardContainer({
  children,
  currentStep,
  ...props
}: WizardContainerProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.canProceed === nextProps.canProceed &&
    prevProps.isLoading === nextProps.isLoading
  )
})
```

## Migration Guide

### From Basic shadcn/ui to Enhanced Components

1. **Replace Button components**:
   ```typescript
   // Before
   <Button>Continue</Button>

   // After
   <Button variant="wizard-next">Continue</Button>
   ```

2. **Upgrade Progress components**:
   ```typescript
   // Before
   <Progress value={60} />

   // After
   <ProgressIndicator
     currentStep={3}
     completedSteps={new Set([1, 2])}
   />
   ```

3. **Add accessibility features**:
   ```typescript
   // Before
   <div>
     <input />
   </div>

   // After
   <SmartFormField
     label="Field Label"
     description="Helper text"
     required
   />
   ```

This documentation provides a comprehensive guide to all shadcn/ui extensions and customizations in the StratixV2 project. For implementation details, refer to the component source code and associated tests.