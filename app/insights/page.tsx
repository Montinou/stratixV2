"use client"

export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InsightsCard } from "@/components/ai/insights-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAnalytics } from "@/lib/hooks/use-analytics"
import { generateDailyInsights, generateTeamInsights } from "@/lib/ai/insights"
import type { Objective, Initiative, Activity } from "@/lib/types/okr"
import { useState, useEffect, useCallback } from "react"
import { Lightbulb, Sparkles, TrendingUp, Users, RefreshCw, Calendar, AlertCircle, WifiOff } from "lucide-react"
import AnalyticsErrorBoundary from "@/components/ui/analytics-error-boundary"
import InsightsLoadingSkeleton from "@/components/ui/insights-loading-skeleton"

export default function InsightsPage() {
  const { profile } = useAuth()
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [timeRange, setTimeRange] = useState("week")
  const [apiError, setApiError] = useState<Error | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Use analytics hook with comprehensive error handling and retry logic
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
    timeRange,
    onError: (error) => {
      console.error('Analytics error:', error)
      setApiError(error)
    },
    onSuccess: () => {
      setApiError(null)
    }
  })

  // Mock data for insights generation (in real implementation, this would come from API)
  const [mockData, setMockData] = useState<{
    objectives: Objective[]
    initiatives: Initiative[]
    activities: Activity[]
  }>({
    objectives: [],
    initiatives: [],
    activities: [],
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

  // Generate mock data based on analytics for insights generation
  const generateMockDataFromAnalytics = useCallback(() => {
    if (!analyticsData?.analytics) return
    
    const analytics = analyticsData.analytics
    const mockObjectives: Objective[] = []
    const mockInitiatives: Initiative[] = []
    const mockActivities: Activity[] = []
    
    // Create mock objectives based on analytics data
    for (let i = 0; i < (analytics.totalObjectives || 0); i++) {
      mockObjectives.push({
        id: `obj-${i}`,
        title: `Objetivo ${i + 1}`,
        description: `Descripción del objetivo ${i + 1}`,
        progress: Math.floor(Math.random() * 100),
        status: ['draft', 'active', 'completed', 'on_hold'][Math.floor(Math.random() * 4)] as any,
        department: profile?.department || 'General',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Objective)
    }
    
    // Create mock initiatives
    for (let i = 0; i < (analytics.totalInitiatives || 0); i++) {
      mockInitiatives.push({
        id: `init-${i}`,
        title: `Iniciativa ${i + 1}`,
        status: ['active', 'completed', 'pending'][Math.floor(Math.random() * 3)] as any,
        created_at: new Date().toISOString()
      } as Initiative)
    }
    
    // Create mock activities
    for (let i = 0; i < (analytics.totalActivities || 0); i++) {
      mockActivities.push({
        id: `act-${i}`,
        title: `Actividad ${i + 1}`,
        status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)] as any,
        created_at: new Date().toISOString()
      } as Activity)
    }
    
    setMockData({
      objectives: mockObjectives,
      initiatives: mockInitiatives,
      activities: mockActivities
    })
  }, [analyticsData, profile?.department])

  const generateInsights = useCallback(async () => {
    if (!profile || mockData.objectives.length === 0) return

    setGeneratingInsights(true)

    try {
      // Generate daily insights based on mock data derived from analytics
      const dailyInsights = await generateDailyInsights({
        role: profile.role,
        objectives: mockData.objectives,
        initiatives: mockData.initiatives,
        activities: mockData.activities,
        department: profile.department || undefined,
      })

      let teamInsights = ""
      if (profile.role !== "empleado") {
        // Generate team insights for managers and corporate users
        teamInsights = await generateTeamInsights({
          objectives: mockData.objectives,
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
        daily: "Error al generar insights. Los datos analíticos pueden estar temporalmente no disponibles.",
        team: "Error al generar análisis de equipo. Por favor, intenta nuevamente más tarde.",
        lastGenerated: new Date(),
      })
    } finally {
      setGeneratingInsights(false)
    }
  }, [profile, mockData])

  // Generate mock data when analytics data is available
  useEffect(() => {
    if (analyticsData?.analytics) {
      generateMockDataFromAnalytics()
    }
  }, [analyticsData, generateMockDataFromAnalytics])

  // Generate insights when mock data is ready
  useEffect(() => {
    if (mockData.objectives.length > 0 && !insights.daily) {
      generateInsights()
    }
  }, [mockData, insights.daily, generateInsights])

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

  // Show error state if there's a critical error and no data
  if ((analyticsError && !analyticsData) || apiError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong>Error al cargar los datos analíticos</strong>
                </div>
                <p className="text-sm">
                  {analyticsError?.message || apiError?.message || 'Error desconocido al cargar los datos'}
                </p>
                {retryCount > 0 && (
                  <p className="text-xs opacity-75">
                    Reintentando automáticamente... (Intento {retryCount + 1})
                  </p>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleRetryAnalytics}
                    disabled={analyticsLoading}
                    variant="outline" 
                    size="sm"
                  >
                    <RefreshCw className={`mr-2 h-3 w-3 ${analyticsLoading ? "animate-spin" : ""}`} />
                    Reintentar
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Fallback content */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">--</div>
                <p className="text-xs text-muted-foreground">Datos no disponibles</p>
              </CardContent>
            </Card>
            <Card className="opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progreso</CardTitle>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">--%</div>
                <p className="text-xs text-muted-foreground">Datos no disponibles</p>
              </CardContent>
            </Card>
            <Card className="opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completados</CardTitle>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">--%</div>
                <p className="text-xs text-muted-foreground">Datos no disponibles</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <AnalyticsErrorBoundary onRetry={handleRetryAnalytics}>
        <div className="p-6 space-y-6">
          {/* Loading indicator for ongoing operations */}
          {analyticsLoading && analyticsData && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span>Actualizando datos analíticos...</span>
                  {retryCount > 0 && (
                    <span className="text-xs opacity-75">(Intento {retryCount + 1})</span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error indicator for partial failures */}
          {(analyticsError || apiError) && analyticsData && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Algunos datos pueden estar desactualizados: {analyticsError?.message || apiError?.message}</span>
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
              </AlertDescription>
            </Alert>
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
                  {analyticsLoading && !analyticsData ? (
                    <div className="animate-pulse bg-muted h-8 w-12 mx-auto rounded"></div>
                  ) : (
                    analyticsData?.analytics?.totalObjectives ?? '--'
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Objetivos analizados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analyticsLoading && !analyticsData ? (
                    <div className="animate-pulse bg-muted h-8 w-16 mx-auto rounded"></div>
                  ) : (
                    `${analyticsData?.analytics?.averageProgress ?? '--'}%`
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Progreso promedio</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatLastGenerated(insights.lastGenerated)}
                </div>
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
                  {analyticsData?.analytics && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-accent/20 rounded-lg">
                        <div className="text-lg font-semibold text-primary">
                          {analyticsData.analytics.averageProgress ?? '--'}%
                        </div>
                        <p className="text-xs text-muted-foreground">Tu progreso</p>
                      </div>
                      <div className="text-center p-3 bg-accent/20 rounded-lg">
                        <div className="text-lg font-semibold text-primary">
                          {analyticsData.analytics.totalObjectives ?? '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">Objetivos activos</p>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-primary mb-2">Enfoque Semanal</h4>
                    <p className="text-sm text-muted-foreground">
                      {analyticsData?.analytics?.averageProgress && analyticsData.analytics.averageProgress < 50 ?
                        "Prioriza completar actividades pendientes para acelerar tu progreso hacia los objetivos." :
                        "Concéntrate en completar las actividades con mayor impacto en tus objetivos principales."
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Mejora Continua</h4>
                    <p className="text-sm text-muted-foreground">
                      {analyticsData?.analytics?.totalObjectives && analyticsData.analytics.totalObjectives > 5 ?
                        "Considera priorizar tus objetivos más importantes para mantener el enfoque y mejorar los resultados." :
                        "Considera actualizar el progreso de tus objetivos más frecuentemente para obtener insights más precisos."
                      }
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
              Basado en el análisis de IA y datos analíticos, estas son las acciones que podrían mejorar tu rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dynamic action based on progress */}
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    analyticsData?.analytics?.averageProgress && analyticsData.analytics.averageProgress < 50 
                      ? 'bg-red-100 dark:bg-red-900/20' 
                      : 'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    <TrendingUp className={`h-4 w-4 ${
                      analyticsData?.analytics?.averageProgress && analyticsData.analytics.averageProgress < 50 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`} />
                  </div>
                  <h4 className="font-medium">
                    {analyticsData?.analytics?.averageProgress && analyticsData.analytics.averageProgress < 50 
                      ? 'Acelerar Progreso' 
                      : 'Mantener Ritmo'
                    }
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.analytics?.averageProgress && analyticsData.analytics.averageProgress < 50 
                    ? `Con ${analyticsData.analytics.averageProgress}% de progreso promedio, prioriza actividades de alto impacto.`
                    : 'Excelente progreso. Actualiza regularmente para mantener la visibilidad.'
                  }
                </p>
              </div>

              {/* Dynamic collaboration action */}
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-medium">
                    {profile?.role === 'empleado' ? 'Colaborar' : 'Gestionar Equipo'}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile?.role === 'empleado' 
                    ? `Conecta con tu equipo para alinear ${analyticsData?.analytics?.totalObjectives || ''} objetivos y compartir mejores prácticas.`
                    : `Supervisa el progreso del equipo y alinea ${analyticsData?.analytics?.totalObjectives || ''} objetivos organizacionales.`
                  }
                </p>
              </div>

              {/* Dynamic optimization action */}
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    analyticsData?.analytics?.totalObjectives && analyticsData.analytics.totalObjectives > 5 
                      ? 'bg-orange-100 dark:bg-orange-900/20' 
                      : 'bg-purple-100 dark:bg-purple-900/20'
                  }`}>
                    <Sparkles className={`h-4 w-4 ${
                      analyticsData?.analytics?.totalObjectives && analyticsData.analytics.totalObjectives > 5 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>
                  <h4 className="font-medium">
                    {analyticsData?.analytics?.totalObjectives && analyticsData.analytics.totalObjectives > 5 
                      ? 'Priorizar' 
                      : 'Optimizar'
                    }
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.analytics?.totalObjectives && analyticsData.analytics.totalObjectives > 5 
                    ? `Con ${analyticsData.analytics.totalObjectives} objetivos activos, considera priorizar los más críticos.`
                    : 'Identifica actividades de bajo impacto y reenfoca tus esfuerzos estratégicamente.'
                  }
                </p>
              </div>

              {/* Additional insights-based action */}
              {analyticsData?.analytics?.completionRate !== undefined && (
                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      analyticsData.analytics.completionRate >= 80 
                        ? 'bg-emerald-100 dark:bg-emerald-900/20' 
                        : analyticsData.analytics.completionRate >= 60 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20'
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      <Calendar className={`h-4 w-4 ${
                        analyticsData.analytics.completionRate >= 80 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : analyticsData.analytics.completionRate >= 60 
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <h4 className="font-medium">
                      {analyticsData.analytics.completionRate >= 80 
                        ? 'Mantener Excelencia' 
                        : analyticsData.analytics.completionRate >= 60 
                        ? 'Acelerar Finalización'
                        : 'Revisar Estrategia'
                      }
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tu tasa de finalización es del {analyticsData.analytics.completionRate}%. 
                    {analyticsData.analytics.completionRate >= 80 
                      ? ' Excelente trabajo, comparte tus mejores prácticas con el equipo.'
                      : analyticsData.analytics.completionRate >= 60 
                      ? ' Identifica los obstáculos que impiden completar objetivos a tiempo.'
                      : ' Es momento de revisar la planificación y redistribuir recursos.'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </AnalyticsErrorBoundary>
    </DashboardLayout>
  )
}
