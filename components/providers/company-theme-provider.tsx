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

    // Proper HEX to OKLCH conversion
    const hexToOklch = (hex: string) => {
      if (!hex) return null;

      // Remove # if present
      hex = hex.replace('#', '');

      // Convert hex to RGB
      let r = parseInt(hex.slice(0, 2), 16) / 255;
      let g = parseInt(hex.slice(2, 4), 16) / 255;
      let b = parseInt(hex.slice(4, 6), 16) / 255;

      // Convert RGB to Linear RGB
      const toLinear = (c: number) => {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };

      r = toLinear(r);
      g = toLinear(g);
      b = toLinear(b);

      // Convert Linear RGB to XYZ (D65 illuminant)
      const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
      const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
      const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

      // Convert XYZ to Lab
      const xn = 0.95047;
      const yn = 1.00000;
      const zn = 1.08883;

      const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (903.3 * x / xn + 16) / 116;
      const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (903.3 * y / yn + 16) / 116;
      const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (903.3 * z / zn + 16) / 116;

      const L = 116 * fy - 16;
      const a = 500 * (fx - fy);
      const bLab = 200 * (fy - fz);

      // Convert Lab to OKLab (approximation)
      const l = L / 100;
      const chroma = Math.sqrt(a * a + bLab * bLab) / 150;
      let hue = Math.atan2(bLab, a) * 180 / Math.PI;
      if (hue < 0) hue += 360;

      return `${l.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)}`;
    };

    // Helper to determine if a color is light or dark
    const isLightColor = (hex: string): boolean => {
      const rgb = parseInt(hex.replace('#', ''), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma > 128;
    };

    // Apply colors if they exist
    if (companyTheme.primaryColor) {
      const primaryOklch = hexToOklch(companyTheme.primaryColor);
      if (primaryOklch) {
        root.style.setProperty('--primary', `oklch(${primaryOklch})`);
        // Set foreground based on background lightness
        const foreground = isLightColor(companyTheme.primaryColor)
          ? 'oklch(0.15 0 0)' // dark text on light background
          : 'oklch(0.985 0 0)'; // light text on dark background
        root.style.setProperty('--primary-foreground', foreground);
      }
    }

    if (companyTheme.secondaryColor) {
      const secondaryOklch = hexToOklch(companyTheme.secondaryColor);
      if (secondaryOklch) {
        root.style.setProperty('--secondary', `oklch(${secondaryOklch})`);
        const foreground = isLightColor(companyTheme.secondaryColor)
          ? 'oklch(0.15 0 0)'
          : 'oklch(0.985 0 0)';
        root.style.setProperty('--secondary-foreground', foreground);
      }
    }

    if (companyTheme.accentColor) {
      const accentOklch = hexToOklch(companyTheme.accentColor);
      if (accentOklch) {
        root.style.setProperty('--accent', `oklch(${accentOklch})`);
        const foreground = isLightColor(companyTheme.accentColor)
          ? 'oklch(0.15 0 0)'
          : 'oklch(0.985 0 0)';
        root.style.setProperty('--accent-foreground', foreground);

        // Also apply to chart colors for consistency
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