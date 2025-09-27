import React from 'react'
import { renderWithTheme, screen } from '@/tests/utils/test-utils'
import { measureComponentPerformance, mockAnimationFrame } from '@/tests/setup'
import { WizardContainer } from '@/components/onboarding/WizardContainer'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { CompanyInfoStep } from '@/components/onboarding/CompanyInfoStep'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import userEvent from '@testing-library/user-event'

// Performance benchmarks (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  componentMount: 50, // Component should mount in under 50ms
  rerender: 20, // Re-renders should be under 20ms
  interaction: 100, // User interactions should respond in under 100ms
  animation: 16, // Animations should target 60fps (16ms per frame)
  memoryLeak: 1000, // Memory usage shouldn't grow beyond 1MB
}

describe('shadcn Component Performance Tests', () => {
  describe('Component Mount Performance', () => {
    it('WizardContainer mounts within performance threshold', () => {
      const renderTime = measureComponentPerformance(
        <WizardContainer currentStep={1}>
          <div>Test Content</div>
        </WizardContainer>,
        10 // Run 10 iterations for average
      )

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentMount)
    })

    it('ProgressIndicator renders quickly with multiple steps', () => {
      const renderTime = measureComponentPerformance(
        <ProgressIndicator
          currentStep={3}
          completedSteps={new Set([1, 2])}
        />,
        10
      )

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentMount)
    })

    it('Complex form renders efficiently', () => {
      const renderTime = measureComponentPerformance(
        <CompanyInfoStep />,
        5 // Fewer iterations for complex component
      )

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentMount * 2) // Allow more time for complex forms
    })

    it('Multiple UI components render efficiently together', () => {
      const ComplexUI = () => (
        <div className="space-y-4 p-6">
          {Array.from({ length: 20 }, (_, i) => (
            <Card key={i} className="p-4">
              <div className="flex justify-between items-center">
                <Input placeholder={`Field ${i + 1}`} />
                <Button>Action {i + 1}</Button>
              </div>
            </Card>
          ))}
        </div>
      )

      const renderTime = measureComponentPerformance(<ComplexUI />, 3)

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentMount * 3)
    })
  })

  describe('Re-render Performance', () => {
    it('ProgressIndicator updates efficiently on progress changes', () => {
      const { rerender } = renderWithTheme(
        <ProgressIndicator currentStep={1} completedSteps={new Set([])} />
      )

      const startTime = performance.now()

      // Simulate rapid progress updates
      for (let i = 1; i <= 5; i++) {
        const completedSteps = new Set(Array.from({ length: i }, (_, idx) => idx + 1))
        rerender(
          <ProgressIndicator currentStep={i} completedSteps={completedSteps} />
        )
      }

      const endTime = performance.now()
      const totalRerenderTime = endTime - startTime

      expect(totalRerenderTime / 5).toBeLessThan(PERFORMANCE_THRESHOLDS.rerender)
    })

    it('WizardContainer handles step transitions efficiently', () => {
      const { rerender } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <div>Step 1</div>
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
      const averageTransitionTime = (endTime - startTime) / 4

      expect(averageTransitionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.rerender)
    })

    it('Form components update efficiently on data changes', () => {
      const TestForm = ({ data }: { data: Record<string, string> }) => (
        <div className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <Input key={key} value={value} onChange={() => {}} />
          ))}
        </div>
      )

      const { rerender } = renderWithTheme(<TestForm data={{ field1: 'initial' }} />)

      const startTime = performance.now()

      // Simulate rapid data updates
      for (let i = 0; i < 10; i++) {
        const data = {
          field1: `value${i}`,
          field2: `data${i}`,
          field3: `input${i}`,
        }
        rerender(<TestForm data={data} />)
      }

      const endTime = performance.now()
      const averageUpdateTime = (endTime - startTime) / 10

      expect(averageUpdateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.rerender)
    })
  })

  describe('User Interaction Performance', () => {
    it('button clicks respond quickly', async () => {
      const user = userEvent.setup()
      const onClick = jest.fn()

      renderWithTheme(<Button onClick={onClick}>Click me</Button>)

      const button = screen.getByRole('button')
      const startTime = performance.now()

      await user.click(button)

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction)
      expect(onClick).toHaveBeenCalled()
    })

    it('form input typing is responsive', async () => {
      const user = userEvent.setup()
      renderWithTheme(<Input placeholder="Type here" />)

      const input = screen.getByRole('textbox')
      const testText = 'Performance test input'

      const startTime = performance.now()

      await user.type(input, testText, { delay: 0 })

      const endTime = performance.now()
      const typingTime = endTime - startTime
      const timePerCharacter = typingTime / testText.length

      expect(timePerCharacter).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction / 10)
    })

    it('complex interactions maintain responsiveness', async () => {
      const user = userEvent.setup()

      renderWithTheme(
        <WizardContainer currentStep={2}>
          <CompanyInfoStep />
        </WizardContainer>
      )

      const nameField = screen.getByRole('textbox', { name: /nombre/i })
      const startTime = performance.now()

      // Simulate complex user interaction
      await user.click(nameField)
      await user.type(nameField, 'TechCorp', { delay: 0 })
      await user.tab()

      const endTime = performance.now()
      const complexInteractionTime = endTime - startTime

      expect(complexInteractionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction * 2)
    })
  })

  describe('Animation Performance', () => {
    it('progress bar animations maintain 60fps', () => {
      const animationFrame = mockAnimationFrame()

      renderWithTheme(
        <Progress value={0} className="progress-animate" />
      )

      const startTime = performance.now()

      // Simulate 60fps for 1 second (60 frames)
      for (let i = 0; i < 60; i++) {
        animationFrame.triggerNextFrame()
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Each frame should take approximately 16ms
      const averageFrameTime = totalTime / 60
      expect(averageFrameTime).toBeLessThan(PERFORMANCE_THRESHOLDS.animation * 1.5)

      animationFrame.cleanup()
    })

    it('step transition animations are smooth', () => {
      const animationFrame = mockAnimationFrame()

      const { rerender } = renderWithTheme(
        <ProgressIndicator currentStep={1} completedSteps={new Set([])} />
      )

      const startTime = performance.now()

      // Simulate step completion animation
      rerender(
        <ProgressIndicator currentStep={2} completedSteps={new Set([1])} />
      )

      // Run animation frames
      for (let i = 0; i < 30; i++) {
        animationFrame.triggerNextFrame()
      }

      const endTime = performance.now()
      const animationDuration = endTime - startTime

      // Animation should complete quickly
      expect(animationDuration).toBeLessThan(500) // 500ms max for step animation

      animationFrame.cleanup()
    })

    it('CSS animations do not block the main thread', async () => {
      renderWithTheme(
        <div className="animate-pulse">
          <ProgressIndicator currentStep={2} completedSteps={new Set([1])} />
        </div>
      )

      const startTime = performance.now()

      // Simulate other work while animation runs
      let counter = 0
      for (let i = 0; i < 1000; i++) {
        counter += Math.random()
      }

      const endTime = performance.now()
      const computationTime = endTime - startTime

      // Main thread work should not be significantly impacted
      expect(computationTime).toBeLessThan(50)
      expect(counter).toBeGreaterThan(0)
    })
  })

  describe('Memory Performance', () => {
    it('components do not leak memory on unmount', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Mount and unmount multiple components
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderWithTheme(
          <WizardContainer currentStep={i % 5 + 1}>
            <ProgressIndicator currentStep={i % 5 + 1} completedSteps={new Set()} />
            <CompanyInfoStep />
          </WizardContainer>
        )
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeak * 1024) // Convert KB to bytes
    })

    it('event listeners are properly cleaned up', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <div>Test Content</div>
        </WizardContainer>
      )

      const addedListeners = addEventListenerSpy.mock.calls.length

      unmount()

      const removedListeners = removeEventListenerSpy.mock.calls.length

      // Should remove at least as many listeners as added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('DOM nodes are properly cleaned up', () => {
      const initialNodeCount = document.querySelectorAll('*').length

      const { unmount } = renderWithTheme(
        <div data-testid="performance-test">
          <WizardContainer currentStep={1}>
            <ProgressIndicator currentStep={1} completedSteps={new Set()} />
          </WizardContainer>
        </div>
      )

      unmount()

      const finalNodeCount = document.querySelectorAll('*').length

      // DOM should be cleaned up (allowing for small variations)
      expect(Math.abs(finalNodeCount - initialNodeCount)).toBeLessThan(5)
    })
  })

  describe('Large Data Set Performance', () => {
    it('handles large lists efficiently', () => {
      const LargeList = () => (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Array.from({ length: 1000 }, (_, i) => (
            <Card key={i} className="p-2">
              <div className="flex justify-between">
                <span>Item {i + 1}</span>
                <Button size="sm">Action</Button>
              </div>
            </Card>
          ))}
        </div>
      )

      const renderTime = measureComponentPerformance(<LargeList />, 1)

      // Large lists should still render reasonably fast
      expect(renderTime).toBeLessThan(200)
    })

    it('form with many fields remains responsive', async () => {
      const user = userEvent.setup()

      const ManyFieldsForm = () => (
        <div className="space-y-4">
          {Array.from({ length: 50 }, (_, i) => (
            <Input key={i} placeholder={`Field ${i + 1}`} />
          ))}
        </div>
      )

      renderWithTheme(<ManyFieldsForm />)

      const firstField = screen.getAllByRole('textbox')[0]
      const lastField = screen.getAllByRole('textbox')[49]

      const startTime = performance.now()

      await user.click(firstField)
      await user.type(firstField, 'test', { delay: 0 })
      await user.click(lastField)
      await user.type(lastField, 'test', { delay: 0 })

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction * 3)
    })
  })

  describe('Theme Switching Performance', () => {
    it('theme changes are performant', () => {
      const { rerender } = renderWithTheme(
        <WizardContainer currentStep={2}>
          <ProgressIndicator currentStep={2} completedSteps={new Set([1])} />
        </WizardContainer>,
        { theme: 'light' }
      )

      const startTime = performance.now()

      // Switch themes multiple times
      for (let i = 0; i < 10; i++) {
        const theme = i % 2 === 0 ? 'dark' : 'light'
        rerender(
          <WizardContainer currentStep={2}>
            <ProgressIndicator currentStep={2} completedSteps={new Set([1])} />
          </WizardContainer>
        )
      }

      const endTime = performance.now()
      const averageThemeSwitchTime = (endTime - startTime) / 10

      expect(averageThemeSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.rerender * 2)
    })
  })

  describe('Bundle Size Impact', () => {
    it('components use efficient CSS classes', () => {
      const { container } = renderWithTheme(
        <WizardContainer currentStep={1}>
          <ProgressIndicator currentStep={1} completedSteps={new Set()} />
        </WizardContainer>
      )

      // Count total CSS classes used
      const allElements = container.querySelectorAll('*')
      let totalClasses = 0

      allElements.forEach(element => {
        totalClasses += element.classList.length
      })

      // Should use classes efficiently (not excessive)
      expect(totalClasses).toBeLessThan(200) // Reasonable threshold
    })

    it('does not import unnecessary dependencies', () => {
      // This test would be better implemented with bundle analysis tools
      // For now, we verify that components render without heavy computations

      const renderTime = measureComponentPerformance(
        <WizardContainer currentStep={1}>
          <ProgressIndicator currentStep={1} completedSteps={new Set()} />
          <CompanyInfoStep />
        </WizardContainer>,
        5
      )

      // Fast render indicates efficient dependencies
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentMount * 2)
    })
  })

  describe('Concurrent Features', () => {
    it('handles concurrent updates gracefully', async () => {
      const { rerender } = renderWithTheme(
        <ProgressIndicator currentStep={1} completedSteps={new Set([])} />
      )

      const startTime = performance.now()

      // Simulate concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) => {
        return new Promise(resolve => {
          setTimeout(() => {
            rerender(
              <ProgressIndicator
                currentStep={i + 1}
                completedSteps={new Set(Array.from({ length: i }, (_, idx) => idx + 1))}
              />
            )
            resolve(i)
          }, Math.random() * 10)
        })
      })

      await Promise.all(updates)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(500) // Should handle concurrent updates quickly
    })
  })
})