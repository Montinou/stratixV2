import { AxeResults, ElementContext, Result, RunOptions } from 'axe-core';

interface AccessibilityTestConfig {
  includeTags?: string[];
  excludeTags?: string[];
  rules?: Record<string, any>;
  context?: ElementContext;
}

export class AccessibilityTester {
  private axe: any;

  constructor() {
    // Dynamic import to avoid SSR issues
    this.initializeAxe();
  }

  private async initializeAxe() {
    if (typeof window !== 'undefined') {
      const axeCore = await import('axe-core');
      this.axe = axeCore.default;

      // Configure axe for Spanish language
      this.axe.configure({
        locale: {
          lang: 'es',
          rules: {
            'color-contrast': {
              help: 'Los elementos deben tener suficiente contraste de color',
              description: 'Asegura que el contraste entre el texto y el fondo cumple con las pautas WCAG AA'
            },
            'keyboard': {
              help: 'Los elementos deben ser accesibles desde el teclado',
              description: 'Asegura que toda la funcionalidad esté disponible desde el teclado'
            },
            'focus-order-semantics': {
              help: 'Los elementos deben tener un orden de foco lógico',
              description: 'Asegura que el orden de tabulación sigue un patrón lógico'
            }
          }
        }
      });
    }
  }

  async runAccessibilityTest(
    element: string | Element = document.body,
    config: AccessibilityTestConfig = {}
  ): Promise<AxeResults> {
    await this.initializeAxe();

    if (!this.axe) {
      throw new Error('Axe-core no está disponible. Asegúrate de que estás ejecutando en el navegador.');
    }

    const options: RunOptions = {
      tags: config.includeTags || ['wcag2a', 'wcag2aa', 'wcag21aa'],
      rules: {
        // Enhanced rules for onboarding components
        'color-contrast': { enabled: true },
        'keyboard': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'aria-roles': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'button-name': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
        'skip-link': { enabled: true },
        ...config.rules
      }
    };

    if (config.excludeTags) {
      options.tags = options.tags?.filter(tag => !config.excludeTags!.includes(tag));
    }

    try {
      const results = await this.axe.run(element, options);
      return results;
    } catch (error) {
      console.error('Error running accessibility test:', error);
      throw error;
    }
  }

  async testOnboardingStep(stepElement: Element): Promise<{
    passed: boolean;
    violations: Result[];
    passes: Result[];
    summary: {
      totalViolations: number;
      criticalViolations: number;
      moderateViolations: number;
      minorViolations: number;
    };
  }> {
    const results = await this.runAccessibilityTest(stepElement, {
      includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      rules: {
        // Specific rules for form testing
        'color-contrast': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'label': { enabled: true },
        'aria-input-field-name': { enabled: true },
        'aria-required-attr': { enabled: true },
        'button-name': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'keyboard': { enabled: true }
      }
    });

    const criticalViolations = results.violations.filter(v => v.impact === 'critical').length;
    const moderateViolations = results.violations.filter(v => v.impact === 'moderate').length;
    const minorViolations = results.violations.filter(v => v.impact === 'minor').length;

    return {
      passed: results.violations.length === 0,
      violations: results.violations,
      passes: results.passes,
      summary: {
        totalViolations: results.violations.length,
        criticalViolations,
        moderateViolations,
        minorViolations
      }
    };
  }

  generateAccessibilityReport(results: AxeResults): string {
    let report = '# Reporte de Accesibilidad\n\n';

    report += `## Resumen\n`;
    report += `- ✅ Pruebas pasadas: ${results.passes.length}\n`;
    report += `- ❌ Violaciones encontradas: ${results.violations.length}\n`;
    report += `- ⚠️ Elementos incompletos: ${results.incomplete.length}\n`;
    report += `- ℹ️ No aplicable: ${results.inapplicable.length}\n\n`;

    if (results.violations.length > 0) {
      report += `## Violaciones de Accesibilidad\n\n`;

      results.violations.forEach((violation, index) => {
        report += `### ${index + 1}. ${violation.help}\n`;
        report += `**Impacto:** ${violation.impact}\n`;
        report += `**Descripción:** ${violation.description}\n`;
        report += `**Elementos afectados:** ${violation.nodes.length}\n`;
        report += `**Más información:** ${violation.helpUrl}\n\n`;

        violation.nodes.forEach((node, nodeIndex) => {
          report += `#### Elemento ${nodeIndex + 1}\n`;
          report += `**Selector:** \`${node.target.join(', ')}\`\n`;
          report += `**HTML:** \`${node.html}\`\n`;
          if (node.failureSummary) {
            report += `**Problema:** ${node.failureSummary}\n`;
          }
          report += '\n';
        });
      });
    }

    if (results.passes.length > 0) {
      report += `## Pruebas Exitosas\n\n`;
      results.passes.forEach((pass, index) => {
        report += `${index + 1}. ${pass.help} (${pass.nodes.length} elementos)\n`;
      });
    }

    return report;
  }

