// Color contrast validation utilities for WCAG compliance

interface ColorContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  level: 'AA' | 'AAA' | 'fail';
  recommendation?: string;
}

interface ColorAnalysis {
  hex: string;
  rgb: [number, number, number];
  luminance: number;
  isLight: boolean;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

/**
 * Convert RGB to relative luminance
 * Formula from WCAG 2.1 specifications
 */
function getLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(value => {
    const sRGB = value / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
function evaluateContrast(ratio: number, isLargeText = false): ColorContrastResult {
  const normalTextAA = 4.5;
  const normalTextAAA = 7;
  const largeTextAA = 3;
  const largeTextAAA = 4.5;

  const aaThreshold = isLargeText ? largeTextAA : normalTextAA;
  const aaaThreshold = isLargeText ? largeTextAAA : normalTextAAA;

  const passesAA = ratio >= aaThreshold;
  const passesAAA = ratio >= aaaThreshold;

  let level: 'AA' | 'AAA' | 'fail';
  let recommendation: string | undefined;

  if (passesAAA) {
    level = 'AAA';
  } else if (passesAA) {
    level = 'AA';
  } else {
    level = 'fail';
    const needed = aaThreshold;
    const deficit = needed - ratio;
    recommendation = `Necesita una mejora de contraste de ${deficit.toFixed(2)} para cumplir con AA. Ratio actual: ${ratio.toFixed(2)}, requerido: ${needed}`;
  }

  return {
    ratio,
    passesAA,
    passesAAA,
    level,
    recommendation
  };
}

/**
 * Extract computed color from CSS property
 */
function getComputedColor(element: Element, property: 'color' | 'background-color'): string {
  const style = window.getComputedStyle(element);
  const color = style.getPropertyValue(property);

  // Handle rgb/rgba format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  return color;
}

/**
 * Find actual background color by traversing up the DOM
 */
function findActualBackgroundColor(element: Element): string {
  let current: Element | null = element;

  while (current && current !== document.body) {
    const bgColor = getComputedColor(current, 'background-color');

    // Check if background color is not transparent
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      return bgColor;
    }

    current = current.parentElement;
  }

  // Default to white background
  return '#ffffff';
}

/**
 * Analyze color properties
 */
function analyzeColor(hex: string): ColorAnalysis {
  const rgb = hexToRgb(hex);
  const luminance = getLuminance(rgb);
  const isLight = luminance > 0.5;

  return {
    hex,
    rgb,
    luminance,
    isLight
  };
}

/**
 * Main contrast validation function
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  isLargeText = false
): ColorContrastResult {
  try {
    const fgRgb = hexToRgb(foreground);
    const bgRgb = hexToRgb(background);
    const ratio = getContrastRatio(fgRgb, bgRgb);

    return evaluateContrast(ratio, isLargeText);
  } catch (error) {
    return {
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      level: 'fail',
      recommendation: `Error analyzing colors: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate contrast for a DOM element
 */
export function validateElementContrast(element: Element): ColorContrastResult & {
  foreground: string;
  background: string;
  element: string;
} {
  const foreground = getComputedColor(element, 'color');
  const background = findActualBackgroundColor(element);

  // Check if it's large text (18pt+ or 14pt+ bold)
  const style = window.getComputedStyle(element);
  const fontSize = parseFloat(style.fontSize);
  const fontWeight = style.fontWeight;
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));

  const result = validateColorContrast(foreground, background, isLargeText);

  return {
    ...result,
    foreground,
    background,
    element: element.tagName.toLowerCase()
  };
}

/**
 * Generate color suggestions for better contrast
 */
