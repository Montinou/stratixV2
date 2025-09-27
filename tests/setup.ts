// Jest setup for React Testing Library and custom matchers
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Mock getComputedStyle
global.getComputedStyle = jest.fn().mockImplementation(() => ({
  getPropertyValue: jest.fn().mockReturnValue(''),
}))

// Mock Web APIs
global.HTMLElement.prototype.focus = jest.fn()
global.HTMLElement.prototype.scrollTo = jest.fn()
global.HTMLElement.prototype.hasPointerCapture = jest.fn()
global.HTMLElement.prototype.releasePointerCapture = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Extend expect with custom accessibility matchers
expect.extend({
  toBeAccessible: async (received: HTMLElement) => {
    const { axe } = await import('jest-axe')
    const results = await axe(received)

    if (results.violations.length === 0) {
      return {
        pass: true,
        message: () => 'Element is accessible',
      }
    }

    return {
      pass: false,
      message: () =>
        `Element has accessibility violations:\n${results.violations
          .map(violation => `- ${violation.description}`)
          .join('\n')}`,
    }
  },
})

// Performance testing helper
export const measurePerformance = (fn: () => void): number => {
  const start = performance.now()
  fn()
  const end = performance.now()
  return end - start
}

// Animation frame mock for testing animations
export const mockAnimationFrame = () => {
  let callbacks: FrameRequestCallback[] = []
  let currentTime = 0

  global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    callbacks.push(callback)
    return callbacks.length
  })

  global.cancelAnimationFrame = jest.fn((id: number) => {
    callbacks.splice(id - 1, 1)
  })

  return {
    triggerNextFrame: () => {
      currentTime += 16 // Simulate 60fps
      const currentCallbacks = [...callbacks]
      callbacks = []
      currentCallbacks.forEach(callback => callback(currentTime))
    },
    cleanup: () => {
      callbacks = []
      currentTime = 0
    }
  }
}

// Silence console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()

  // Reset localStorage and sessionStorage
  localStorageMock.clear()
  sessionStorageMock.clear()
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): Promise<R>
    }
  }
}