# Animation Patterns for shadcn Components

This document outlines the animation patterns and best practices used in the StratixV2 onboarding system, ensuring smooth, performant, and accessible animations.

## Animation Principles

### Performance Targets
- **60fps**: All animations should maintain 60 frames per second
- **GPU Acceleration**: Use `transform` and `opacity` for hardware acceleration
- **Duration Guidelines**:
  - Micro-interactions: 150ms
  - Transitions: 300ms
  - Complex animations: 500ms max

### Accessibility Considerations
- **Respect user preferences**: Honor `prefers-reduced-motion`
- **Essential animations only**: Avoid decorative animations that don't add value
- **Focus indicators**: Ensure animations don't interfere with focus visibility

## Core Animation Classes

### Transform-based Animations

```css
/* Scale animations for feedback */
.animate-scale-in {
  animation: scale-in 0.3s ease-out forwards;
}

@keyframes scale-in {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-scale-out {
  animation: scale-out 0.2s ease-in forwards;
}

@keyframes scale-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}

/* Button hover effects */
.button-scale {
  transition: transform 0.15s ease-out;
}

.button-scale:hover {
  transform: scale(1.05);
}

.button-scale:active {
  transform: scale(0.98);
}
```

### Progress Animations

```css
/* Smooth progress bar filling */
.progress-animate {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Progress flow overlay */
.animate-progress-flow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 33%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: progress-flow 2s linear infinite;
}

@keyframes progress-flow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
```

### Step Transition Animations

```css
/* Staggered entrance animations */
.animate-stagger {
  opacity: 0;
  transform: translateY(20px);
  animation: slide-in-up 0.4s ease-out forwards;
}

.animate-stagger:nth-child(1) { animation-delay: 0ms; }
.animate-stagger:nth-child(2) { animation-delay: 100ms; }
.animate-stagger:nth-child(3) { animation-delay: 200ms; }
.animate-stagger:nth-child(4) { animation-delay: 300ms; }
.animate-stagger:nth-child(5) { animation-delay: 400ms; }

@keyframes slide-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Loading Animations

```css
/* Skeleton loading animation */
.animate-skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner animation */
.animate-spin-slow {
  animation: spin 2s linear infinite;
}

.animate-pulse-slow {
  animation: pulse 3s ease-in-out infinite;
}
```

## Component-Specific Animations

### WizardContainer Animations

```typescript
// Step transition animation hook
export function useStepTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionToStep = useCallback(async (
    direction: 'forward' | 'backward'
  ) => {
    setIsTransitioning(true)

    // Exit current step
    const exitClass = direction === 'forward'
      ? 'animate-slide-out-left'
      : 'animate-slide-out-right'

    document.querySelector('[data-wizard-content]')?.classList.add(exitClass)
    await new Promise(resolve => setTimeout(resolve, 200))

    // Enter new step
    const enterClass = direction === 'forward'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left'

    document.querySelector('[data-wizard-content]')?.classList.remove(exitClass)
    document.querySelector('[data-wizard-content]')?.classList.add(enterClass)

    await new Promise(resolve => setTimeout(resolve, 200))

    document.querySelector('[data-wizard-content]')?.classList.remove(enterClass)
    setIsTransitioning(false)
  }, [])

  return { isTransitioning, transitionToStep }
}
```

### ProgressIndicator Animations

```typescript
// Animated progress updates
export function useAnimatedProgress(targetProgress: number) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const [animatedCount, setAnimatedCount] = useState(0)

  useEffect(() => {
    const progressTimer = setTimeout(() => {
      setCurrentProgress(targetProgress)
    }, 100)

    const countTimer = setTimeout(() => {
      setAnimatedCount(Math.floor(targetProgress / 20)) // Steps completed
    }, 150)

    return () => {
      clearTimeout(progressTimer)
      clearTimeout(countTimer)
    }
  }, [targetProgress])

  return { currentProgress, animatedCount }
}
```

### Form Field Animations

```css
/* Focus animation for form fields */
.form-field {
  position: relative;
  transition: all 0.2s ease-out;
}

.form-field::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: hsl(var(--primary));
  transition: width 0.3s ease-out;
}

.form-field:focus-within::after {
  width: 100%;
}

/* Error shake animation */
.animate-shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
```

### AI Integration Animations

```css
/* AI thinking animation */
.ai-thinking {
  position: relative;
  overflow: hidden;
}

.ai-thinking::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(139, 92, 246, 0.3),
    transparent
  );
  animation: ai-scan 2s linear infinite;
}

