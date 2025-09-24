"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProgressOverviewChart } from "@/components/charts/progress-overview-chart"
import { ProgressTrendChart } from "@/components/charts/progress-trend-chart"
import { DepartmentPerformanceChart } from "@/components/charts/department-performance-chart"
import { CompletionRateChart } from "@/components/charts/completion-rate-chart"
import { TeamPerformanceChart } from "@/components/charts/team-performance-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"
import { useState, useEffect } from "react"
import { Download, Calendar, TrendingUp, Target, Users, Activity } from "lucide-react"

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("6months")
  const [analytics, setAnalytics] = useState({
    totalObjectives: 0,
    totalInitiatives: 0,
    totalActivities: 0,
    averageProgress: 0,
    completionRate: 0,
    onTrackPercentage: 0,
  })

  const [progressTrendData, setProgressTrendData] = useState([
    { month: "Ene", objectives: 65, initiatives: 70, activities: 75 },
    { month: "Feb", objectives: 68, initiatives: 72, activities: 78 },
    { month: "Mar", objectives: 70, initiatives: 75, activities: 80 },
    { month: "Abr", objectives: 72, initiatives: 78, activities: 82 },
    { month: "May", objectives: 75, initiatives: 80, activities: 85 },
    { month: "Jun", objectives: 78, initiatives: 82, activities: 87 },
  ])

  const [departmentPerformanceData, setDepartmentPerformanceData] = useState([
    { department: "Ventas", completed: 8, inProgress: 12, notStarted: 3, paused: 1 },
    { department: "Marketing", completed: 6, inProgress: 8, notStarted: 2, paused: 0 },
    { department: "Tecnología", completed: 10, inProgress: 15, notStarted: 4, paused: 2 },
    { department: "RRHH", completed: 4, inProgress: 6, notStarted: 1, paused: 0 },
    { department: "Finanzas", completed: 5, inProgress: 7, notStarted: 2, paused: 1 },
  ])

  const [completionRateData, setCompletionRateData] = useState([
    { week: "S1", completionRate: 65, target: 70 },
    { week: "S2", completionRate: 68, target: 70 },
    { week: "S3", completionRate: 72, target: 75 },
    { week: "S4", completionRate: 75, target: 75 },
    { week: "S5", completionRate: 78, target: 80 },
    { week: "S6", completionRate: 82, target: 80 },
  ])

  // Progress overview data based on analytics stats
  const progressOverviewData = [
    { name: "Completados", value: analytics.completionRate, color: "hsl(var(--chart-1))" },
    { name: "En Progreso", value: Math.max(0, analytics.averageProgress - analytics.completionRate), color: "hsl(var(--chart-2))" },
    { name: "No Iniciados", value: Math.max(0, 100 - analytics.averageProgress), color: "hsl(var(--chart-3))" },
    { name: "Pausados", value: Math.max(0, analytics.onTrackPercentage - analytics.averageProgress), color: "hsl(var(--chart-4))" },
  ]

  const teamPerformanceData = [
    { metric: "Productividad", current: 85, target: 90, fullMark: 100 },
    { metric: "Calidad", current: 78, target: 85, fullMark: 100 },
    { metric: "Colaboración", current: 92, target: 88, fullMark: 100 },
    { metric: "Innovación", current: 70, target: 80, fullMark: 100 },
    { metric: "Cumplimiento", current: 88, target: 85, fullMark: 100 },
    { metric: "Satisfacción", current: 82, target: 90, fullMark: 100 },
  ]

  const fetchAnalytics = async () => {
    if (!profile) return

    setLoading(true)

    try {
      // Fetch analytics data from new API endpoints
      const [overviewResponse, progressTrendResponse, departmentResponse, completionRateResponse] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/progress-trend'),
        fetch('/api/analytics/department-performance'),
        fetch('/api/reports/completion-rate'),
      ])

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json()
        setAnalytics({
          totalObjectives: overviewData.totalObjectives,
          totalInitiatives: overviewData.totalInitiatives,
          totalActivities: overviewData.totalActivities,
          averageProgress: overviewData.averageProgress,
          completionRate: overviewData.completionRate,
          onTrackPercentage: overviewData.onTrackPercentage,
        })
      }

      if (progressTrendResponse.ok) {
        const progressData = await progressTrendResponse.json()
        setProgressTrendData(progressData)
      }

      if (departmentResponse.ok) {
        const departmentData = await departmentResponse.json()
        setDepartmentPerformanceData(departmentData)
      }

      if (completionRateResponse.ok) {
        const completionData = await completionRateResponse.json()
        setCompletionRateData(completionData)
      }

    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [profile, timeRange])

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
            <h1 className="text-3xl font-bold">Análisis de Rendimiento</h1>
            <p className="text-muted-foreground">Métricas y tendencias de tus OKRs</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Último mes</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalObjectives}</div>
              <p className="text-xs text-muted-foreground">Total activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Iniciativas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalInitiatives}</div>
              <p className="text-xs text-muted-foreground">En ejecución</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividades</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalActivities}</div>
              <p className="text-xs text-muted-foreground">Tareas específicas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageProgress}%</div>
              <p className="text-xs text-muted-foreground">Todos los objetivos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.completionRate}%</div>
              <p className="text-xs text-muted-foreground">Objetivos completados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Buen Camino</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.onTrackPercentage}%</div>
              <p className="text-xs text-muted-foreground">Progreso ≥ 70%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProgressOverviewChart data={progressOverviewData} />
          <ProgressTrendChart data={progressTrendData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepartmentPerformanceChart data={departmentPerformanceData} />
          <CompletionRateChart data={completionRateData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <TeamPerformanceChart data={teamPerformanceData} />
        </div>
      </div>
    </DashboardLayout>
  )
}
