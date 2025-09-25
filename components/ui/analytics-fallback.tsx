"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  RefreshCw, 
  AlertCircle,
  Wifi,
  Database
} from "lucide-react"

interface AnalyticsFallbackProps {
  onRetry?: () => void
  loading?: boolean
  error?: Error | null
  type?: 'network' | 'server' | 'data' | 'generic'
}

export function AnalyticsFallback({ 
  onRetry, 
  loading = false, 
  error,
  type = 'generic' 
}: AnalyticsFallbackProps) {
  const getErrorContent = () => {
    switch (type) {
      case 'network':
        return {
          icon: <Wifi className="h-8 w-8 text-muted-foreground" />,
          title: "Problema de Conexión",
          description: "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
        }
      case 'server':
        return {
          icon: <Database className="h-8 w-8 text-muted-foreground" />,
          title: "Error del Servidor",
          description: "El servidor está experimentando problemas. Intenta nuevamente en unos minutos.",
        }
      case 'data':
        return {
          icon: <BarChart3 className="h-8 w-8 text-muted-foreground" />,
          title: "Sin Datos Disponibles",
          description: "No hay suficientes datos para generar insights. Completa algunos objetivos primero.",
        }
      default:
        return {
          icon: <AlertCircle className="h-8 w-8 text-muted-foreground" />,
          title: "Error Inesperado",
          description: "Ha ocurrido un error. Por favor, inténtalo de nuevo.",
        }
    }
  }

  const errorContent = getErrorContent()

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Los datos analíticos no están disponibles en este momento.</span>
            {onRetry && (
              <Button 
                onClick={onRetry}
                disabled={loading}
                variant="outline" 
                size="sm"
                className="ml-4"
              >
                <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Reintentar
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Fallback Content */}
      <Card>
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 flex items-center justify-center">
            {errorContent.icon}
          </div>
          <CardTitle className="text-xl">{errorContent.title}</CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            {errorContent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                Detalles del error (desarrollo)
              </summary>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {error.message}
                {error.stack && `\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Static Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Objetivos Totales
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">
              Datos no disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Progreso Promedio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--%</div>
            <p className="text-xs text-muted-foreground">
              Datos no disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Progreso
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">
              Datos no disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h4 className="font-semibold mb-2">¿Qué puedes hacer mientras tanto?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-muted rounded-lg">
                <h5 className="font-medium text-sm mb-1">Revisa tus objetivos</h5>
                <p className="text-xs text-muted-foreground">
                  Actualiza el progreso de tus OKRs actuales
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h5 className="font-medium text-sm mb-1">Planifica actividades</h5>
                <p className="text-xs text-muted-foreground">
                  Crea nuevas actividades para alcanzar tus metas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsFallback