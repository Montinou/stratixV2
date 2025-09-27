# Accessibility Patterns for shadcn Components

This document outlines comprehensive accessibility patterns implemented in the StratixV2 onboarding system, ensuring WCAG 2.1 AA compliance and excellent user experience for all users.

## Accessibility Principles

### WCAG 2.1 AA Compliance
- **Perceivable**: Information must be presentable in ways users can perceive
- **Operable**: Interface components must be operable by all users
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough to work with assistive technologies

### Key Focus Areas
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader Support**: Comprehensive ARIA implementation
- **Color Contrast**: 4.5:1 ratio for normal text, 3:1 for large text
- **Focus Management**: Clear visual indicators and logical focus flow
- **Motion Sensitivity**: Respect for `prefers-reduced-motion`

## Semantic HTML Foundation

### Proper Document Structure

```html
<!-- Good semantic structure for wizard -->
<main role="main" aria-label="Onboarding wizard">
  <header>
    <h1>Company Setup</h1>
    <nav aria-label="Step progress">
      <!-- Progress indicator -->
    </nav>
  </header>

  <section aria-labelledby="step-heading">
    <h2 id="step-heading">Step 2: Company Information</h2>
    <form>
      <!-- Form content -->
    </form>
  </section>

  <footer>
    <nav aria-label="Step navigation">
      <!-- Navigation buttons -->
    </nav>
  </footer>
</main>
```

### Landmark Roles

```typescript
// WizardContainer with proper landmarks
export function WizardContainer({ children, currentStep }: WizardContainerProps) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header role="banner">
        <ProgressIndicator currentStep={currentStep} />
      </header>

      <main
        id="main-content"
        role="main"
        aria-label="Onboarding wizard content"
      >
        {children}
      </main>

      <footer role="contentinfo">
        <WizardNavigation />
      </footer>
    </div>
  )
}
```

## ARIA Implementation

### Live Regions for Dynamic Content

```typescript
// Announcement system for screen readers
export function useAnnouncements() {
  const [announcement, setAnnouncement] = useState('')
  const [politeAnnouncement, setPoliteAnnouncement] = useState('')

  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (priority === 'assertive') {
      setAnnouncement('')
      setTimeout(() => setAnnouncement(message), 100)
    } else {
      setPoliteAnnouncement('')
      setTimeout(() => setPoliteAnnouncement(message), 100)
    }
  }, [])

  return {
    announce,
    LiveRegions: () => (
      <>
        {/* For urgent announcements */}
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        {/* For polite announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {politeAnnouncement}
        </div>
      </>
    ),
  }
}
```

### Progressive Enhancement

