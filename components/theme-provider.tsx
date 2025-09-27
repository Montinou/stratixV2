'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

interface AccessibilityThemeContextType {
  reducedMotion: boolean;
  highContrast: boolean;
  forcedColors: boolean;
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
}

const AccessibilityThemeContext = createContext<AccessibilityThemeContextType | undefined>(undefined);

export function useAccessibilityTheme() {
  const context = useContext(AccessibilityThemeContext);
  if (!context) {
    throw new Error('useAccessibilityTheme must be used within a ThemeProvider');
  }
  return context;
}

interface AccessibilityThemeProviderProps {
  children: ReactNode;
}

function AccessibilityThemeProvider({ children }: AccessibilityThemeProviderProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [forcedColors, setForcedColors] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Check for high contrast preference
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Check for forced colors mode
    const mediaQuery = window.matchMedia('(forced-colors: active)');
    setForcedColors(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setForcedColors(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply accessibility classes to document
  useEffect(() => {
    const classes = [];
    if (reducedMotion) classes.push('reduce-motion');
    if (highContrast) classes.push('high-contrast');
    if (forcedColors) classes.push('forced-colors');

    // Remove existing accessibility classes
    document.documentElement.classList.remove('reduce-motion', 'high-contrast', 'forced-colors');

    // Add current classes
    if (classes.length > 0) {
      document.documentElement.classList.add(...classes);
    }
  }, [reducedMotion, highContrast, forcedColors]);

  const value = {
    reducedMotion,
    highContrast,
    forcedColors,
    setReducedMotion,
    setHighContrast,
  };

  return (
    <AccessibilityThemeContext.Provider value={value}>
      {children}
    </AccessibilityThemeContext.Provider>
  );
}

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="onboarding-theme"
      themes={["light", "dark"]}
      {...props}
    >
      <AccessibilityThemeProvider>
        {children}
      </AccessibilityThemeProvider>
    </NextThemesProvider>
  );
}

// Hook for theme management with accessibility considerations
export function useTheme() {
  const { theme, setTheme: nextSetTheme, systemTheme } = useNextTheme();
  const { reducedMotion } = useAccessibilityTheme();

  const setTheme = (newTheme: string) => {
    // Add a brief transition only if reduced motion is not enabled
    if (!reducedMotion) {
      document.documentElement.style.setProperty('transition', 'color-scheme 0.3s ease');
      setTimeout(() => {
        document.documentElement.style.removeProperty('transition');
      }, 300);
    }
    nextSetTheme(newTheme);
  };

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme: theme === 'system' ? systemTheme : theme,
    reducedMotion,
  };
}