@keyframes ai-scan {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* AI suggestion fade-in */
.ai-suggestion-enter {
  opacity: 0;
  transform: translateY(10px);
  animation: ai-suggestion-enter 0.4s ease-out forwards;
}

@keyframes ai-suggestion-enter {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Animation Utilities

### React Hooks

```typescript
// Generic animation hook
export function useAnimation(
  trigger: boolean,
  duration: number = 300
) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [trigger, duration])

  return isAnimating
}

// Intersection Observer animation hook
export function useInViewAnimation(
  options: IntersectionObserverInit = {}
) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref, options])

  return [setRef, isInView] as const
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
```

### Animation Components

```typescript
// Fade component for conditional rendering
export function Fade({
  show,
  children,
  duration = 300,
  className = '',
}: {
  show: boolean
  children: React.ReactNode
  duration?: number
  className?: string
}) {
  const [shouldRender, setShouldRender] = useState(show)

  useEffect(() => {
    if (show) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration])

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        'transition-opacity',
        show ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Slide component for directional animations
export function Slide({
  show,
  direction = 'up',
  children,
  duration = 300,
}: {
  show: boolean
  direction?: 'up' | 'down' | 'left' | 'right'
  children: React.ReactNode
  duration?: number
}) {
  const transforms = {
    up: show ? 'translateY(0)' : 'translateY(20px)',
    down: show ? 'translateY(0)' : 'translateY(-20px)',
    left: show ? 'translateX(0)' : 'translateX(20px)',
    right: show ? 'translateX(0)' : 'translateX(-20px)',
  }

  return (
    <div
      className="transition-all"
      style={{
        transform: transforms[direction],
        opacity: show ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  )
}
```

## Performance Optimization

### CSS Optimization

```css
/* Use GPU acceleration for animations */
.animate-gpu {
  transform: translateZ(0);
  will-change: transform, opacity;
}

/* Optimize for performance */
.animate-performance {
  /* Avoid animating these properties */
  /* width, height, top, left, margin, padding */

  /* Prefer these properties */
  transform: translateX(0);
  opacity: 1;
}

/* Contain layout shifts */
.animate-contained {
  contain: layout style paint;
}
```

### JavaScript Optimization

```typescript
// Use RAF for smooth animations
export function useRAFAnimation(callback: () => void, deps: any[]) {
  useEffect(() => {
    let rafId: number

    const animate = () => {
      callback()
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, deps)
}

// Throttle animation updates
export function useThrottledAnimation(
  callback: () => void,
  delay: number = 16 // ~60fps
) {
  const lastRun = useRef(Date.now())

  return useCallback(() => {
    if (Date.now() - lastRun.current >= delay) {
      callback()
      lastRun.current = Date.now()
    }
  }, [callback, delay])
}
```

## Accessibility Best Practices

### Reduced Motion Support

```typescript
// Animation wrapper that respects user preferences
export function AnimationWrapper({
  children,
  fallback,
  className = '',
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>
  }

  return (
    <div className={cn(!prefersReducedMotion && className)}>
      {children}
    </div>
  )
}
```

### Focus Management During Animations

```typescript
// Maintain focus during animations
export function useFocusDuringAnimation(
  isAnimating: boolean,
  elementRef: RefObject<HTMLElement>
) {
  useEffect(() => {
    if (isAnimating && elementRef.current) {
      const activeElement = document.activeElement as HTMLElement

      // Temporarily disable focus on animated element
      elementRef.current.setAttribute('tabindex', '-1')

      return () => {
        elementRef.current?.removeAttribute('tabindex')

        // Restore focus if needed
        if (activeElement && elementRef.current?.contains(activeElement)) {
          activeElement.focus()
        }
      }
    }
  }, [isAnimating, elementRef])
}
```

## Testing Animation Patterns

### Animation Testing Utilities

```typescript
// Mock animations for testing
export function mockAnimations() {
  const originalRAF = window.requestAnimationFrame
  const originalCAF = window.cancelAnimationFrame

  let callbacks: FrameRequestCallback[] = []
  let currentTime = 0

  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    callbacks.push(callback)
    return callbacks.length
  })

  window.cancelAnimationFrame = jest.fn((id: number) => {
    callbacks.splice(id - 1, 1)
  })

  const triggerFrame = () => {
    currentTime += 16
    const currentCallbacks = [...callbacks]
    callbacks = []
    currentCallbacks.forEach(callback => callback(currentTime))
  }

  const cleanup = () => {
    window.requestAnimationFrame = originalRAF
    window.cancelAnimationFrame = originalCAF
    callbacks = []
    currentTime = 0
  }

  return { triggerFrame, cleanup }
}

// Test animation performance
export function testAnimationPerformance(
  animationCallback: () => void,
  expectedDuration: number
) {
  const startTime = performance.now()
  animationCallback()
  const endTime = performance.now()

  const actualDuration = endTime - startTime
  expect(actualDuration).toBeLessThan(expectedDuration)
}
```

## Common Animation Pitfalls

### Avoid These Patterns

```typescript
// ❌ Don't animate layout properties
const BadAnimation = styled.div`
  transition: width 0.3s ease-out; /* Causes layout shift */
`

// ✅ Animate transform instead
const GoodAnimation = styled.div`
  transition: transform 0.3s ease-out;
  transform: scaleX(${props => props.progress});
`

// ❌ Don't use setTimeout for animations
setTimeout(() => {
  element.style.opacity = '1'
}, 300)

// ✅ Use CSS transitions or proper animation libraries
element.style.transition = 'opacity 0.3s ease-out'
element.style.opacity = '1'
```

### Memory Leaks Prevention

```typescript
// Always cleanup animation listeners
useEffect(() => {
  const element = ref.current
  if (!element) return

  const handleTransitionEnd = () => {
    // Animation complete
  }

  element.addEventListener('transitionend', handleTransitionEnd)

  return () => {
    element.removeEventListener('transitionend', handleTransitionEnd)
  }
}, [])
```

This animation patterns guide ensures consistent, performant, and accessible animations throughout the shadcn component system in StratixV2.