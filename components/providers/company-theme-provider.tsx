'use client';

import { useEffect, useState, createContext, useContext } from 'react';

interface CompanyTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
}

interface CompanyThemeContextType {
  theme: CompanyTheme | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyThemeContext = createContext<CompanyThemeContextType>({
  theme: null,
  loading: true,
  refresh: async () => {},
});

export const useCompanyTheme = () => useContext(CompanyThemeContext);

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<CompanyTheme | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch('/api/company/settings');
      if (!response.ok) {
        // If not authenticated or no company, use defaults
        console.log('Using default theme');
        return;
      }

      const data = await response.json();
      const companyTheme: CompanyTheme = {
        primaryColor: data.settings?.theme?.primaryColor,
        secondaryColor: data.settings?.theme?.secondaryColor,
        accentColor: data.settings?.theme?.accentColor,
        logoUrl: data.logoUrl,
      };

      setTheme(companyTheme);
      applyTheme(companyTheme);
    } catch (error) {
      console.error('Error fetching company theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (companyTheme: CompanyTheme) => {
    const root = document.documentElement;

    // Simplified approach: just use the HEX color directly with CSS color-mix
    const applyColorDirectly = (hex: string, varName: string, foregroundVar: string) => {
      if (!hex) return;

      // Apply the hex color directly
      root.style.setProperty(varName, hex);

      // Determine if we need light or dark foreground
      const rgb = parseInt(hex.replace('#', ''), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Set appropriate foreground color
      root.style.setProperty(foregroundVar, luma > 128 ? '#0a0a0a' : '#fafafa');
    };

    // Helper to create lighter/darker color variants using CSS color-mix
    const lighten = (hex: string, amount: number) => {
      return `color-mix(in srgb, ${hex} ${100 - amount}%, white)`;
    };

    const darken = (hex: string, amount: number) => {
      return `color-mix(in srgb, ${hex} ${100 - amount}%, black)`;
    };

    // Apply colors if they exist
    if (companyTheme.primaryColor) {
      applyColorDirectly(companyTheme.primaryColor, '--primary', '--primary-foreground');
      root.style.setProperty('--sidebar-primary', companyTheme.primaryColor);
      root.style.setProperty('--chart-1', companyTheme.primaryColor);
    }

    if (companyTheme.secondaryColor) {
      applyColorDirectly(companyTheme.secondaryColor, '--secondary', '--secondary-foreground');

      // Apply lighter version for muted and card
      const lighterSecondary = lighten(companyTheme.secondaryColor, 15);
      root.style.setProperty('--muted', lighterSecondary);
      root.style.setProperty('--card', lighterSecondary);

      // Muted and card foregrounds
      const darkerSecondary = darken(companyTheme.secondaryColor, 40);
      root.style.setProperty('--muted-foreground', darkerSecondary);
      root.style.setProperty('--card-foreground', '#0a0a0a');

      root.style.setProperty('--chart-2', companyTheme.secondaryColor);
    }

    if (companyTheme.accentColor) {
      applyColorDirectly(companyTheme.accentColor, '--accent', '--accent-foreground');

      root.style.setProperty('--sidebar-accent', companyTheme.accentColor);

      // Apply lighter versions for popover, input, border
      const lighterAccent = lighten(companyTheme.accentColor, 25);
      root.style.setProperty('--popover', lighterAccent);
      root.style.setProperty('--popover-foreground', '#0a0a0a');

      const subtleAccent = lighten(companyTheme.accentColor, 35);
      root.style.setProperty('--input', subtleAccent);
      root.style.setProperty('--border', subtleAccent);

      root.style.setProperty('--ring', companyTheme.accentColor);

      // Chart colors
      root.style.setProperty('--chart-3', companyTheme.accentColor);
      root.style.setProperty('--chart-4', lighten(companyTheme.accentColor, 10));
      root.style.setProperty('--chart-5', darken(companyTheme.accentColor, 10));
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const refresh = async () => {
    setLoading(true);
    await fetchCompanySettings();
  };

  return (
    <CompanyThemeContext.Provider value={{ theme, loading, refresh }}>
      {children}
    </CompanyThemeContext.Provider>
  );
}