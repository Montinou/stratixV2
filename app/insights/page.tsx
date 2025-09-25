"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InsightsCard } from "@/components/ai/insights-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/use-auth"
// Removed supabase import - now using analytics API endpoints
import { generateDailyInsights, generateTeamInsights } from "@/lib/ai/insights"
import type { Objective, Initiative, Activity } from "@/lib/types/okr"
import { useState, useEffect, useCallback } from "react"
import { Lightbulb, Sparkles, TrendingUp, Users, RefreshCw, Calendar } from "lucide-react"

export default function InsightsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [timeRange, setTimeRange] = useState("week")
  const [error, setError] = useState<string | null>(null)

  // No longer needed - using analytics API endpoints instead of direct Supabase calls

  const [data, setData] = useState<{
    objectives: Objective[]
    initiatives: Initiative[]
    activities: Activity[]
    analytics?: any
  }>({
    objectives: [],
    initiatives: [],
    activities: [],
    analytics: null,
  })

  const [insights, setInsights] = useState({
    daily: "",
    team: "",
    lastGenerated: null as Date | null,
  })

  const fetchData = useCallback(async () => {
    if (!profile) return

    setLoading(true)
    setError(null) // Clear any previous errors

    try {
      // Build query parameters for date filtering based on selected time range
      const params = new URLSearchParams()
      
      // Add date range filtering based on timeRange state
      const now = new Date()
      let startDate: Date
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      }
      
      params.append('startDate', startDate.toISOString())
      params.append('endDate', now.toISOString())

      // Fetch analytics overview data from API with date filtering
      const analyticsUrl = `/api/analytics/overview?${params.toString()}`
      const response = await fetch(analyticsUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for auth cookies
      })

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status} ${response.statusText}`)
      }

      const analyticsData = await response.json()

      // For insights generation, we need the individual records, not just aggregated data
      // So we'll fetch the actual data from the existing APIs until migration is complete
      // TODO: Eventually these should also support date filtering when migrated
      const [objectivesRes, initiativesRes, activitiesRes] = await Promise.all([
        fetch('/api/objectives', { credentials: 'include' }),
        fetch('/api/initiatives', { credentials: 'include' }),
        fetch('/api/activities', { credentials: 'include' })
      ])

      const objectives = objectivesRes.ok ? await objectivesRes.json() : []
      const initiatives = initiativesRes.ok ? await initiativesRes.json() : []
      const activities = activitiesRes.ok ? await activitiesRes.json() : []

      setData({
        objectives: Array.isArray(objectives) ? objectives : [],
        initiatives: Array.isArray(initiatives) ? initiatives : [],
        activities: Array.isArray(activities) ? activities : [],
        analytics: analyticsData, // Store analytics data for potential use
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar los datos"
      setError(`No se pudieron cargar los datos: ${errorMessage}`)
      
      // Set empty data on error to prevent crashes
      setData({
        objectives: [],
        initiatives: [],
        activities: [],
        analytics: null,
      })
    } finally {
      setLoading(false)
    }
  }, [profile, timeRange])

  const generateInsights = useCallback(async () => {
    if (!profile) return

    setGeneratingInsights(true)

    try {
      // Generate daily insights
      const dailyInsights = await generateDailyInsights({
        role: profile.role,
        objectives: data.objectives,
        initiatives: data.initiatives,
        activities: data.activities,
        department: profile.department || undefined,
      })

      let teamInsights = ""
      if (profile.role !== "empleado") {
        // Generate team insights for managers and corporate users
        teamInsights = await generateTeamInsights({
          objectives: data.objectives,
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
    } finally {
      setGeneratingInsights(false)
    }
  }, [profile, data])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (data.objectives.length > 0 && !insights.daily) {
      generateInsights()
    }
  }, [data, insights.daily, generateInsights])

  const formatLastGenerated = (date: Date | null) => {
    if (!date) return "Nunca"
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Error al cargar los datos</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3" 
                    onClick={fetchData}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Intentar de nuevo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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
            <Button onClick={generateInsights} disabled={generatingInsights}>
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
                <div className="text-2xl font-bold text-primary">{data.objectives.length}</div>
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
          />

          {profile?.role !== "empleado" && (
            <InsightsCard
              title="Análisis de Equipo"
              insights={insights.team || "Analizando el rendimiento del equipo y generando recomendaciones..."}
              type="team"
              onRefresh={generateInsights}
              loading={generatingInsights && !insights.team}
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
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-medium">Revisar Progreso</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Actualiza el progreso de tus objetivos para obtener insights más precisos.
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-medium">Colaborar</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Conecta con tu equipo para alinear objetivos y compartir mejores prácticas.
                </p>
              </div>

              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-medium">Optimizar</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Identifica actividades de bajo impacto y reenfoca tus esfuerzos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