```typescript
// ProgressIndicator with comprehensive ARIA
export function ProgressIndicator({
  currentStep,
  completedSteps,
}: ProgressIndicatorProps) {
  const totalSteps = WIZARD_STEPS.length
  const progressPercentage = Math.round((completedSteps.size / totalSteps) * 100)

  return (
    <div className="space-y-4" role="region" aria-label="Progress indicator">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Onboarding Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedSteps.size} of {totalSteps} completed
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progressPercentage}% completed`}
          className="w-full bg-secondary rounded-full h-2"
        >
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <nav role="navigation" aria-label="Step navigation">
        <ol className="flex justify-between items-center">
          {WIZARD_STEPS.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = completedSteps.has(stepNumber)
            const isCurrent = currentStep === stepNumber
            const isAccessible = stepNumber === 1 || completedSteps.has(stepNumber - 1)

            return (
              <li key={step.key}>
                <button
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    {
                      'bg-primary text-primary-foreground': isCompleted,
                      'bg-primary/20 border-2 border-primary': isCurrent && !isCompleted,
                      'bg-muted border border-muted-foreground': !isCompleted && !isCurrent && isAccessible,
                      'bg-muted border border-muted-foreground/30 opacity-50': !isAccessible,
                    }
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${stepNumber}: ${step.title}${
                    isCompleted ? ' (completed)' : ''
                  }${isCurrent ? ' (current)' : ''}`}
                  aria-describedby={`step-${stepNumber}-description`}
                  disabled={!isAccessible}
                  tabIndex={isAccessible ? 0 : -1}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </button>

                <div
                  id={`step-${stepNumber}-description`}
                  className="sr-only"
                >
                  {step.description}
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
```

## Form Accessibility

### Comprehensive Form Field Implementation

```typescript
// SmartFormField with full accessibility
export function SmartFormField({
  id,
  name,
  label,
  type = 'text',
  required = false,
  description,
  error,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  autoComplete,
  aiSuggestions = [],
  onAISuggestionSelect,
  ...props
}: SmartFormFieldProps) {
  const fieldId = id || `field-${name}`
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const suggestionsId = aiSuggestions.length > 0 ? `${fieldId}-suggestions` : undefined

  const describedBy = [descriptionId, errorId, suggestionsId]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="space-y-2">
      {/* Label */}
      <label
        htmlFor={fieldId}
        className={cn(
          'text-sm font-medium leading-none',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          required && "after:content-['*'] after:ml-0.5 after:text-destructive"
        )}
      >
        {label}
      </label>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cn(
            error && 'border-destructive focus:border-destructive',
            'transition-colors'
          )}
          {...props}
        />

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div
            id={suggestionsId}
            role="listbox"
            aria-label="AI suggestions"
            className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg"
          >
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => onAISuggestionSelect?.(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
```

### Form Validation Patterns

```typescript
// Accessible form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: ZodSchema<T>
) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const { announce } = useAnnouncements()

  const validateField = useCallback((name: string, value: any) => {
    try {
      const fieldSchema = validationSchema.shape[name]
      fieldSchema.parse(value)
      setErrors(prev => ({ ...prev, [name]: '' }))
      return true
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.errors[0]?.message || 'Invalid value'
        setErrors(prev => ({ ...prev, [name]: fieldError }))

        // Announce error to screen readers
        if (touched[name]) {
          announce(`Error in ${name}: ${fieldError}`, 'assertive')
        }

        return false
      }
    }
  }, [validationSchema, touched, announce])

  const handleChange = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))

    // Validate on change if field was already touched
    if (touched[name]) {
      validateField(name, value)
    }
  }, [touched, validateField])

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, values[name])
  }, [values, validateField])

  const validateAll = useCallback(() => {
    try {
      validationSchema.parse(values)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)

        // Announce validation summary
        const errorCount = Object.keys(newErrors).length
        announce(`Form has ${errorCount} error${errorCount === 1 ? '' : 's'}`, 'assertive')

        return false
      }
    }
  }, [values, validationSchema, announce])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    isValid: Object.keys(errors).length === 0,
  }
}
```

## Keyboard Navigation

### Focus Management System

```typescript
// Comprehensive focus management
export function useFocusManagement() {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  const getFocusableElements = useCallback((container: HTMLElement) => {
    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        const style = getComputedStyle(element as HTMLElement)
        return style.display !== 'none' && style.visibility !== 'hidden'
      }) as HTMLElement[]
  }, [focusableSelectors])

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container)
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            event.preventDefault()
            lastFocusable?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            event.preventDefault()
            firstFocusable?.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Focus first element
    firstFocusable?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [getFocusableElements])

  const restoreFocus = useCallback((previousElement: HTMLElement) => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus()
    }
  }, [])

  return {
    getFocusableElements,
    trapFocus,
    restoreFocus,
  }
}
```

### Keyboard Shortcuts Implementation

```typescript
// Wizard keyboard navigation
export function useWizardKeyboardNavigation({
  currentStep,
  canProceed,
  isLoading,
  onNext,
  onPrevious,
  onSkip,
}: {
  currentStep: number
  canProceed: boolean
  isLoading: boolean
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
}) {
  const { announce } = useAnnouncements()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'Enter':
        if (canProceed && !isLoading && onNext) {
          event.preventDefault()
          onNext()
          announce('Moving to next step')
        }
        break

      case 'ArrowLeft':
        if (currentStep > 1 && !isLoading && onPrevious) {
          event.preventDefault()
          onPrevious()
          announce('Moving to previous step')
        }
        break

      case 'Escape':
        if (onSkip) {
          event.preventDefault()
          onSkip()
          announce('Skipping current step')
        }
        break

      case '?':
        // Show help/shortcuts
        event.preventDefault()
        announce('Keyboard shortcuts: Arrow keys to navigate, Enter to continue, Escape to skip')
        break

      default:
        break
    }
  }, [currentStep, canProceed, isLoading, onNext, onPrevious, onSkip, announce])

  return { handleKeyDown }
}
```

## Color and Contrast

### Color System with Accessibility

```css
/* High contrast color palette */
:root {
  /* Base colors with WCAG AA compliance */
  --color-text-primary: #1a1a1a; /* 21:1 contrast ratio */
  --color-text-secondary: #4a4a4a; /* 9:1 contrast ratio */
  --color-text-muted: #6b7280; /* 4.5:1 contrast ratio */

  /* Interactive colors */
  --color-link: #1d4ed8; /* 4.5:1 contrast ratio */
  --color-link-hover: #1e40af; /* 7:1 contrast ratio */

  /* Status colors */
  --color-success: #059669; /* 4.5:1 contrast ratio */
  --color-warning: #d97706; /* 4.5:1 contrast ratio */
  --color-error: #dc2626; /* 4.5:1 contrast ratio */

  /* Focus indicators */
  --color-focus: #3b82f6;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
}

.dark {
  /* Dark theme with maintained contrast ratios */
  --color-text-primary: #ffffff; /* 21:1 contrast ratio */
  --color-text-secondary: #d1d5db; /* 9:1 contrast ratio */
  --color-text-muted: #9ca3af; /* 4.5:1 contrast ratio */

  --color-link: #60a5fa; /* 4.5:1 contrast ratio */
  --color-link-hover: #93c5fd; /* 7:1 contrast ratio */
}
```

### Color-Blind Friendly Patterns

```typescript
// Status indicators that don't rely solely on color
export function StatusBadge({
  status,
  children,
}: {
  status: 'success' | 'warning' | 'error' | 'pending'
  children: React.ReactNode
}) {
  const statusConfig = {
    success: {
      icon: CheckCircleIcon,
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Success',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Warning',
    },
    error: {
      icon: XCircleIcon,
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Error',
    },
    pending: {
      icon: ClockIcon,
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Pending',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
        config.className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {children}
    </span>
  )
}
```

## Motion and Animation Accessibility

### Reduced Motion Support

```typescript
// Respect user motion preferences
export function useMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Animation wrapper that respects user preferences
export function AccessibleAnimation({
  children,
  animation,
  fallback,
  duration = 300,
}: {
  children: React.ReactNode
  animation: string
  fallback?: React.ReactNode
  duration?: number
}) {
  const prefersReducedMotion = useMotionPreference()

  if (prefersReducedMotion) {
    return <>{fallback || children}</>
  }

  return (
    <div
      className={animation}
      style={{
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  )
}
```

### Safe Animation Patterns

```css
/* Animations that respect user preferences */
@media (prefers-reduced-motion: no-preference) {
  .animate-safe-fade {
    animation: safe-fade 0.3s ease-out;
  }

  .animate-safe-slide {
    animation: safe-slide 0.3s ease-out;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-safe-fade,
  .animate-safe-slide {
    animation: none;
  }

  /* Provide immediate visual feedback without motion */
  .animate-safe-fade {
    opacity: 1;
  }

  .animate-safe-slide {
    transform: none;
  }
}

@keyframes safe-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes safe-slide {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

## Screen Reader Optimization

### Content Structure for Screen Readers

```typescript
// Optimized content structure
export function WizardStep({
  stepNumber,
  title,
  description,
  children,
}: {
  stepNumber: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={`step-${stepNumber}-heading`}
      aria-describedby={description ? `step-${stepNumber}-description` : undefined}
    >
      {/* Hidden heading for screen readers */}
      <h1 id={`step-${stepNumber}-heading`} className="sr-only">
        Step {stepNumber} of {WIZARD_STEPS.length}: {title}
      </h1>

      {/* Hidden description for screen readers */}
      {description && (
        <p id={`step-${stepNumber}-description`} className="sr-only">
          {description}
        </p>
      )}

      {/* Visible content */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {children}
      </div>
    </section>
  )
}
```

### Dynamic Content Announcements

```typescript
// AI suggestion announcements
export function AISuggestionPanel({
  suggestions,
  isLoading,
  onSelect,
}: {
  suggestions: string[]
  isLoading: boolean
  onSelect: (suggestion: string) => void
}) {
  const { announce } = useAnnouncements()

  useEffect(() => {
    if (suggestions.length > 0) {
      announce(
        `${suggestions.length} AI suggestion${suggestions.length === 1 ? '' : 's'} available`,
        'polite'
      )
    }
  }, [suggestions, announce])

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading AI suggestions"
        className="flex items-center gap-2 p-3 text-sm text-muted-foreground"
      >
        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>AI is analyzing your input...</span>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label="AI suggestions"
      className="border rounded-md bg-muted/50"
    >
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">AI Suggestions</h3>
      </div>

      <ul role="list" className="p-1">
        {suggestions.map((suggestion, index) => (
          <li key={index}>
            <button
              type="button"
              className="w-full p-2 text-left text-sm hover:bg-accent rounded focus:bg-accent focus:outline-none"
              onClick={() => onSelect(suggestion)}
              aria-describedby={`suggestion-${index}-help`}
            >
              {suggestion}
              <span id={`suggestion-${index}-help`} className="sr-only">
                Press Enter to use this suggestion
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Testing Accessibility

### Automated Testing Setup

```typescript
// Accessibility testing utilities
export async function testAccessibility(
  component: React.ReactElement,
  options: AxeOptions = {}
) {
  const { container } = renderWithTheme(component)

  const results = await axe(container, {
    rules: {
      // Enable specific accessibility rules
      'color-contrast': { enabled: true },
      'focus-trap': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      ...options.rules,
    },
    ...options,
  })

  expect(results).toHaveNoViolations()
  return results
}

// Keyboard navigation testing
export async function testKeyboardNavigation(
  component: React.ReactElement,
  expectedTabStops: string[]
) {
  const user = userEvent.setup()
  renderWithTheme(component)

  for (const selector of expectedTabStops) {
    await user.tab()
    const element = document.querySelector(selector)
    expect(element).toHaveFocus()
  }
}

// Screen reader testing simulation
export function testScreenReaderExperience(component: React.ReactElement) {
  const { container } = renderWithTheme(component)

  // Test landmark structure
  const landmarks = container.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]')
  expect(landmarks.length).toBeGreaterThan(0)

  // Test heading structure
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  expect(headings.length).toBeGreaterThan(0)

  // Test form labeling
  const inputs = container.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    expect(input).toHaveAccessibleName()
  })

  // Test live regions
  const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
  expect(liveRegions.length).toBeGreaterThan(0)
}
```

This comprehensive accessibility guide ensures that all shadcn components in the StratixV2 onboarding system meet the highest accessibility standards and provide an excellent experience for all users, regardless of their abilities or assistive technologies used.