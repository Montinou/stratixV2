"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InsightsCard } from "@/components/ai/insights-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAnalytics } from "@/lib/hooks/use-analytics"
import { generateDailyInsights, generateTeamInsights } from "@/lib/ai/insights"
import type { Objective, Initiative, Activity } from "@/lib/types/okr"
import { useState, useEffect, useCallback } from "react"
import { Lightbulb, Sparkles, TrendingUp, Users, RefreshCw, Calendar, AlertCircle } from "lucide-react"
import AnalyticsErrorBoundary from "@/components/ui/analytics-error-boundary"
import InsightsLoadingSkeleton from "@/components/ui/insights-loading-skeleton"
import AnalyticsFallback from "@/components/ui/analytics-fallback"

export default function InsightsPage() {
  const { profile } = useAuth()
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [timeRange, setTimeRange] = useState("week")
  const [apiError, setApiError] = useState<Error | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Use the analytics hook with comprehensive error handling
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
    retry: retryAnalytics,
    retryCount
  } = useAnalytics({
    autoFetch: true,
    retryAttempts: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Analytics error:', error)
      setApiError(error)
    },
    onSuccess: () => {
      setApiError(null)
    }
  })

  const [insights, setInsights] = useState({
    daily: "",
    team: "",
    lastGenerated: null as Date | null,
  })

  // Handle retry with key increment to trigger re-fetch
  const handleRetryAnalytics = useCallback(async () => {
    setRetryKey(prev => prev + 1)
    setApiError(null)
    await retryAnalytics()
  }, [retryAnalytics])

  const generateInsights = useCallback(async () => {
    if (!profile || !analyticsData) return

    setGeneratingInsights(true)

    try {
      // Generate daily insights based on analytics data
      const dailyInsights = await generateDailyInsights({
        role: profile.role,
        objectives: analyticsData.objectives,
        initiatives: analyticsData.initiatives,
        activities: analyticsData.activities,
        department: profile.department || undefined,
      })

      let teamInsights = ""
      if (profile.role !== "empleado") {
        // Generate team insights for managers and corporate users
        teamInsights = await generateTeamInsights({
          objectives: analyticsData.objectives,
          department: profile.department || "Organización",
          teamSize: 5, // This would come from actual team data
        })
      }

      setInsights({
        daily: dailyInsights,
        team: teamInsights,
        lastGenerated: new Date(),
      })
    } catch (error) {
      console.error("Error generating insights:", error)
      // Show user-friendly error message
      setInsights({
        daily: "Error al generar insights. Por favor, intenta nuevamente.",
        team: "Error al generar análisis de equipo. Por favor, intenta nuevamente.",
        lastGenerated: new Date(),
      })
    } finally {
      setGeneratingInsights(false)
    }
  }, [profile, analyticsData])

  useEffect(() => {
    if (analyticsData && analyticsData.objectives && analyticsData.objectives.length > 0 && !insights.daily) {
      generateInsights()
    }
  }, [analyticsData, insights.daily, generateInsights])

  const formatLastGenerated = (date: Date | null) => {
    if (!date) return "Nunca"
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Show loading skeleton while analytics data is loading
  if (analyticsLoading && !analyticsData) {
    return (
      <DashboardLayout>
        <InsightsLoadingSkeleton />
      </DashboardLayout>
    )
  }

  // Show fallback UI if there's an error or no data
  if ((analyticsError && !analyticsData) || apiError) {
    const errorType = analyticsError?.message.includes('fetch') ? 'network' :
                     analyticsError?.message.includes('500') ? 'server' :
                     analyticsError?.message.includes('404') ? 'data' : 'generic'
    
    return (
      <DashboardLayout>
        <AnalyticsFallback 
          onRetry={handleRetryAnalytics}
          loading={analyticsLoading}
          error={analyticsError || apiError}
          type={errorType}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <AnalyticsErrorBoundary onRetry={handleRetryAnalytics}>
        <div className="p-6 space-y-6">
          {/* Loading indicator for ongoing operations */}
          {analyticsLoading && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Actualizando datos analíticos...
                {retryCount > 0 && (
                  <span className="text-xs">(Intento {retryCount + 1})</span>
                )}
              </div>
            </div>
          )}
          
          {/* Error indicator for ongoing operations */}
          {apiError && analyticsData && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>Error al actualizar datos: {apiError.message}</span>
                <Button 
                  onClick={handleRetryAnalytics}
                  variant="outline" 
                  size="sm"
                  disabled={analyticsLoading}
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${analyticsLoading ? "animate-spin" : ""}`} />
                  Reintentar
                </Button>
              </div>
            </div>
          )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              IA Insights
            </h1>
            <p className="text-muted-foreground">Análisis inteligente y recomendaciones personalizadas para tus OKRs</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={generateInsights} 
              disabled={generatingInsights || analyticsLoading || !analyticsData}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generatingInsights ? "animate-spin" : ""}`} />
              Actualizar Insights
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Estado de Insights
            </CardTitle>
            <CardDescription>Información sobre la última generación de insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analyticsData?.analytics?.totalObjectives ?? '--'}
                </div>
                <p className="text-sm text-muted-foreground">Objetivos analizados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {profile?.role === "corporativo" ? "Todos" : profile?.role === "gerente" ? "Equipo" : "Personal"}
                </div>
                <p className="text-sm text-muted-foreground">Alcance del análisis</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatLastGenerated(insights.lastGenerated)}</div>
                <p className="text-sm text-muted-foreground">Última actualización</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InsightsCard
            title="Insights Diarios"
            insights={insights.daily || "Generando insights personalizados basados en tu progreso actual..."}
            type="daily"
            onRefresh={generateInsights}
            loading={generatingInsights && !insights.daily}
            analyticsData={analyticsData?.analytics}
          />

          {profile?.role !== "empleado" && (
            <InsightsCard
              title="Análisis de Equipo"
              insights={insights.team || "Analizando el rendimiento del equipo y generando recomendaciones..."}
              type="team"
              onRefresh={generateInsights}
              loading={generatingInsights && !insights.team}
              analyticsData={analyticsData?.analytics}
            />
          )}

          {profile?.role === "empleado" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomendaciones Personales
                </CardTitle>
                <CardDescription>Sugerencias específicas para mejorar tu rendimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-primary mb-2">Enfoque Semanal</h4>
                    <p className="text-sm text-muted-foreground">
                      Concéntrate en completar las actividades con mayor impacto en tus objetivos principales.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Mejora Continua</h4>
                    <p className="text-sm text-muted-foreground">
                      Considera actualizar el progreso de tus objetivos más frecuentemente para obtener insights más
                      precisos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Acciones Recomendadas
            </CardTitle>
            <CardDescription>
              Basado en el análisis de IA, estas son las acciones que podrían mejorar tu rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dynamic action based on completion rate */}
              {analyticsData?.analytics?.completionRate && analyticsData.analytics.completionRate < 70 && (
                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h4 className="font-medium">Acelerar Progreso</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tu tasa de finalización es del {analyticsData.analytics.completionRate}%. Prioriza objetivos críticos.
                  </p>
                </div>
              )}

              {/* Dynamic action based on on-track percentage */}
              {analyticsData?.analytics?.onTrackPercentage && analyticsData.analytics.onTrackPercentage < 60 && (
                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <RefreshCw className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h4 className="font-medium">Revisar Objetivos</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Solo {analyticsData.analytics.onTrackPercentage}% de tus objetivos van bien. Evalúa y ajusta.
                  </p>
                </div>
              )}

              {/* Default action for progress updates */}
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-medium">Actualizar Progreso</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.analytics?.averageProgress ? 
                    `Tu progreso promedio es ${analyticsData.analytics.averageProgress}%. Mantén los datos actualizados.` :
                    "Actualiza el progreso de tus objetivos para obtener insights más precisos."
                  }
                </p>
              </div>

              {/* Team collaboration for non-employee roles */}
              {profile?.role !== "empleado" && (
                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-medium">Gestionar Equipo</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analyticsData?.analytics?.totalObjectives ? 
                      `Supervisando ${analyticsData.analytics.totalObjectives} objetivos. Coordina con tu equipo.` :
                      "Conecta con tu equipo para alinear objetivos y compartir mejores prácticas."
                    }
                  </p>
                </div>
              )}

              {/* Optimization action */}
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-medium">Optimizar</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.analytics?.statusDistribution ? 
                    "Analiza los objetivos en pausa o retrasados para reenfocar esfuerzos." :
                    "Identifica actividades de bajo impacto y reenfoca tus esfuerzos."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </AnalyticsErrorBoundary>
    </DashboardLayout>
  )
}
