"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panel de Costos de IA</h2>
          <p className="text-muted-foreground">
            Monitoreo en tiempo real de gastos y uso de modelos de IA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Últimas 24h</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="90days">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Budget Status Alert */}
      {metrics.currentStatus !== 'normal' && (
        <Card className={`border-${metrics.currentStatus === 'emergency' ? 'destructive' : 'warning'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {getBudgetStatusIcon(metrics.currentStatus)}
              <div className="flex-1">
                <h4 className="font-semibold">
                  {metrics.currentStatus === 'emergency' ? 'Límite de Emergencia Alcanzado' : 'Advertencia de Presupuesto'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Has utilizado el {budgetPercentage.toFixed(1)}% de tu presupuesto mensual
                </p>
              </div>
              <Badge variant={getBudgetStatusColor(metrics.currentStatus)}>
                {metrics.currentStatus === 'emergency' ? 'EMERGENCIA' : 'ADVERTENCIA'}
              </Badge>
            </div>
          </CardContent>
        </Card>
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
              className="h-2"
              indicatorClassName={
                budgetPercentage >= metrics.emergencyThreshold
                  ? "bg-red-500"
                  : budgetPercentage >= 80
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
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