  async validateColorContrast(element: Element): Promise<{
    passed: boolean;
    issues: Array<{
      selector: string;
      foreground: string;
      background: string;
      ratio: number;
      level: string;
    }>;
  }> {
    const results = await this.runAccessibilityTest(element, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

    const issues = contrastViolations.flatMap(violation =>
      violation.nodes.map(node => ({
        selector: node.target.join(', '),
        foreground: node.any[0]?.data?.fgColor || 'unknown',
        background: node.any[0]?.data?.bgColor || 'unknown',
        ratio: node.any[0]?.data?.contrastRatio || 0,
        level: violation.impact || 'unknown'
      }))
    );

    return {
      passed: contrastViolations.length === 0,
      issues
    };
  }

  async testKeyboardNavigation(container: Element): Promise<{
    passed: boolean;
    focusableElements: number;
    issues: string[];
  }> {
    const focusableSelectors = [
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const focusableElements = container.querySelectorAll(focusableSelectors);
    const issues: string[] = [];

    // Check if all focusable elements have proper labels
    focusableElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();

      // Check for accessible name
      const accessibleName = (
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        (element as HTMLElement).textContent?.trim() ||
        (tagName === 'input' && (element as HTMLInputElement).placeholder)
      );

      if (!accessibleName) {
        issues.push(`Elemento ${index + 1} (${tagName}) no tiene un nombre accesible`);
      }

      // Check for proper focus indicators
      const computedStyle = window.getComputedStyle(element as Element);
      if (computedStyle.outline === 'none' &&
          !element.classList.contains('focus:ring') &&
          !element.classList.contains('focus-visible:ring')) {
        issues.push(`Elemento ${index + 1} (${tagName}) puede no tener indicadores de foco visibles`);
      }
    });

    return {
      passed: issues.length === 0,
      focusableElements: focusableElements.length,
      issues
    };
  }
}

// Singleton instance
export const accessibilityTester = new AccessibilityTester();

// Utility functions for common tests
export async function testOnboardingAccessibility(stepId: string) {
  const stepElement = document.getElementById(stepId);
  if (!stepElement) {
    throw new Error(`No se encontró el elemento con ID: ${stepId}`);
  }

  const [axeResults, contrastResults, keyboardResults] = await Promise.all([
    accessibilityTester.testOnboardingStep(stepElement),
    accessibilityTester.validateColorContrast(stepElement),
    accessibilityTester.testKeyboardNavigation(stepElement)
  ]);

  return {
    overall: {
      passed: axeResults.passed && contrastResults.passed && keyboardResults.passed,
      score: calculateAccessibilityScore(axeResults, contrastResults, keyboardResults)
    },
    axe: axeResults,
    contrast: contrastResults,
    keyboard: keyboardResults,
    report: accessibilityTester.generateAccessibilityReport(await accessibilityTester.runAccessibilityTest(stepElement))
  };
}

function calculateAccessibilityScore(
  axeResults: any,
  contrastResults: any,
  keyboardResults: any
): number {
  let score = 100;

  // Deduct points for violations
  score -= axeResults.summary.criticalViolations * 25;
  score -= axeResults.summary.moderateViolations * 10;
  score -= axeResults.summary.minorViolations * 5;

  // Deduct points for contrast issues
  score -= contrastResults.issues.length * 15;

  // Deduct points for keyboard issues
  score -= keyboardResults.issues.length * 10;

  return Math.max(0, score);
}

// Development helper for real-time testing
export function enableAccessibilityMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Accessibility monitoring enabled');

    // Monitor for DOM changes and run tests
    let timeout: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const results = await accessibilityTester.runAccessibilityTest();
          if (results.violations.length > 0) {
            console.warn('⚠️ Accessibility violations detected:', results.violations);
          }
        } catch (error) {
          console.error('Error running accessibility test:', error);
        }
      }, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'role']
    });

    return () => observer.disconnect();
  }
}