export function suggestBetterColors(
  foreground: string,
  background: string,
  targetLevel: 'AA' | 'AAA' = 'AA'
): {
  suggestedForeground?: string;
  suggestedBackground?: string;
  alternatives: Array<{
    foreground: string;
    background: string;
    ratio: number;
    description: string;
  }>;
} {
  const fgAnalysis = analyzeColor(foreground);
  const bgAnalysis = analyzeColor(background);

  const targetRatio = targetLevel === 'AAA' ? 7 : 4.5;
  const suggestions: Array<{
    foreground: string;
    background: string;
    ratio: number;
    description: string;
  }> = [];

  // Try darkening/lightening foreground
  for (let adjustment = 0.1; adjustment <= 0.9; adjustment += 0.1) {
    const newFg = fgAnalysis.isLight
      ? darkenColor(foreground, adjustment)
      : lightenColor(foreground, adjustment);

    const ratio = getContrastRatio(hexToRgb(newFg), bgAnalysis.rgb);
    if (ratio >= targetRatio) {
      suggestions.push({
        foreground: newFg,
        background,
        ratio,
        description: `${fgAnalysis.isLight ? 'Oscurecer' : 'Aclarar'} texto ${Math.round(adjustment * 100)}%`
      });
      break;
    }
  }

  // Try adjusting background
  for (let adjustment = 0.1; adjustment <= 0.9; adjustment += 0.1) {
    const newBg = bgAnalysis.isLight
      ? darkenColor(background, adjustment)
      : lightenColor(background, adjustment);

    const ratio = getContrastRatio(fgAnalysis.rgb, hexToRgb(newBg));
    if (ratio >= targetRatio) {
      suggestions.push({
        foreground,
        background: newBg,
        ratio,
        description: `${bgAnalysis.isLight ? 'Oscurecer' : 'Aclarar'} fondo ${Math.round(adjustment * 100)}%`
      });
      break;
    }
  }

  return {
    suggestedForeground: suggestions.find(s => s.foreground !== foreground)?.foreground,
    suggestedBackground: suggestions.find(s => s.background !== background)?.background,
    alternatives: suggestions.slice(0, 3)
  };
}

/**
 * Lighten a hex color
 */
function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const newRgb = rgb.map(value => Math.min(255, Math.round(value + (255 - value) * amount))) as [number, number, number];
  return `#${newRgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Darken a hex color
 */
function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const newRgb = rgb.map(value => Math.max(0, Math.round(value * (1 - amount)))) as [number, number, number];
  return `#${newRgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Validate all text elements in a container for color contrast
 */
export function validatePageContrast(container: Element = document.body): Array<{
  element: Element;
  selector: string;
  result: ColorContrastResult & {
    foreground: string;
    background: string;
    element: string;
  };
}> {
  const textElements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label, input, textarea');
  const results: Array<{
    element: Element;
    selector: string;
    result: ColorContrastResult & {
      foreground: string;
      background: string;
      element: string;
    };
  }> = [];

  textElements.forEach((element, index) => {
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }

    // Skip elements without text content
    const text = element.textContent?.trim();
    if (!text) {
      return;
    }

    try {
      const result = validateElementContrast(element);

      // Only report failures and near-failures
      if (!result.passesAA) {
        results.push({
          element,
          selector: generateSelector(element),
          result
        });
      }
    } catch (error) {
      console.warn('Error validating contrast for element:', element, error);
    }
  });

  return results;
}

/**
 * Generate a unique selector for an element
 */
function generateSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    if (current.className) {
      const classes = current.className.toString().trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    // Add nth-child if needed for uniqueness
    const siblings = Array.from(current.parentElement?.children || [])
      .filter(sibling => sibling.tagName === current!.tagName);

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

// Theme-specific contrast validation
export const themeContrast = {
  light: {
    primary: '#0f172a',      // Very dark blue
    primaryForeground: '#f8fafc', // Very light
    secondary: '#f1f5f9',    // Light gray
    secondaryForeground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    background: '#ffffff',
    foreground: '#0f172a',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#3b82f6'
  },
  dark: {
    primary: '#f8fafc',      // Very light
    primaryForeground: '#0f172a', // Very dark blue
    secondary: '#1e293b',    // Dark gray
    secondaryForeground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    background: '#020617',
    foreground: '#f8fafc',
    border: '#1e293b',
    input: '#1e293b',
    ring: '#3b82f6'
  }
};

/**
 * Validate theme color combinations
 */
export function validateThemeContrast(theme: 'light' | 'dark' = 'light'): {
  passed: boolean;
  results: Array<{
    name: string;
    foreground: string;
    background: string;
    result: ColorContrastResult;
  }>;
} {
  const colors = themeContrast[theme];
  const combinations = [
    { name: 'Primary text', foreground: colors.primary, background: colors.background },
    { name: 'Primary button', foreground: colors.primaryForeground, background: colors.primary },
    { name: 'Secondary text', foreground: colors.secondaryForeground, background: colors.secondary },
    { name: 'Muted text', foreground: colors.mutedForeground, background: colors.background },
    { name: 'Border contrast', foreground: colors.foreground, background: colors.border },
  ];

  const results = combinations.map(combo => ({
    ...combo,
    result: validateColorContrast(combo.foreground, combo.background)
  }));

  const passed = results.every(r => r.result.passesAA);

  return { passed, results };
}