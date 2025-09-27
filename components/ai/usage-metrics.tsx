"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import { useState, useEffect } from "react"
import type { Profile } from "@/lib/database/services"
import {
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  Users,
  BarChart3,
  PieChart as PieIcon,
  Activity
} from "lucide-react"

interface UsageData {
  costTrend: Array<{
    date: string
    cost: number
    requests: number
    tokens: number
  }>
  modelUsage: Array<{
    name: string
    requests: number
    cost: number
    percentage: number
    color: string
  }>
  hourlyDistribution: Array<{
    hour: string
    requests: number
    cost: number
  }>
  userBreakdown: Array<{
    userId: string
    userName: string
    requests: number
    cost: number
    lastUsed: string
  }>
  endpointUsage: Array<{
    endpoint: string
    requests: number
    cost: number
    averageLatency: number
  }>
}

interface UsageMetricsProps {
  profile: Profile
  timeRange?: string
  className?: string
}

export function UsageMetrics({ profile, timeRange = "7days", className }: UsageMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UsageData>({
    costTrend: [],
    modelUsage: [],
    hourlyDistribution: [],
    userBreakdown: [],
    endpointUsage: []
  })
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [activeTab, setActiveTab] = useState("trends")

  const fetchUsageData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/usage/analytics?timeRange=${selectedTimeRange}`)
      if (response.ok) {
        const usageData = await response.json()
        setData(usageData)
      }
    } catch (error) {
      console.error("Error fetching usage data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsageData()
  }, [selectedTimeRange, profile])

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cents / 100)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Cost') || entry.name.includes('Costo')
                ? formatCurrency(entry.value)
                : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análisis de Uso de IA</h2>
          <p className="text-muted-foreground">
            Métricas detalladas de consumo y patrones de uso
          </p>
        </div>
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
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            Modelos
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Patrones
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        {/* Cost and Request Trends */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tendencia de Costos
                </CardTitle>
                <CardDescription>
                  Evolución del gasto en el tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.costTrend}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#costGradient)"
                      name="Costo"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Volumen de Solicitudes
                </CardTitle>
                <CardDescription>
                  Número de solicitudes por período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.costTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                      name="Solicitudes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Model Usage Distribution */}
        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Distribución por Modelo
                </CardTitle>
                <CardDescription>
                  Uso relativo de cada modelo de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.modelUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {data.modelUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        name === 'percentage' ? `${value}%` : value,
                        name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Costo por Modelo</CardTitle>
                <CardDescription>
                  Gasto distribuido por modelo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.modelUsage} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrency(value)}
                      fontSize={12}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="cost"
                      fill="hsl(var(--primary))"
                      name="Costo"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Patterns */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Distribución Horaria
                </CardTitle>
                <CardDescription>
                  Patrones de uso durante el día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="requests"
                      fill="hsl(var(--secondary))"
                      name="Solicitudes"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso por Endpoint</CardTitle>
                <CardDescription>
                  Solicitudes por endpoint de API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.endpointUsage.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{endpoint.endpoint}</p>
                      <p className="text-xs text-muted-foreground">
                        {endpoint.requests} solicitudes • {endpoint.averageLatency}ms promedio
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(endpoint.cost)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Breakdown */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Uso por Usuario
              </CardTitle>
              <CardDescription>
                Desglose de consumo por miembro del equipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.userBreakdown.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{user.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.requests} solicitudes • Último uso: {new Date(user.lastUsed).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(user.cost)}</p>
                      <p className="text-sm text-muted-foreground">
                        {((user.cost / data.userBreakdown.reduce((sum, u) => sum + u.cost, 0)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}