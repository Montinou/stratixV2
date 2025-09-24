// TODO: Replace Supabase queries with API calls
// This file needs manual migration to use API endpoints


"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InsightsCard } from "@/components/ai/insights-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/use-auth"
import { generateDailyInsights, generateTeamInsights } from "@/lib/ai/insights"
import type { Objective, Initiative, Activity } from "@/lib/types/okr"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Lightbulb, Sparkles, TrendingUp, Users, RefreshCw, Calendar } from "lucide-react"

export default function InsightsPage() {
  const { profile } = useAuth()
  // const [...] = await Promise.all([/* TODO: Replace with API call */])

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
