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

    // Helper function to convert hex to oklch
    const hexToOklch = (hex: string) => {
      if (!hex) return null;

      // Remove # if present
      hex = hex.replace('#', '');

      // Convert hex to RGB
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;

      // Simple approximation for oklch (this is a simplified version)
      // For production, you'd want to use a proper color conversion library
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Luminance
      const c = Math.sqrt(r * r + g * g + b * b) / 3; // Simplified chroma
      const h = Math.atan2(g - b, r - 0.5) * (180 / Math.PI); // Simplified hue

      return `${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}`;
    };

    // Apply colors if they exist
    if (companyTheme.primaryColor) {
      const primaryOklch = hexToOklch(companyTheme.primaryColor);
      if (primaryOklch) {
        root.style.setProperty('--primary', `oklch(${primaryOklch})`);
        // Also update related colors
        root.style.setProperty('--primary-foreground', 'oklch(0.985 0 0)');
      }
    }

    if (companyTheme.secondaryColor) {
      const secondaryOklch = hexToOklch(companyTheme.secondaryColor);
      if (secondaryOklch) {
        root.style.setProperty('--secondary', `oklch(${secondaryOklch})`);
        root.style.setProperty('--secondary-foreground', 'oklch(0.985 0 0)');
      }
    }

    if (companyTheme.accentColor) {
      const accentOklch = hexToOklch(companyTheme.accentColor);
      if (accentOklch) {
        root.style.setProperty('--accent', `oklch(${accentOklch})`);
        root.style.setProperty('--accent-foreground', 'oklch(0.985 0 0)');

        // Also apply to chart colors
        root.style.setProperty('--chart-1', `oklch(${accentOklch})`);
      }
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