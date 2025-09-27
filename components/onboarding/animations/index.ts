// Enhanced Animation Components for Onboarding
// Comprehensive visual polish and animation implementation using shadcn/ui patterns

// Step Transitions and Page Animations
export {
  StepTransition,
  PageTransition,
  ContentReveal,
  CascadeAnimation,
  ChatAnimation,
  SuccessAnimation
} from "../step-transitions";

// Form Field Animations
export {
  AnimatedInput,
  AnimatedTextarea,
  AnimatedSelect,
  AnimatedCheckbox,
  AnimatedRadioGroup,
  FormSection
} from "../animated-forms";

// Loading States
export {
  FormFieldSkeleton,
  FormGroupSkeleton,
  StepHeaderSkeleton,
  StepSkeleton,
  ProgressSkeleton,
  InputSkeleton,
  SelectSkeleton,
  CheckboxGroupSkeleton,
  NavigationSkeleton,
  CompanyInfoSkeleton,
  OrganizationSkeleton,
  LoadingWrapper
} from "../skeletons";

// Animation Utilities
export const animationPresets = {
  // Duration presets using CSS variables
  duration: {
    fast: "var(--animation-duration-fast, 150ms)",
    normal: "var(--animation-duration-normal, 300ms)",
    slow: "var(--animation-duration-slow, 500ms)",
    slower: "var(--animation-duration-slower, 700ms)"
  },

  // Easing presets
  easing: {
    smooth: "var(--animation-ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))",
    spring: "var(--animation-ease-spring, cubic-bezier(0.175, 0.885, 0.32, 1.275))",
    inSmooth: "var(--animation-ease-in-smooth, cubic-bezier(0.4, 0, 1, 1))",
    outSmooth: "var(--animation-ease-out-smooth, cubic-bezier(0, 0, 0.2, 1))"
  },

  // Common animation classes
  classes: {
    gpu: "animate-gpu transform-gpu",
    hover: "card-hover",
    buttonScale: "button-scale",
    inputFocus: "input-focus",
    progressAnimate: "progress-animate",
    fadeIn: "animate-fade-in",
    fadeOut: "animate-fade-out",
    slideInLeft: "animate-slide-in-from-left",
    slideInRight: "animate-slide-in-from-right",
    slideOutLeft: "animate-slide-out-to-left",
    slideOutRight: "animate-slide-out-to-right",
    scaleIn: "animate-scale-in",
    scaleOut: "animate-scale-out",
    pulseSubtle: "animate-pulse-subtle",
    bounceSubtle: "animate-bounce-subtle",
    shimmer: "animate-shimmer",
    progressFlow: "animate-progress-flow"
  },

  // Stagger animation helper
  stagger: (index: number, delay: number = 50) => ({
    animationDelay: `${index * delay}ms`,
    transition: "all var(--animation-duration-normal) var(--animation-ease-spring)"
  }),

  // Reduced motion check
  respectsReducedMotion: () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }
};

// Animation hooks
export const useStaggeredAnimation = (itemCount: number, delay: number = 50) => {
  const [visibleItems, setVisibleItems] = useState(new Set<number>());

  useEffect(() => {
    if (animationPresets.respectsReducedMotion()) {
      // Show all items immediately if reduced motion is preferred
      setVisibleItems(new Set(Array.from({ length: itemCount }, (_, i) => i)));
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    Array.from({ length: itemCount }, (_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, index]));
      }, index * delay);
      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [itemCount, delay]);

  return visibleItems;
};

// Performance optimization helpers
export const animationHelpers = {
  // Enable GPU acceleration
  enableGPU: (element: HTMLElement) => {
    element.style.transform = "translateZ(0)";
    element.style.willChange = "transform, opacity";
  },

  // Disable GPU acceleration after animation
  disableGPU: (element: HTMLElement) => {
    element.style.willChange = "auto";
  },

  // Batch DOM updates for better performance
  batchUpdates: (callback: () => void) => {
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(callback);
    } else {
      callback();
    }
  },

  // Check if animations should be disabled
  shouldAnimate: () => {
    return !animationPresets.respectsReducedMotion();
  }
};

import { useState, useEffect } from "react";