'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Eye, Keyboard, Palette, Play, Download } from 'lucide-react';
import { accessibilityTester, testOnboardingAccessibility } from '@/lib/utils/accessibility-testing';
import { cn } from '@/lib/utils';

interface AccessibilityTestPanelProps {
  stepId: string;
  enabled?: boolean;
  className?: string;
}

interface TestResults {
  overall: {
    passed: boolean;
    score: number;
  };
  axe: any;
  contrast: any;
  keyboard: any;
  report: string;
}

export function AccessibilityTestPanel({
  stepId,
  enabled = process.env.NODE_ENV === 'development',
  className
}: AccessibilityTestPanelProps) {
  const [results, setResults] = useState<TestResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-run tests when component mounts or stepId changes
  useEffect(() => {
    if (enabled) {
      runTests();
    }
  }, [stepId, enabled]);

  const runTests = async () => {
    if (!enabled) return;

    setIsRunning(true);
    try {
      const testResults = await testOnboardingAccessibility(stepId);
      setResults(testResults);
    } catch (error) {
      console.error('Error running accessibility tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!results) return;

    const blob = new Blob([results.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${stepId}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!enabled) {
    return null;
  }

  return (
    <Card className={cn("accessibility-test-panel", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Pruebas de Accesibilidad</CardTitle>
            {results && (
              <Badge
                variant={results.overall.passed ? "default" : "destructive"}
                className="ml-2"
              >
                {results.overall.score}/100
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={runTests}
              disabled={isRunning}
            >
              <Play className="w-4 h-4 mr-1" />
              {isRunning ? 'Probando...' : 'Probar'}
            </Button>
            {results && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Contraer' : 'Expandir'}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Validación WCAG 2.1 AA para el paso actual del onboarding
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Score */}
        {results && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Puntuación de Accesibilidad</span>
              <span className="font-medium">{results.overall.score}/100</span>
            </div>
            <Progress
              value={results.overall.score}
              className="h-2"
            />
          </div>
        )}

        {/* Quick Status */}
        {results && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* Axe Core Results */}
            <div className="flex items-center gap-2">
              {results.axe.passed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>WCAG</span>
              <Badge variant="outline" className="text-xs">
                {results.axe.summary.totalViolations}
              </Badge>
            </div>

            {/* Color Contrast */}
            <div className="flex items-center gap-2">
              {results.contrast.passed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <Palette className="w-4 h-4" />
              <span>Contraste</span>
              <Badge variant="outline" className="text-xs">
                {results.contrast.issues.length}
              </Badge>
            </div>

            {/* Keyboard Navigation */}
            <div className="flex items-center gap-2">
              {results.keyboard.passed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <Keyboard className="w-4 h-4" />
              <span>Teclado</span>
              <Badge variant="outline" className="text-xs">
                {results.keyboard.issues.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {results && isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* WCAG Violations */}
            {results.axe.violations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-destructive">
                  Violaciones WCAG ({results.axe.violations.length})
                </h4>
                <div className="space-y-2">
                  {results.axe.violations.slice(0, 3).map((violation: any, index: number) => (
                    <div key={index} className="text-xs p-2 bg-destructive/5 rounded border border-destructive/20">
                      <div className="font-medium">{violation.help}</div>
                      <div className="text-muted-foreground mt-1">
                        {violation.nodes.length} elemento(s) afectado(s)
                      </div>
                    </div>
                  ))}
                  {results.axe.violations.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      Y {results.axe.violations.length - 3} violación(es) más...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Color Contrast Issues */}
            {results.contrast.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-orange-600">
                  Problemas de Contraste ({results.contrast.issues.length})
                </h4>
                <div className="space-y-2">
                  {results.contrast.issues.slice(0, 2).map((issue: any, index: number) => (
                    <div key={index} className="text-xs p-2 bg-orange-50 rounded border border-orange-200">
                      <div className="font-medium">Ratio: {issue.ratio.toFixed(2)}</div>
                      <div className="text-muted-foreground">{issue.selector}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard Issues */}
            {results.keyboard.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-blue-600">
                  Problemas de Teclado ({results.keyboard.issues.length})
                </h4>
                <div className="space-y-1">
                  {results.keyboard.issues.slice(0, 3).map((issue: string, index: number) => (
                    <div key={index} className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download Report */}
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadReport}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Reporte Completo
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isRunning && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Ejecutando pruebas de accesibilidad...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for integrating accessibility testing into development workflow
export function useAccessibilityTesting(stepId: string, enabled = process.env.NODE_ENV === 'development') {
  const [results, setResults] = useState<TestResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    if (!enabled) return;

    setIsRunning(true);
    try {
      const testResults = await testOnboardingAccessibility(stepId);
      setResults(testResults);

      // Log violations to console for development
      if (testResults.axe.violations.length > 0) {
        console.group('🚨 Accessibility Violations Detected');
        testResults.axe.violations.forEach((violation: any) => {
          console.warn(`${violation.impact}: ${violation.help}`, violation.nodes);
        });
        console.groupEnd();
      }

      return testResults;
    } catch (error) {
      console.error('Error running accessibility tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return {
    results,
    isRunning,
    runTests
  };
}