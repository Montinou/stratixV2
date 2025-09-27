'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface StepTransitionProps {
  children: React.ReactNode;
  currentStep: number;
  direction?: "left" | "right" | "up" | "down";
  className?: string;
  duration?: number;
  staggerChildren?: boolean;
  staggerDelay?: number;
}

export function StepTransition({
  children,
  currentStep,
  direction = "right",
  className,
  duration = 300,
  staggerChildren = false,
  staggerDelay = 50
}: StepTransitionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevStepRef = useRef(currentStep);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getTransitionClasses = useCallback((entering: boolean, dir: string) => {
    const baseClasses = "transition-all ease-spring animate-gpu";

    if (entering) {
      switch (dir) {
        case "left":
          return `${baseClasses} animate-slide-in-from-left`;
        case "right":
          return `${baseClasses} animate-slide-in-from-right`;
        case "up":
          return `${baseClasses} animate-fade-in translate-y-4`;
        case "down":
          return `${baseClasses} animate-fade-in -translate-y-4`;
        default:
          return `${baseClasses} animate-fade-in`;
      }
    } else {
      switch (dir) {
        case "left":
          return `${baseClasses} animate-slide-out-to-left`;
        case "right":
          return `${baseClasses} animate-slide-out-to-right`;
        case "up":
          return `${baseClasses} animate-fade-out translate-y-4`;
        case "down":
          return `${baseClasses} animate-fade-out -translate-y-4`;
        default:
          return `${baseClasses} animate-fade-out`;
      }
    }
  }, []);

  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      setIsTransitioning(true);
      setIsVisible(false);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After exit animation, show new content
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        setIsTransitioning(false);
        prevStepRef.current = currentStep;
      }, duration / 2);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentStep, duration]);

  const transitionDirection = prevStepRef.current < currentStep ? direction :
    direction === "left" ? "right" :
    direction === "right" ? "left" :
    direction === "up" ? "down" :
    direction === "down" ? "up" : direction;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          getTransitionClasses(isVisible && !isTransitioning, transitionDirection),
          !isVisible && "opacity-0",
          isVisible && "opacity-100"
        )}
        style={{
          transitionDuration: `${duration}ms`
        }}
      >
        {staggerChildren ? (
          <StaggeredChildren delay={staggerDelay}>
            {children}
          </StaggeredChildren>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

interface StaggeredChildrenProps {
  children: React.ReactNode;
  delay?: number;
}

function StaggeredChildren({ children, delay = 50 }: StaggeredChildrenProps) {
  const [visibleIndexes, setVisibleIndexes] = useState(new Set<number>());
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    childrenArray.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleIndexes(prev => new Set([...prev, index]));
      }, index * delay);
      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [childrenArray.length, delay]);

  return (
    <>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-300 ease-spring",
            visibleIndexes.has(index)
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          )}
        >
          {child}
        </div>
      ))}
    </>
  );
}

// Page transition wrapper for full page changes
interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string | number;
  className?: string;
  direction?: "slide" | "fade" | "scale";
}

export function PageTransition({
  children,
  pageKey,
  className,
  direction = "slide"
}: PageTransitionProps) {
  const [currentPage, setCurrentPage] = useState(pageKey);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextChildren, setNextChildren] = useState(children);

  useEffect(() => {
    if (pageKey !== currentPage) {
      setIsTransitioning(true);
      setNextChildren(children);

      const timer = setTimeout(() => {
        setCurrentPage(pageKey);
        setIsTransitioning(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pageKey, currentPage, children]);

  const getTransitionClass = () => {
    switch (direction) {
      case "fade":
        return isTransitioning ? "animate-fade-out" : "animate-fade-in";
      case "scale":
        return isTransitioning ? "animate-scale-out" : "animate-scale-in";
      case "slide":
      default:
        return isTransitioning ? "animate-slide-out-to-right" : "animate-slide-in-from-left";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "transition-opacity duration-300 ease-spring animate-gpu",
        getTransitionClass(),
        isTransitioning && "pointer-events-none"
      )}>
        {isTransitioning ? nextChildren : children}
      </div>
    </div>
  );
}

// Content reveal animation
interface ContentRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function ContentReveal({
  children,
  delay = 0,
  direction = "up",
  className
}: ContentRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => setIsVisible(true), delay);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const getDirectionClasses = () => {
    switch (direction) {
      case "up":
        return "translate-y-4";
      case "down":
        return "-translate-y-4";
      case "left":
        return "translate-x-4";
      case "right":
        return "-translate-x-4";
      default:
        return "translate-y-4";
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        "transition-all duration-500 ease-spring animate-gpu",
        isVisible
          ? "opacity-100 translate-x-0 translate-y-0"
          : `opacity-0 ${getDirectionClasses()}`,
        className
      )}
    >
      {children}
    </div>
  );
}

// Cascade animation for multiple elements
interface CascadeAnimationProps {
  children: React.ReactNode[];
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  trigger?: boolean;
}

export function CascadeAnimation({
  children,
  delay = 100,
  direction = "up",
  className,
  trigger = true
}: CascadeAnimationProps) {
  const [visibleItems, setVisibleItems] = useState(new Set<number>());

  useEffect(() => {
    if (trigger) {
      const timers: NodeJS.Timeout[] = [];

      children.forEach((_, index) => {
        const timer = setTimeout(() => {
          setVisibleItems(prev => new Set([...prev, index]));
        }, index * delay);
        timers.push(timer);
      });

      return () => timers.forEach(timer => clearTimeout(timer));
    } else {
      setVisibleItems(new Set());
    }
  }, [children.length, delay, trigger]);

  const getDirectionClasses = (isVisible: boolean) => {
    const baseClasses = "transition-all duration-300 ease-spring animate-gpu";

    if (isVisible) {
      return `${baseClasses} opacity-100 translate-x-0 translate-y-0`;
    }

    switch (direction) {
      case "up":
        return `${baseClasses} opacity-0 translate-y-4`;
      case "down":
        return `${baseClasses} opacity-0 -translate-y-4`;
      case "left":
        return `${baseClasses} opacity-0 translate-x-4`;
      case "right":
        return `${baseClasses} opacity-0 -translate-x-4`;
      default:
        return `${baseClasses} opacity-0 translate-y-4`;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {children.map((child, index) => (
        <div
          key={index}
          className={getDirectionClasses(visibleItems.has(index))}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// AI Chat specific animations
interface ChatAnimationProps {
  children: React.ReactNode;
  isTyping?: boolean;
  className?: string;
}

export function ChatAnimation({
  children,
  isTyping = false,
  className
}: ChatAnimationProps) {
  const [showContent, setShowContent] = useState(!isTyping);

  useEffect(() => {
    if (isTyping) {
      setShowContent(false);
    } else {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  return (
    <div className={cn("relative", className)}>
      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-center space-x-1 p-4 animate-fade-in">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm text-muted-foreground ml-2">AI está escribiendo...</span>
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "transition-all duration-300 ease-spring",
        showContent ? "opacity-100 animate-slide-in-from-left" : "opacity-0"
      )}>
        {!isTyping && children}
      </div>
    </div>
  );
}

// Success animation for completion
export function SuccessAnimation({
  children,
  trigger = false,
  className
}: {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => setIsVisible(true), 200);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={cn(
      "transition-all duration-500 ease-spring animate-gpu",
      isVisible
        ? "opacity-100 scale-100 animate-bounce-subtle"
        : "opacity-0 scale-95",
      className
    )}>
      {children}
    </div>
  );
}