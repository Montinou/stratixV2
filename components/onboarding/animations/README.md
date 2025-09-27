# Onboarding Animation System

A comprehensive visual polish and animation implementation using shadcn/ui components and design patterns for the frontend onboarding system.

## Features

- **Smooth Transitions**: Step-by-step animations with configurable directions and timings
- **Microinteractions**: Button hover states, form field focus animations, and click feedback
- **Loading States**: Skeleton components that match actual content layout
- **Progress Animations**: Smooth progress indicator transitions with visual feedback
- **Accessibility**: Full support for reduced motion preferences
- **Performance**: GPU-accelerated animations with 60fps optimization

## CSS Variables

The system uses CSS variables for consistent animation timing and easing:

```css
:root {
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;
  --animation-duration-slower: 700ms;
  --animation-ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --animation-ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Components

### Step Transitions

**StepTransition**: Handles entrance/exit animations between wizard steps
```tsx
<StepTransition
  currentStep={step}
  direction="right"
  staggerChildren
>
  {children}
</StepTransition>
```

**PageTransition**: Full page transition animations
```tsx
<PageTransition pageKey={currentPage} direction="slide">
  {pageContent}
</PageTransition>
```

### Form Animations

**AnimatedInput**: Enhanced input with floating labels and focus animations
```tsx
<AnimatedInput
  label="Company Name"
  placeholder="Enter company name"
  error={errors.name}
  success={isValid}
  icon={<Building2 />}
/>
```

**AnimatedSelect**: Select component with smooth open/close animations
```tsx
<AnimatedSelect
  label="Industry"
  value={industry}
  onValueChange={setIndustry}
>
  <SelectItem value="tech">Technology</SelectItem>
</AnimatedSelect>
```

### Loading States

**LoadingWrapper**: Seamless transition between loading and content states
```tsx
<LoadingWrapper
  isLoading={loading}
  skeleton={<CompanyInfoSkeleton />}
>
  {actualContent}
</LoadingWrapper>
```

**FormFieldSkeleton**: Skeleton that matches form field layout
```tsx
<FormFieldSkeleton />
<FormGroupSkeleton fields={3} />
```

### Progress Animations

Enhanced ProgressIndicator with:
- Smooth progress bar transitions
- Animated step indicators with completion states
- Shimmer effects for active progress
- Staggered connector line animations

## Animation Classes

### Core Animations
- `animate-fade-in` / `animate-fade-out`
- `animate-slide-in-from-left` / `animate-slide-in-from-right`
- `animate-scale-in` / `animate-scale-out`
- `animate-shimmer` - For loading states
- `animate-pulse-subtle` - Gentle pulsing
- `animate-bounce-subtle` - Micro bounce effect

### Interaction Classes
- `button-scale` - Button hover/click scaling
- `card-hover` - Card elevation on hover
- `input-focus` - Input field focus animations
- `progress-animate` - Progress bar transitions

### Performance Classes
- `animate-gpu` - GPU acceleration
- `transform-gpu` - GPU transform optimization

## Reduced Motion Support

The system automatically respects user motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --animation-duration-fast: 0ms;
    --animation-duration-normal: 0ms;
    --animation-duration-slow: 0ms;
  }
}
```

## Usage Examples

### Basic Step Animation
```tsx
import { FormStep } from "../WizardStep";

<FormStep
  title="Company Information"
  description="Tell us about your organization"
  delayContent
  animationDirection="up"
>
  {/* Content with staggered entrance */}
</FormStep>
```

### Form with Validation Animations
```tsx
import { AnimatedInput, FormSection } from "../animations";

<FormSection title="Basic Info" delay={200}>
  <AnimatedInput
    label="Company Name"
    value={name}
    onChange={setName}
    error={errors.name}
    onBlur={() => validateName(name)}
  />
</FormSection>
```

### Loading State Integration
```tsx
import { LoadingWrapper, StepSkeleton } from "../animations";

<LoadingWrapper
  isLoading={isProcessing}
  skeleton={<StepSkeleton fields={3} />}
>
  <FormContent />
</LoadingWrapper>
```

## Performance Considerations

1. **GPU Acceleration**: All animations use `transform` and `opacity` for optimal performance
2. **Will-Change**: Automatically managed to prevent unnecessary layer creation
3. **Animation Batching**: DOM updates are batched using `requestAnimationFrame`
4. **Reduced Motion**: Animations are disabled when users prefer reduced motion

## Customization

### Animation Timing
```tsx
// Custom duration
<StepTransition duration={500}>

// Custom easing
<div className="transition-all duration-300 ease-spring">
```

### Stagger Animations
```tsx
// Built-in staggering
<StepTransition staggerChildren staggerDelay={75}>

// Manual staggering
<CascadeAnimation delay={100} direction="up">
  {children}
</CascadeAnimation>
```

### Color Transitions
```tsx
// Success state
<AnimatedInput success={isValid} />

// Error state with animation
<AnimatedInput error="Field is required" />
```

## Browser Support

- **Modern Browsers**: Full animation support
- **Older Browsers**: Graceful degradation with reduced animations
- **High Contrast**: Automatic adaptation for accessibility
- **Forced Colors**: Proper handling in forced-colors mode

## Testing

The animation system includes considerations for:
- Visual regression testing
- Animation performance monitoring
- Accessibility compliance testing
- Reduced motion preference testing