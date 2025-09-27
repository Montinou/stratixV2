import type { Meta, StoryObj } from '@storybook/react'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { ThemeProvider } from '@/components/theme-provider'
import { useState } from 'react'

const meta: Meta<typeof ProgressIndicator> = {
  title: 'Onboarding/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
The ProgressIndicator displays the current progress in the onboarding wizard with:

- Animated progress bar showing completion percentage
- Step indicators with visual states (current, completed, accessible, disabled)
- Smooth animations for progress changes
- Connection lines between steps
- Accessibility support with proper ARIA labels

## Features

### Visual States
- **Current**: Highlighted with ring and pulse animation
- **Completed**: Green background with checkmark icon
- **Accessible**: Can be clicked/focused (previous steps)
- **Disabled**: Grayed out and non-interactive (future steps)

### Animations
- Progress bar fills smoothly with transition effects
- Step completion triggers scale animation
- Progress flow animation for active connections
- Staggered entrance animations for step indicators

### Accessibility
- Progress bar has proper ARIA label with percentage
- Step buttons include descriptive labels
- Keyboard navigation support
- Screen reader friendly
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'button-name',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <div className="p-6 bg-background">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    currentStep: {
      control: { type: 'number', min: 1, max: 5, step: 1 },
      description: 'Current active step (1-5)',
    },
    completedSteps: {
      control: 'object',
      description: 'Set of completed step numbers',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Helper to create Set from array for Storybook controls
const createStepsSet = (steps: number[]) => new Set(steps)

// Basic states
export const NotStarted: Story = {
  args: {
    currentStep: 1,
    completedSteps: createStepsSet([]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no completed steps - 0% progress.',
      },
    },
  },
}

export const FirstStep: Story = {
  args: {
    currentStep: 1,
    completedSteps: createStepsSet([]),
  },
  parameters: {
    docs: {
      description: {
        story: 'User is on first step - only step 1 is accessible.',
      },
    },
  },
}

export const SecondStep: Story = {
  args: {
    currentStep: 2,
    completedSteps: createStepsSet([1]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress to second step - step 1 completed, step 2 current.',
      },
    },
  },
}

export const MiddleProgress: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Middle of workflow - 40% complete, 2 steps done.',
      },
    },
  },
}

export const NearCompletion: Story = {
  args: {
    currentStep: 4,
    completedSteps: createStepsSet([1, 2, 3]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Almost finished - 60% complete, one step remaining.',
      },
    },
  },
}

export const FullyCompleted: Story = {
  args: {
    currentStep: 5,
    completedSteps: createStepsSet([1, 2, 3, 4, 5]),
  },
  parameters: {
    docs: {
      description: {
        story: 'All steps completed - 100% progress with success styling.',
      },
    },
  },
}

// Animation demonstration
export const AnimatedProgress: Story = {
  render: () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [completedSteps, setCompletedSteps] = useState(new Set<number>())

    const advanceStep = () => {
      if (currentStep < 5) {
        const newCompleted = new Set(completedSteps)
        newCompleted.add(currentStep)
        setCompletedSteps(newCompleted)
        setCurrentStep(currentStep + 1)
      }
    }

    const reset = () => {
      setCurrentStep(1)
      setCompletedSteps(new Set())
    }

    return (
      <div className="space-y-6">
        <ProgressIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
        <div className="flex gap-2 justify-center">
          <button
            onClick={advanceStep}
            disabled={currentStep >= 5}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            Advance Step
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
          >
            Reset
          </button>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Step {currentStep} of 5 • {Math.round((completedSteps.size / 5) * 100)}% Complete
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing smooth animations between progress states.',
      },
    },
  },
}

// Edge cases
export const SkippedStep: Story = {
  args: {
    currentStep: 4,
    completedSteps: createStepsSet([1, 3]), // Step 2 skipped
  },
  parameters: {
    docs: {
      description: {
        story: 'Scenario where a step was skipped - step 2 not in completed set.',
      },
    },
  },
}

export const InvalidState: Story = {
  args: {
    currentStep: 4,
    completedSteps: createStepsSet([1]), // Missing step 2 and 3
  },
  parameters: {
    docs: {
      description: {
        story: 'Invalid state where user cannot access current step - would trigger route protection.',
      },
    },
  },
}

// Accessibility demonstrations
export const AccessibilityFocus: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Accessibility demonstration - steps 1-3 are focusable, 4-5 are disabled.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement
    const firstStep = canvas.querySelector('[role="button"][aria-label*="Paso 1"]') as HTMLElement
    if (firstStep) {
      firstStep.focus()
    }
  },
}

// Custom styling
export const CustomStyling: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
    className: 'bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl',
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress indicator with custom background styling.',
      },
    },
  },
}

// Theme variations
export const DarkTheme: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div className="p-6 bg-background dark">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Progress indicator in dark theme.',
      },
    },
  },
}

// Responsive behavior
export const Mobile: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Progress indicator optimized for mobile screens.',
      },
    },
  },
}

export const CompactMode: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
    className: 'scale-75',
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version for space-constrained layouts.',
      },
    },
  },
}

// All step states for visual testing
export const AllStepStates: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 1 - Getting Started</h3>
        <ProgressIndicator currentStep={1} completedSteps={createStepsSet([])} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 2 - In Progress</h3>
        <ProgressIndicator currentStep={2} completedSteps={createStepsSet([1])} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 3 - Halfway</h3>
        <ProgressIndicator currentStep={3} completedSteps={createStepsSet([1, 2])} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 4 - Almost Done</h3>
        <ProgressIndicator currentStep={4} completedSteps={createStepsSet([1, 2, 3])} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 5 - Completed</h3>
        <ProgressIndicator currentStep={5} completedSteps={createStepsSet([1, 2, 3, 4, 5])} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Overview of all possible step states in the progress indicator.',
      },
    },
  },
}

// Visual regression testing
export const ChromaticSnapshot: Story = {
  args: {
    currentStep: 3,
    completedSteps: createStepsSet([1, 2]),
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