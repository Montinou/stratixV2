"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from "recharts"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  BarChart3,
  PieChart,
  Eye,
  Filter,
  Info,
  Star,
  Clock
} from "lucide-react"
import { InsightsCard } from "./insights-card"
import type { Profile } from "@/lib/database/services"

interface AIInsight {
  id: string
  title: string
  content: string
  type: "prediction" | "recommendation" | "alert" | "opportunity"
  priority: "high" | "medium" | "low"
  impact: number
  confidence: number
  timestamp: Date
  category: "performance" | "team" | "objectives" | "trends"
}

interface PerformanceMetric {
  period: string
  actual: number
  predicted: number
  target: number
  variance: number
}

interface TeamComparison {
  team: string
  efficiency: number
  collaboration: number
  innovation: number
  quality: number
  delivery: number
  growth: number
}

interface DrillDownData {
  category: string
  subcategories: {
    name: string
    value: number
    trend: "up" | "down" | "stable"
    children?: { name: string; value: number }[]
  }[]
}

interface InsightsDashboardProps {
  profile: Profile
  timeRange?: string
  onTimeRangeChange?: (range: string) => void
}

export function InsightsDashboard({ profile, timeRange = "6months", onTimeRangeChange }: InsightsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Sample AI-generated insights data
  const [predictiveData, setPredictiveData] = useState<PerformanceMetric[]>([
    { period: "Q1", actual: 75, predicted: 78, target: 80, variance: -5 },
    { period: "Q2", actual: 82, predicted: 85, target: 85, variance: -3 },
    { period: "Q3", actual: 88, predicted: 91, target: 90, variance: +1 },
    { period: "Q4", actual: 0, predicted: 94, target: 95, variance: -1 },
  ])

  const [teamComparisonData, setTeamComparisonData] = useState<TeamComparison[]>([
    { team: "Ventas", efficiency: 85, collaboration: 90, innovation: 70, quality: 88, delivery: 92, growth: 85 },
    { team: "Marketing", efficiency: 78, collaboration: 85, innovation: 95, quality: 82, delivery: 80, growth: 88 },
    { team: "Desarrollo", efficiency: 92, collaboration: 75, innovation: 98, quality: 95, delivery: 88, growth: 90 },
    { team: "RRHH", efficiency: 88, collaboration: 95, innovation: 65, quality: 90, delivery: 85, growth: 75 },
    { team: "Finanzas", efficiency: 90, collaboration: 80, innovation: 60, quality: 95, delivery: 95, growth: 70 },
  ])

  const [trendAnalysisData, setTrendAnalysisData] = useState([
    { month: "Ene", rendimiento: 68, satisfaccion: 72, productividad: 65, calidad: 70 },
    { month: "Feb", rendimiento: 72, satisfaccion: 75, productividad: 68, calidad: 73 },
    { month: "Mar", rendimiento: 75, satisfaccion: 78, productividad: 72, calidad: 76 },
    { month: "Abr", rendimiento: 78, satisfaccion: 80, productividad: 75, calidad: 78 },
    { month: "May", rendimiento: 82, satisfaccion: 83, productividad: 78, calidad: 82 },
    { month: "Jun", rendimiento: 85, satisfaccion: 85, productividad: 82, calidad: 85 },
  ])

  const [drillDownData, setDrillDownData] = useState<DrillDownData[]>([
    {
      category: "Objetivos Estratégicos",
      subcategories: [
        {
          name: "Crecimiento",
          value: 75,
          trend: "up",
          children: [
            { name: "Ingresos", value: 82 },
            { name: "Clientes", value: 68 },
            { name: "Mercado", value: 75 }
          ]
        },
        {
          name: "Eficiencia",
          value: 88,
          trend: "up",
          children: [
            { name: "Costos", value: 92 },
            { name: "Procesos", value: 85 },
            { name: "Tiempo", value: 87 }
          ]
        },
        {
          name: "Innovación",
          value: 65,
          trend: "stable",
          children: [
            { name: "I+D", value: 70 },
            { name: "Productos", value: 60 },
            { name: "Tecnología", value: 65 }
          ]
        }
      ]
    }
  ])

  // Sample AI insights with different types and priorities
  useEffect(() => {
    const sampleInsights: AIInsight[] = [
      {
        id: "1",
        title: "Predicción de Rendimiento Q4",
        content: "Basado en las tendencias actuales, el rendimiento del equipo alcanzará un 94% en Q4, superando el objetivo del 90%. Los factores clave incluyen la mejora en colaboración (+15%) y la implementación de nuevos procesos.",
        type: "prediction",
        priority: "high",
        impact: 94,
        confidence: 87,
        timestamp: new Date(),
        category: "performance"
      },
      {
        id: "2",
        title: "Oportunidad de Mejora en Innovación",
        content: "El equipo de Marketing muestra el mayor potencial de innovación (95%) pero baja eficiencia (78%). Recomendamos redistribuir recursos y establecer procesos más ágiles para optimizar el rendimiento.",
        type: "opportunity",
        priority: "medium",
        impact: 85,
        confidence: 92,
        timestamp: new Date(),
        category: "team"
      },
      {
        id: "3",
        title: "Alerta: Varianza en Objetivos de Crecimiento",
        content: "Los objetivos de crecimiento muestran una varianza negativa del -5% en Q1. Es crítico implementar las medidas correctivas identificadas para recuperar el rumbo hacia el objetivo anual.",
        type: "alert",
        priority: "high",
        impact: 75,
        confidence: 95,
        timestamp: new Date(),
        category: "objectives"
      },
      {
        id: "4",
        title: "Recomendación: Optimización de Equipo de Desarrollo",
        content: "El equipo de Desarrollo lidera en eficiencia (92%) e innovación (98%) pero presenta oportunidades en colaboración (75%). Implementar sesiones de trabajo conjunto aumentaría el rendimiento general en un 12%.",
        type: "recommendation",
        priority: "medium",
        impact: 92,
        confidence: 88,
        timestamp: new Date(),
        category: "team"
      }
    ]
    setAiInsights(sampleInsights)
  }, [])

  const fetchAIInsights = async () => {
    setRefreshing(true)
    try {
      // Simulate AI insights generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In a real implementation, this would call the AI Gateway
      // const response = await fetch('/api/ai/generate-insights', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ timeRange, userId: profile.id })
      // })

      // For now, we'll refresh with updated timestamps
      setAiInsights(prev => prev.map(insight => ({
        ...insight,
        timestamp: new Date()
      })))
    } catch (error) {
      console.error("Error fetching AI insights:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const exportReport = async (format: "pdf" | "csv" | "json") => {
    try {
      const data = {
        insights: aiInsights,
        predictiveData,
        teamComparison: teamComparisonData,
        trends: trendAnalysisData,
        drillDown: drillDownData,
        exportedAt: new Date().toISOString(),
        timeRange,
        profile: { id: profile.id, name: profile.fullName }
      }

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `ai-analytics-${timeRange}-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // For PDF and CSV, we would typically call an API endpoint
        console.log(`Exporting ${format} report...`, data)
      }
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "prediction": return <TrendingUp className="h-4 w-4" />
      case "recommendation": return <Zap className="h-4 w-4" />
      case "alert": return <AlertCircle className="h-4 w-4" />
      case "opportunity": return <Target className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  const getInsightColor = (type: AIInsight["type"]) => {
    switch (type) {
      case "prediction": return "blue"
      case "recommendation": return "green"
      case "alert": return "red"
      case "opportunity": return "purple"
      default: return "gray"
    }
  }

  const getPriorityColor = (priority: AIInsight["priority"]) => {
    switch (priority) {
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
      default: return "outline"
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [timeRange])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Generando insights personalizados con IA. Esto puede tomar unos momentos...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AI Analytics & Insights
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Dashboard inteligente con análisis predictivo, recomendaciones personalizadas y monitoreo en tiempo real
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  IA Activa
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Tiempo Real
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {aiInsights.filter(i => i.confidence > 90).length} Insights de Alta Confianza
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-48">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Último mes</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={() => fetchAIInsights()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando..." : "Actualizar IA"}
            </Button>
            <Button variant="outline" onClick={() => exportReport("json")}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced AI Insights Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aiInsights.slice(0, 4).map((insight) => (
          <Card key={insight.id} className="relative overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer border-2 hover:border-primary/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform" />
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-md ${
                    insight.type === 'prediction' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                    insight.type === 'recommendation' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                    insight.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                    'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                  }`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <Badge variant={getPriorityColor(insight.priority)} className="text-xs font-semibold">
                    {insight.priority.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium">{insight.confidence}%</span>
                </div>
              </div>
              <CardTitle className="text-sm font-semibold leading-tight">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">{insight.impact}%</span>
                <span className="text-xs text-muted-foreground">impacto esperado</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {insight.content}
              </p>
              <div className="mt-3 flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {insight.timestamp.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert for High Priority Insights */}
      {aiInsights.filter(i => i.priority === 'high').length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Tienes {aiInsights.filter(i => i.priority === 'high').length} insights de alta prioridad que requieren atención inmediata.
          </AlertDescription>
        </Alert>
      )}

      <Separator className="my-6" />

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Predicciones
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="drilldown" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Drill-Down
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights Cards */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Insights Generados por IA
              </h2>
              {aiInsights.map((insight) => (
                <InsightsCard
                  key={insight.id}
                  title={insight.title}
                  insights={insight.content}
                  type={insight.category === "performance" ? "objective" : insight.category === "team" ? "team" : "daily"}
                  loading={refreshing}
                />
              ))}
            </div>

            {/* Performance Overview */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Rendimiento Predictivo</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Análisis Predictivo de Rendimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={predictiveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                      <Legend />
                      <Bar dataKey="actual" fill="hsl(var(--chart-1))" name="Actual" />
                      <Line type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Predicción IA" />
                      <Line type="monotone" dataKey="target" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" name="Objetivo" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Predicciones de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={predictiveData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Predicción IA" />
                    <Area type="monotone" dataKey="target" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} name="Objetivo" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Varianza</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={predictiveData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, "Varianza"]} />
                    <Bar
                      dataKey="variance"
                      fill={(data) => data.variance >= 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-4))"}
                      name="Varianza vs Objetivo"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparación de Rendimiento por Equipos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={teamComparisonData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="team" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Eficiencia" dataKey="efficiency" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.1} />
                  <Radar name="Colaboración" dataKey="collaboration" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} />
                  <Radar name="Innovación" dataKey="innovation" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} />
                  <Radar name="Calidad" dataKey="quality" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.1} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Tendencias Temporales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  <Legend />
                  <Line type="monotone" dataKey="rendimiento" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Rendimiento" />
                  <Line type="monotone" dataKey="satisfaccion" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Satisfacción" />
                  <Line type="monotone" dataKey="productividad" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Productividad" />
                  <Line type="monotone" dataKey="calidad" stroke="hsl(var(--chart-4))" strokeWidth={3} name="Calidad" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drilldown" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Análisis Drill-Down
              </h2>
              <Badge variant="outline" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {drillDownData.length} Categorías Analizadas
              </Badge>
            </div>

            {drillDownData.map((category, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-background">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Métrica</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tendencia</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.subcategories.map((sub, subIndex) => (
                        <TableRow key={subIndex} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium">{sub.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-2xl font-bold text-primary">{sub.value}%</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sub.trend === "up" ? "default" : sub.trend === "down" ? "destructive" : "secondary"}>
                              {sub.trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> :
                               sub.trend === "down" ? <TrendingDown className="h-3 w-3 mr-1" /> :
                               <Activity className="h-3 w-3 mr-1" />}
                              {sub.trend === "up" ? "Subiendo" : sub.trend === "down" ? "Bajando" : "Estable"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMetric(selectedMetric === sub.name ? null : sub.name)}
                            >
                              <Eye className="h-4 w-4" />
                              {selectedMetric === sub.name ? 'Ocultar' : 'Ver Detalles'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Expanded Details */}
                  {category.subcategories.map((sub, subIndex) => (
                    selectedMetric === sub.name && sub.children && (
                      <div key={`detail-${subIndex}`} className="border-t bg-muted/30 p-4">
                        <div className="mb-3">
                          <h4 className="font-semibold text-sm">Desglose de {sub.name}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {sub.children.map((child, childIndex) => (
                            <Card key={childIndex} className="border-0 bg-background/50">
                              <CardContent className="p-4 text-center">
                                <div className="text-sm font-medium text-muted-foreground mb-1">{child.name}</div>
                                <div className="text-2xl font-bold text-primary">{child.value}%</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {child.value >= 80 ? "Excelente" : child.value >= 60 ? "Bueno" : "Necesita Mejora"}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}