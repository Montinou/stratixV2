import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { WizardContainer } from '@/components/onboarding/WizardContainer'
import { ThemeProvider } from '@/components/theme-provider'
import { AccessibilityProvider } from '@/components/onboarding/AccessibilityProvider'

const meta: Meta<typeof WizardContainer> = {
  title: 'Onboarding/WizardContainer',
  component: WizardContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The WizardContainer is the main layout component for the onboarding flow. It provides:

- Progress indication with animated progress bar
- Step navigation with keyboard support
- Accessibility features including skip links
- Theme support for light/dark modes
- Route protection for step access control

## Features

### Progress Tracking
- Visual progress bar showing completion percentage
- Step indicators with current/completed/accessible states
- Animated transitions between steps

### Navigation
- Previous/Next button controls
- Keyboard navigation (Arrow keys, Enter)
- Skip functionality for optional steps
- Route protection for unauthorized access

### Accessibility
- Skip links for keyboard navigation
- Screen reader announcements
- Focus management
- ARIA attributes and landmarks

### Theme Support
- Seamless light/dark mode switching
- Consistent styling across themes
- Customizable color schemes
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'landmark-one-main',
            enabled: true,
          },
          {
            id: 'page-has-heading-one',
            enabled: false, // Disabled as this is a layout component
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <AccessibilityProvider>
          <div className="min-h-screen">
            <Story />
          </div>
        </AccessibilityProvider>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    currentStep: {
      control: { type: 'number', min: 1, max: 5, step: 1 },
      description: 'Current active step in the wizard',
    },
    showProgress: {
      control: 'boolean',
      description: 'Whether to show the progress indicator',
    },
    showNavigation: {
      control: 'boolean',
      description: 'Whether to show navigation buttons',
    },
    canProceed: {
      control: 'boolean',
      description: 'Whether user can proceed to next step',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state for async operations',
    },
    showSkip: {
      control: 'boolean',
      description: 'Whether to show skip button',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    contentClassName: {
      control: 'text',
      description: 'CSS classes for content area',
    },
    navigationClassName: {
      control: 'text',
      description: 'CSS classes for navigation area',
    },
  },
  args: {
    onNext: fn(),
    onPrevious: fn(),
    onSkip: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

const SampleContent = ({ step }: { step: number }) => (
  <div className="text-center space-y-6 py-8">
    <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
      <span className="text-3xl font-bold text-primary">{step}</span>
    </div>
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">Step {step} Content</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        This is sample content for step {step} of the onboarding wizard.
        In a real implementation, this would contain the actual step component.
      </p>
    </div>
    <div className="flex gap-4 justify-center">
      <div className="w-32 h-8 bg-muted rounded animate-pulse" />
      <div className="w-24 h-8 bg-muted rounded animate-pulse" />
    </div>
  </div>
)

// Default story showing step 1
export const Default: Story = {
  args: {
    currentStep: 1,
    children: <SampleContent step={1} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    isLoading: false,
    showSkip: false,
  },
}

// Step progression examples
export const Step1Welcome: Story = {
  args: {
    currentStep: 1,
    children: <SampleContent step={1} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    showSkip: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Welcome step - first step in the onboarding flow with no previous button.',
      },
    },
  },
}

export const Step2InProgress: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: true,
    showNavigation: true,
    canProceed: false, // Form not yet valid
    showSkip: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Middle step with form validation - next button disabled until form is valid.',
      },
    },
  },
}

export const Step3WithData: Story = {
  args: {
    currentStep: 3,
    children: <SampleContent step={3} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    showSkip: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Step with valid data - user can proceed or skip.',
      },
    },
  },
}

export const Step5Completion: Story = {
  args: {
    currentStep: 5,
    children: <SampleContent step={5} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    showSkip: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Final completion step - no skip option, completion action available.',
      },
    },
  },
}

// Loading states
export const LoadingState: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during async operations - navigation disabled.',
      },
    },
  },
}

// Layout variations
export const NoProgress: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: false,
    showNavigation: true,
    canProceed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard without progress indicator - minimal layout.',
      },
    },
  },
}

export const NoNavigation: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: true,
    showNavigation: false,
    canProceed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard without navigation buttons - custom navigation handling.',
      },
    },
  },
}

export const MinimalLayout: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: false,
    showNavigation: false,
    canProceed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal wizard layout - content only.',
      },
    },
  },
}

// Custom styling
export const CustomStyling: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    className: 'bg-gradient-to-r from-blue-50 to-purple-50',
    contentClassName: 'bg-white/50 backdrop-blur-sm rounded-xl',
    navigationClassName: 'bg-white/80 backdrop-blur-sm',
    showProgress: true,
    showNavigation: true,
    canProceed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard with custom styling and glassmorphism effects.',
      },
    },
  },
}

// Error states
export const ValidationError: Story = {
  args: {
    currentStep: 2,
    children: (
      <div className="text-center space-y-6 py-8">
        <SampleContent step={2} />
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-destructive text-sm">
            Please fill in all required fields before proceeding.
          </p>
        </div>
      </div>
    ),
    showProgress: true,
    showNavigation: true,
    canProceed: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard step with validation errors - next button disabled.',
      },
    },
  },
}

// Responsive behavior
export const Mobile: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    showSkip: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Wizard optimized for mobile viewport.',
      },
    },
  },
}

export const Tablet: Story = {
  args: {
    currentStep: 3,
    children: <SampleContent step={3} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
    showSkip: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Wizard optimized for tablet viewport.',
      },
    },
  },
}

// Dark theme
export const DarkTheme: Story = {
  args: {
    currentStep: 3,
    children: <SampleContent step={3} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AccessibilityProvider>
          <div className="min-h-screen dark">
            <Story />
          </div>
        </AccessibilityProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Wizard in dark theme mode.',
      },
    },
  },
}

// All variations for Chromatic visual testing
export const ChromaticSnapshot: Story = {
  args: {
    currentStep: 2,
    children: <SampleContent step={2} />,
    showProgress: true,
    showNavigation: true,
    canProceed: true,
  },
  parameters: {
    chromatic: {
      modes: {
        'light desktop': { theme: 'light', viewport: 'desktop' },
        'dark desktop': { theme: 'dark', viewport: 'desktop' },
        'light mobile': { theme: 'light', viewport: 'mobile' },
        'dark mobile': { theme: 'dark', viewport: 'mobile' },
      },
    },
  },
}