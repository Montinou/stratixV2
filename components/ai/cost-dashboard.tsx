"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  AlertTriangle,
  Download,
  Settings,
  Activity,
  Target,
  BarChart3
} from "lucide-react"
import { useState, useEffect } from "react"
import type { Profile } from "@/lib/database/services"

interface CostMetrics {
  totalCost: number
  dailyCost: number
  monthlyCost: number
  requestsCount: number
  averageCostPerRequest: number
  topModel: string
  costTrend: number
  budgetUsed: number
  budgetLimit: number
  emergencyThreshold: number
  currentStatus: 'normal' | 'warning' | 'emergency'
}

interface CostDashboardProps {
  profile: Profile
  timeRange?: string
  className?: string
}

export function CostDashboard({ profile, timeRange = "7days", className }: CostDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<CostMetrics>({
    totalCost: 0,
    dailyCost: 0,
    monthlyCost: 0,
    requestsCount: 0,
    averageCostPerRequest: 0,
    topModel: '',
    costTrend: 0,
    budgetUsed: 0,
    budgetLimit: 0,
    emergencyThreshold: 90,
    currentStatus: 'normal'
  })

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const fetchCostMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/cost/metrics?timeRange=${selectedTimeRange}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error("Error fetching cost metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCostMetrics()
  }, [selectedTimeRange, profile])

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cents / 100)
  }

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'emergency': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'default'
    }
  }

  const getBudgetStatusIcon = (status: string) => {
    switch (status) {
      case 'emergency': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <TrendingUp className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const budgetPercentage = metrics.budgetLimit > 0 ? (metrics.budgetUsed / metrics.budgetLimit) * 100 : 0

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-4 w-[350px]" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-[160px]" />
              <Skeleton className="h-9 w-[100px]" />
              <Skeleton className="h-9 w-[120px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-[80px] mb-2" />
                  <Skeleton className="h-3 w-[120px]" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-5 w-[60px]" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Panel de Costos de IA</h2>
          <p className="text-sm text-muted-foreground lg:text-base">
            Monitoreo en tiempo real de gastos y uso de modelos de IA
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-3 sm:space-y-0">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Últimas 24h</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="90days">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Configurar</span>
              <span className="sm:hidden">Config</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Budget Status Alert */}
      {metrics.currentStatus !== 'normal' && (
        <Alert variant={metrics.currentStatus === 'emergency' ? 'destructive' : 'default'}>
          <div className="flex items-center gap-3">
            {getBudgetStatusIcon(metrics.currentStatus)}
            <div className="flex-1">
              <h4 className="font-semibold text-sm">
                {metrics.currentStatus === 'emergency' ? 'Límite de Emergencia Alcanzado' : 'Advertencia de Presupuesto'}
              </h4>
              <AlertDescription className="mt-1">
                Has utilizado el {budgetPercentage.toFixed(1)}% de tu presupuesto mensual.
                {metrics.currentStatus === 'emergency'
                  ? ' Se recomienda revisar el uso inmediatamente.'
                  : ' Considera ajustar el presupuesto o revisar el uso.'
                }
              </AlertDescription>
            </div>
            <Badge variant={getBudgetStatusColor(metrics.currentStatus)} className="shrink-0">
              {metrics.currentStatus === 'emergency' ? 'EMERGENCIA' : 'ADVERTENCIA'}
            </Badge>
          </div>
        </Alert>
      )}

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalCost)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {metrics.costTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {Math.abs(metrics.costTrend).toFixed(1)}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Diario</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.dailyCost)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(metrics.monthlyCost / 30)}/día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.requestsCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(metrics.averageCostPerRequest)}/solicitud
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelo Principal</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{metrics.topModel || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Más utilizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estado del Presupuesto
          </CardTitle>
          <CardDescription>
            Uso actual vs límites configurados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Presupuesto Utilizado</span>
              <span className="font-medium">
                {formatCurrency(metrics.budgetUsed)} / {formatCurrency(metrics.budgetLimit)}
              </span>
            </div>
            <Progress
              value={budgetPercentage}
              className={`h-3 ${
                budgetPercentage >= metrics.emergencyThreshold
                  ? "progress-destructive"
                  : budgetPercentage >= 80
                  ? "progress-warning"
                  : "progress-success"
              }`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>{budgetPercentage.toFixed(1)}% utilizado</span>
              <span>100%</span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Límite Diario</p>
              <p className="font-medium">{formatCurrency(metrics.budgetLimit / 30)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Límite Mensual</p>
              <p className="font-medium">{formatCurrency(metrics.budgetLimit)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Umbral de Emergencia</p>
              <p className="font-medium">{metrics.emergencyThreshold}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}