"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InsightsDashboard } from "@/components/ai/insights-dashboard"
import { AnalyticsCards } from "@/components/ai/analytics-cards"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  BarChart3,
  Target,
  Users,
  TrendingUp,
  Activity,
  Calendar,
  Settings,
  Download,
  RefreshCw,
  Zap,
  Eye
} from "lucide-react"
import type { Profile } from "@/lib/database/services"

interface AIAnalyticsContentProps {
  profile: Profile
}

export function AIAnalyticsContent({ profile }: AIAnalyticsContentProps) {
  const [timeRange, setTimeRange] = useState("6months")
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds
  const [activeView, setActiveView] = useState("dashboard")

  const handleCardClick = (cardId: string) => {
    console.log(`Card clicked: ${cardId}`)
    // Handle card drill-down or navigation
  }

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  const handleRefreshIntervalChange = (interval: string) => {
    setRefreshInterval(parseInt(interval))
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AI Analytics & Insights
              </h1>
              <p className="text-muted-foreground">
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
                  <Eye className="h-3 w-3 mr-1" />
                  Drill-Down
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-48">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Último mes</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={refreshInterval.toString()} onValueChange={handleRefreshIntervalChange}>
              <SelectTrigger className="w-48">
                <RefreshCw className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">Cada 10 segundos</SelectItem>
                <SelectItem value="30000">Cada 30 segundos</SelectItem>
                <SelectItem value="60000">Cada minuto</SelectItem>
                <SelectItem value="300000">Cada 5 minutos</SelectItem>
                <SelectItem value="0">Manual</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Dashboard
            </Button>

            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                Insights Generados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">47</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">Últimas 24h</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Precisión Predictiva
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">92%</div>
              <p className="text-xs text-green-600 dark:text-green-400">Promedio último mes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                Recomendaciones Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">23</div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Pendientes implementar</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                Equipos Analizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">8</div>
              <p className="text-xs text-orange-600 dark:text-orange-400">Departamentos activos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                Métricas Monitoreadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">156</div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">En tiempo real</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard Completo
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Vista de Tarjetas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <InsightsDashboard
              profile={profile}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <AnalyticsCards
              timeRange={timeRange}
              refreshInterval={refreshInterval}
              onCardClick={handleCardClick}
            />
          </TabsContent>
        </Tabs>

        {/* Footer Information */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  <span>Powered by AI Gateway</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  <span>Datos actualizados cada {refreshInterval / 1000}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>Análisis de {timeRange === "1month" ? "1 mes" : timeRange === "3months" ? "3 meses" : timeRange === "6months" ? "6 meses" : "1 año"}</span>
                </div>
              </div>
              <div className="text-xs">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}