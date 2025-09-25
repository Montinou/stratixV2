'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AuthErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    // Log authentication-specific errors
    if (error.message.includes('onUserChange') || 
        error.message.includes('accessToken') ||
        error.message.includes('token store')) {
      console.error('Stack Auth integration error detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Error de Autenticación</CardTitle>
              </div>
              <CardDescription>
                Se ha producido un error con el sistema de autenticación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {this.state.error?.message.includes('onUserChange') && 
                    'Error de compatibilidad del sistema de autenticación. Por favor, recarga la página.'
                  }
                  {this.state.error?.message.includes('accessToken') && 
                    'Error de token de acceso. Por favor, inicia sesión nuevamente.'
                  }
                  {this.state.error?.message.includes('token store') && 
                    'Error de almacenamiento de sesión. Por favor, recarga la página.'
                  }
                  {!this.state.error?.message.includes('onUserChange') &&
                   !this.state.error?.message.includes('accessToken') &&
                   !this.state.error?.message.includes('token store') &&
                    'Error inesperado en el sistema de autenticación.'
                  }
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={this.resetError}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Intentar Nuevamente
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Recargar Página
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded-md">
                  <summary className="cursor-pointer font-medium text-sm">
                    Detalles Técnicos (Desarrollo)
                  </summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier use
export function AuthErrorBoundaryWrapper({ 
  children, 
  fallback 
}: AuthErrorBoundaryProps) {
  return (
    <AuthErrorBoundary fallback={fallback}>
      {children}
    </AuthErrorBoundary>
  )
}

// Specific error component for Stack Auth issues
export function StackAuthErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error
  resetError: () => void 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Problema de Configuración de Autenticación</CardTitle>
          </div>
          <CardDescription>
            El sistema de autenticación Stack Auth necesita configuración adicional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esto puede ocurrir durante el despliegue o cuando las variables de entorno 
              no están configuradas correctamente. La aplicación funcionará normalmente 
              una vez que se complete la configuración.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar Conexión
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Ir al Inicio
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Para desarrolladores:</strong> Verifica que las variables de entorno 
                NEXT_PUBLIC_STACK_PROJECT_ID y NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY 
                estén configuradas correctamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}