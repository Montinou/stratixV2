'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when props change (if enabled)
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  generateErrorId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    // We can't use hooks in class components, so we'll need to handle this differently
    window.location.href = '/dashboard';
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      // If custom fallback provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Oops! Algo salió mal</CardTitle>
              <CardDescription>
                Se produjo un error inesperado en esta parte del formulario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Error:</strong> {error?.message || 'Error desconocido'}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de nuevo
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir al Dashboard
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="mt-4 p-3 bg-muted rounded-md text-xs">
                  <summary className="cursor-pointer font-medium text-sm mb-2">
                    Detalles técnicos (solo en desarrollo)
                  </summary>
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {error?.stack}
                    {'\n\nComponent Stack:'}
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Hook-based wrapper for easier usage in functional components
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

export function ErrorBoundaryWrapper({
  children,
  fallback,
  onError,
  resetKeys
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      resetOnPropsChange={true}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}

// Specialized error boundary for form steps
interface FormStepErrorBoundaryProps {
  children: ReactNode;
  stepName: string;
  onRetry?: () => void;
}

export function FormStepErrorBoundary({
  children,
  stepName,
  onRetry
}: FormStepErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log specific step error
    console.error(`Error in form step ${stepName}:`, error, errorInfo);

    // Could send to error tracking service here
    // trackError(`onboarding_step_${stepName}`, error, errorInfo);
  };

  const customFallback = (
    <div className="p-6 text-center">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Error en el Paso: {stepName}</CardTitle>
          <CardDescription>
            Ocurrió un problema al cargar este paso del formulario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onRetry}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={customFallback}
      onError={handleError}
      resetOnPropsChange={true}
      resetKeys={[stepName]}
    >
      {children}
    </ErrorBoundary>
  );
}