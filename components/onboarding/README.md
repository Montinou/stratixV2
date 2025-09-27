# Onboarding Wizard Foundation

This directory contains the foundational wizard infrastructure for the AI-powered onboarding experience, built with shadcn/ui components and Next.js 14.

## 🎯 Features Implemented

### ✅ Core Infrastructure
- **Zustand Store** with localStorage persistence
- **TypeScript Interfaces** with strict typing
- **Next.js App Router** integration
- **shadcn/ui Components** throughout

### ✅ Navigation System
- URL-based routing for wizard steps
- Browser back/forward support
- Deep linking to specific steps
- Navigation guards for step prerequisites

### ✅ Accessibility
- ARIA labels and roles for screen readers
- Keyboard navigation (Arrow keys, Enter, Escape)
- Focus management and skip links
- Live region announcements
- Route protection

### ✅ Visual Components
- Progress indicator with completion percentage
- Step-by-step visual navigation
- Responsive design (mobile-first)
- Consistent shadcn/ui styling

## 📁 Component Structure

```
components/onboarding/
├── WizardContainer.tsx      # Main wizard wrapper with accessibility
├── WizardStep.tsx          # Reusable step layouts
├── ProgressIndicator.tsx   # Visual progress tracking
├── WizardNavigation.tsx    # Navigation controls
├── AccessibilityProvider.tsx # Screen reader support
└── index.ts               # Export all components

app/onboarding/
├── layout.tsx             # Onboarding layout
├── page.tsx              # Redirect to welcome
├── welcome/page.tsx      # Step 1: Welcome
├── company/page.tsx      # Step 2: Company info
├── organization/page.tsx # Step 3: Organization
└── complete/page.tsx     # Step 4: Completion

lib/
├── stores/onboarding-store.ts  # Zustand state management
└── types/onboarding.ts         # TypeScript interfaces
```

## 🚀 Usage Examples

### Basic Wizard Container
```tsx
import { OnboardingLayout } from '@/components/onboarding';

export default function MyStep() {
  return (
    <OnboardingLayout step={2} canProceed={true}>
      <div>Your step content here</div>
    </OnboardingLayout>
  );
}
```

### Using the Store
```tsx
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

function MyComponent() {
  const { currentStep, nextStep, setStepData } = useOnboardingStore();

  const handleNext = () => {
    setStepData('company', { name: 'My Company' });
    nextStep();
  };

  return <button onClick={handleNext}>Continue</button>;
}
```

### Step Layouts
```tsx
import { FormStep, WelcomeStep, CompletionStep } from '@/components/onboarding';

// For welcome pages
<WelcomeStep title="Welcome!" description="Getting started">
  {/* Hero content */}
</WelcomeStep>

// For forms
<FormStep title="Company Info" description="Tell us about your company">
  {/* Form fields */}
</FormStep>

// For completion
<CompletionStep title="Done!" description="Setup complete">
  {/* Success content */}
</CompletionStep>
```

## 🔧 State Management

The wizard uses Zustand for state management with localStorage persistence:

```typescript
interface OnboardingState {
  currentStep: number;           // Current wizard step
  totalSteps: number;           // Total number of steps
  completedSteps: Set<number>;  // Set of completed step numbers
  stepData: {                   // Form data for each step
    welcome: WelcomeData;
    company: CompanyData;
    organization: OrganizationData;
  };
  // Navigation methods
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeStep: (step: number) => void;
  setStepData: (step, data) => void;
  // ... other methods
}
```

## 🎨 shadcn/ui Components Used

- **Card** - Step containers and content cards
- **Button** - Navigation and action buttons
- **Progress** - Visual progress indicator
- **Badge** - Status indicators and labels
- **Input/Select/Textarea** - Form components
- **Separator** - Visual dividers
- **Alert** - Error and info messages

## ♿ Accessibility Features

- **Screen Reader Support**: Comprehensive ARIA labels and live regions
- **Keyboard Navigation**:
  - Arrow keys for step navigation
  - Enter to proceed
  - Escape to cancel/exit
  - Tab navigation within steps
- **Focus Management**: Automatic focus on step transitions
- **Skip Links**: Quick navigation for keyboard users
- **Route Protection**: Prevents access to incomplete prerequisites

## 🔄 Navigation Flow

1. **Welcome** (`/onboarding/welcome`) - Hero and introduction
2. **Company** (`/onboarding/company`) - Basic company information
3. **Organization** (`/onboarding/organization`) - Department structure
4. **Complete** (`/onboarding/complete`) - Success and redirection

## 🧪 Testing the Wizard

1. Navigate to `/onboarding` to start the wizard
2. Test keyboard navigation with arrow keys and tab
3. Try refreshing the page (state should persist)
4. Test screen reader compatibility
5. Verify mobile responsiveness

## 🔮 Ready for Extensions

This foundation is designed to support:
- AI chat integration (Task #72)
- Smart form components (Task #73)
- Visual polish and animations (Task #74)
- Advanced accessibility features (Task #75)

The architecture is modular and extensible, making it easy to add new features without breaking existing functionality.