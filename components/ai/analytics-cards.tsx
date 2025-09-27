"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  Brain,
  ArrowRight,
  Calendar,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Info,
  Star,
  Timer,
  Lightbulb,
  Gauge
} from "lucide-react"

interface PredictiveAnalytic {
  id: string
  title: string
  currentValue: number
  predictedValue: number
  confidence: number
  trend: "up" | "down" | "stable"
  timeframe: string
  description: string
  recommendations: string[]
  chartData: { period: string; value: number; predicted?: number }[]
}

interface RecommendationCard {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  impact: number
  effort: number
  category: "performance" | "team" | "process" | "strategic"
  description: string
  actions: {
    text: string
    type: "primary" | "secondary"
    url?: string
  }[]
  timeToImpact: string
  successMetrics: string[]
}

interface RealTimeWidget {
  id: string
  title: string
  value: number | string
  change: number
  trend: "up" | "down" | "stable"
  status: "healthy" | "warning" | "critical"
  lastUpdated: Date
  chartData?: { time: string; value: number }[]
  threshold?: { warning: number; critical: number }
}

interface AnalyticsCardsProps {
  timeRange?: string
  refreshInterval?: number
  onCardClick?: (cardId: string) => void
}

export function AnalyticsCards({ timeRange = "6months", refreshInterval = 30000, onCardClick }: AnalyticsCardsProps) {
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<PredictiveAnalytic[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([])
  const [realTimeWidgets, setRealTimeWidgets] = useState<RealTimeWidget[]>([])

  // Initialize sample data
  useEffect(() => {
    const samplePredictiveAnalytics: PredictiveAnalytic[] = [
      {
        id: "completion-rate",
        title: "Tasa de Finalización",
        currentValue: 78,
        predictedValue: 85,
        confidence: 92,
        trend: "up",
        timeframe: "Próximos 30 días",
        description: "Basado en el patrón actual de actividad y compromiso del equipo, la tasa de finalización aumentará significativamente.",
        recommendations: [
          "Mantener el ritmo actual de revisiones semanales",
          "Implementar celebraciones de hitos intermedios",
          "Asignar mentores a objetivos en riesgo"
        ],
        chartData: [
          { period: "Sem 1", value: 72 },
          { period: "Sem 2", value: 75 },
          { period: "Sem 3", value: 78 },
          { period: "Sem 4", predicted: 82 },
          { period: "Sem 5", predicted: 85 }
        ]
      },
      {
        id: "team-performance",
        title: "Rendimiento de Equipos",
        currentValue: 82,
        predictedValue: 78,
        confidence: 78,
        trend: "down",
        timeframe: "Próximos 15 días",
        description: "Se detecta una posible disminución en el rendimiento debido a la sobrecarga de trabajo en ciertos equipos.",
        recommendations: [
          "Redistribuir cargas de trabajo entre equipos",
          "Programar sesiones de descanso y team building",
          "Revisar prioridades de proyectos actuales"
        ],
        chartData: [
          { period: "Sem 1", value: 85 },
          { period: "Sem 2", value: 83 },
          { period: "Sem 3", value: 82 },
          { period: "Sem 4", predicted: 80 },
          { period: "Sem 5", predicted: 78 }
        ]
      },
      {
        id: "innovation-index",
        title: "Índice de Innovación",
        currentValue: 65,
        predictedValue: 72,
        confidence: 85,
        trend: "up",
        timeframe: "Próximos 45 días",
        description: "Las nuevas iniciativas de I+D y los programas de capacitación muestran un impacto positivo en la innovación.",
        recommendations: [
          "Aumentar presupuesto para proyectos experimentales",
          "Crear espacios de ideación colaborativa",
          "Implementar programa de reconocimiento a la innovación"
        ],
        chartData: [
          { period: "Mes 1", value: 60 },
          { period: "Mes 2", value: 63 },
          { period: "Mes 3", value: 65 },
          { period: "Mes 4", predicted: 68 },
          { period: "Mes 5", predicted: 72 }
        ]
      }
    ]

    const sampleRecommendations: RecommendationCard[] = [
      {
        id: "optimize-meetings",
        title: "Optimizar Reuniones Estratégicas",
        priority: "high",
        impact: 85,
        effort: 30,
        category: "process",
        description: "Reducir la duración promedio de reuniones en un 25% implementando agendas estructuradas y timeboxing.",
        actions: [
          { text: "Implementar", type: "primary", url: "/process/meetings" },
          { text: "Ver Detalles", type: "secondary" }
        ],
        timeToImpact: "2 semanas",
        successMetrics: ["Tiempo promedio de reunión", "Satisfacción del equipo", "Productividad semanal"]
      },
      {
        id: "cross-training",
        title: "Programa de Capacitación Cruzada",
        priority: "medium",
        impact: 78,
        effort: 65,
        category: "team",
        description: "Implementar capacitación cruzada entre departamentos para reducir dependencias y aumentar flexibilidad.",
        actions: [
          { text: "Planificar", type: "primary", url: "/team/training" },
          { text: "Análisis ROI", type: "secondary" }
        ],
        timeToImpact: "6 semanas",
        successMetrics: ["Versatilidad del equipo", "Tiempo de resolución de problemas", "Satisfacción laboral"]
      },
      {
        id: "automation-pipeline",
        title: "Automatización de Reportes",
        priority: "medium",
        impact: 70,
        effort: 45,
        category: "performance",
        description: "Automatizar la generación de reportes semanales para liberar 8 horas de trabajo manual por semana.",
        actions: [
          { text: "Desarrollar", type: "primary", url: "/automation/reports" },
          { text: "Prototipo", type: "secondary" }
        ],
        timeToImpact: "4 semanas",
        successMetrics: ["Horas ahorradas", "Precisión de reportes", "Tiempo de entrega"]
      },
      {
        id: "strategic-alignment",
        title: "Alineación Estratégica de Objetivos",
        priority: "high",
        impact: 92,
        effort: 55,
        category: "strategic",
        description: "Revisar y realinear objetivos departamentales con la estrategia corporativa para aumentar impacto.",
        actions: [
          { text: "Revisar Ahora", type: "primary", url: "/objectives/alignment" },
          { text: "Análisis de Brechas", type: "secondary" }
        ],
        timeToImpact: "3 semanas",
        successMetrics: ["Alineación estratégica", "Impacto de objetivos", "Coordinación entre equipos"]
      }
    ]

    const sampleRealTimeWidgets: RealTimeWidget[] = [
      {
        id: "active-users",
        title: "Usuarios Activos",
        value: 156,
        change: 12,
        trend: "up",
        status: "healthy",
        lastUpdated: new Date(),
        chartData: [
          { time: "09:00", value: 145 },
          { time: "10:00", value: 152 },
          { time: "11:00", value: 156 },
          { time: "12:00", value: 148 },
          { time: "13:00", value: 156 }
        ],
        threshold: { warning: 100, critical: 50 }
      },
      {
        id: "objective-progress",
        title: "Progreso Global",
        value: "74%",
        change: 3.2,
        trend: "up",
        status: "healthy",
        lastUpdated: new Date(),
        threshold: { warning: 60, critical: 40 }
      },
      {
        id: "team-velocity",
        title: "Velocidad de Equipo",
        value: 28,
        change: -5,
        trend: "down",
        status: "warning",
        lastUpdated: new Date(),
        chartData: [
          { time: "Lun", value: 32 },
          { time: "Mar", value: 30 },
          { time: "Mié", value: 28 },
          { time: "Jue", value: 26 },
          { time: "Vie", value: 28 }
        ],
        threshold: { warning: 25, critical: 20 }
      },
      {
        id: "engagement-score",
        title: "Índice de Compromiso",
        value: 8.3,
        change: 0.5,
        trend: "up",
        status: "healthy",
        lastUpdated: new Date(),
        threshold: { warning: 7.0, critical: 6.0 }
      }
    ]

    setPredictiveAnalytics(samplePredictiveAnalytics)
    setRecommendations(sampleRecommendations)
    setRealTimeWidgets(sampleRealTimeWidgets)
    setLoading(false)
  }, [])

  // Real-time data refresh
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(() => {
      // Simulate real-time updates
      setRealTimeWidgets(prev => prev.map(widget => ({
        ...widget,
        value: typeof widget.value === 'number' ?
          Math.max(0, widget.value + (Math.random() - 0.5) * 10) :
          widget.value,
        change: (Math.random() - 0.5) * 20,
        lastUpdated: new Date()
      })))
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />
      case "stable": return <Activity className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy": return "text-green-500"
      case "warning": return "text-yellow-500"
      case "critical": return "text-red-500"
    }
  }

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "performance": return <BarChart3 className="h-4 w-4" />
      case "team": return <Users className="h-4 w-4" />
      case "process": return <Activity className="h-4 w-4" />
      case "strategic": return <Target className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Real-Time Monitoring Skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-12 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Predictive Analytics Skeleton */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recommendations Skeleton */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Cargando análisis predictivos y recomendaciones inteligentes...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Real-Time Monitoring Widgets */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Monitoreo en Tiempo Real
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Métricas actualizadas automáticamente cada {refreshInterval ? `${refreshInterval / 1000}s` : 'vez'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Timer className="h-3 w-3 mr-1" />
              {realTimeWidgets.filter(w => w.status === 'healthy').length}/{realTimeWidgets.length} Saludables
            </Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>En vivo</span>
              </div>
              <span>•</span>
              <span>{lastRefresh.toLocaleTimeString('es-ES')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {realTimeWidgets.map((widget) => (
            <Card
              key={widget.id}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 group border-2 ${
                widget.status === 'healthy' ? 'hover:border-green-200 dark:hover:border-green-800' :
                widget.status === 'warning' ? 'hover:border-yellow-200 dark:hover:border-yellow-800' :
                'hover:border-red-200 dark:hover:border-red-800'
              }`}
              onClick={() => onCardClick?.(widget.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    {widget.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      widget.status === 'healthy' ? 'bg-green-500' :
                      widget.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    } ${widget.status === 'healthy' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs font-medium ${getStatusColor(widget.status)}`}>
                      {widget.status === 'healthy' ? 'OK' : widget.status === 'warning' ? 'AVISO' : 'CRÍTICO'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform">
                      {widget.value}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {getTrendIcon(widget.trend)}
                      <span className={`font-medium ${widget.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {widget.change >= 0 ? "+" : ""}{widget.change.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs anterior</span>
                    </div>
                  </div>
                  {widget.chartData && (
                    <div className="w-20 h-16 opacity-80 group-hover:opacity-100 transition-opacity">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={widget.chartData}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={
                              widget.status === 'healthy' ? 'hsl(var(--chart-1))' :
                              widget.status === 'warning' ? 'hsl(var(--chart-3))' :
                              'hsl(var(--chart-4))'
                            }
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {widget.threshold && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground">
                      Umbrales: <span className="text-yellow-600">⚠{widget.threshold.warning}</span>
                      {" • "}
                      <span className="text-red-600">🚨{widget.threshold.critical}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status Summary Alert */}
        {realTimeWidgets.some(w => w.status !== 'healthy') && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              {realTimeWidgets.filter(w => w.status === 'warning').length} métricas en estado de advertencia y{" "}
              {realTimeWidgets.filter(w => w.status === 'critical').length} en estado crítico requieren atención.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator className="my-8" />

      {/* Enhanced Predictive Analytics Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Análisis Predictivo
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Predicciones generadas por IA basadas en patrones históricos y tendencias actuales
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            {predictiveAnalytics.filter(p => p.confidence > 85).length} Alta Confianza
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {predictiveAnalytics.map((analytic) => (
            <Card
              key={analytic.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 group border-2 hover:border-primary/20"
              onClick={() => onCardClick?.(analytic.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-semibold">{analytic.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium">{analytic.confidence}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    analytic.trend === 'up' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                    analytic.trend === 'down' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
                  }`}>
                    {getTrendIcon(analytic.trend)}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{analytic.timeframe}</span>
                    <div className="text-xs text-muted-foreground">
                      {analytic.trend === 'up' ? 'Tendencia positiva' :
                       analytic.trend === 'down' ? 'Tendencia descendente' :
                       'Tendencia estable'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Actual</div>
                    <div className="text-2xl font-bold">{analytic.currentValue}%</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Predicción IA</div>
                    <div className={`text-2xl font-bold ${
                      analytic.predictedValue > analytic.currentValue ? 'text-green-600' :
                      analytic.predictedValue < analytic.currentValue ? 'text-red-600' :
                      'text-primary'
                    }`}>
                      {analytic.predictedValue}%
                    </div>
                  </div>
                </div>

                <div className="h-24 bg-background/50 rounded-md p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytic.chartData}>
                      <defs>
                        <linearGradient id={`gradient-${analytic.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--chart-1))"
                        fill={`url(#gradient-${analytic.id})`}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="predicted"
                        stroke="hsl(var(--chart-2))"
                        fill="none"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {analytic.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-medium">Recomendaciones clave:</span>
                    </div>
                    <div className="space-y-1">
                      {analytic.recommendations.slice(0, 2).map((rec, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-2 pl-2">
                          <div className="h-1 w-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      ))}
                      {analytic.recommendations.length > 2 && (
                        <div className="text-xs text-primary cursor-pointer hover:underline pl-2">
                          +{analytic.recommendations.length - 2} recomendaciones más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* AI Recommendations */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Recomendaciones Inteligentes
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onCardClick?.(rec.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(rec.category)}
                    <CardTitle className="text-lg">{rec.title}</CardTitle>
                  </div>
                  <Badge variant={getPriorityColor(rec.priority)}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{rec.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Impacto Esperado</div>
                    <div className="flex items-center gap-2">
                      <Progress value={rec.impact} className="flex-1" />
                      <span className="text-sm font-medium">{rec.impact}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Esfuerzo Requerido</div>
                    <div className="flex items-center gap-2">
                      <Progress value={rec.effort} className="flex-1" />
                      <span className="text-sm font-medium">{rec.effort}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tiempo al impacto: {rec.timeToImpact}
                  </div>
                </div>

                <div className="flex gap-2">
                  {rec.actions.map((action, i) => (
                    <Button
                      key={i}
                      variant={action.type === "primary" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (action.url) {
                          window.open(action.url, '_blank')
                        }
                      }}
                    >
                      {action.text}
                      {action.url && <ExternalLink className="ml-1 h-3 w-3" />}
                    </Button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium">Métricas de Éxito:</div>
                  <div className="flex flex-wrap gap-1">
                    {rec.successMetrics.map((metric, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}