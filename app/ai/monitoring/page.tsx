import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CostDashboard } from "@/components/ai/cost-dashboard"
import { UsageMetrics } from "@/components/ai/usage-metrics"
import { BudgetManagement } from "@/components/ai/budget-management"
import { CostExport } from "@/components/ai/cost-export"
import { AdminCostControl } from "@/components/ai/admin-cost-control"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Settings,
  Activity,
  Shield,
  Download,
  AlertTriangle,
  CheckCircle,
  Zap
} from "lucide-react"
import { getUserProfile } from "@/lib/database/services"

interface RateLimitStatus {
  currentRequests: number
  limit: number
  resetTime: string
  status: 'normal' | 'warning' | 'exceeded'
}

async function getRateLimitStatus(): Promise<RateLimitStatus> {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_BASE_URL + '/api/ai/rate-limit/status', {
      cache: 'no-store'
    })
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error("Error fetching rate limit status:", error)
  }

  return {
    currentRequests: 0,
    limit: 100,
    resetTime: new Date(Date.now() + 3600000).toISOString(),
    status: 'normal'
  }
}

export default async function AIMonitoringPage() {
  const user = await stackServerApp.getUser({ or: "redirect" })
  const profile = await getUserProfile(user.id)

  if (!profile) {
    redirect("/auth/signin")
  }

  const rateLimitStatus = await getRateLimitStatus()
  const isAdmin = profile.roleType === 'corporativo'

  const getRateLimitBadgeVariant = (status: string) => {
    switch (status) {
      case 'exceeded': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'default'
    }
  }

  const getRateLimitIcon = (status: string) => {
    switch (status) {
      case 'exceeded': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <TrendingUp className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const rateLimitPercentage = (rateLimitStatus.currentRequests / rateLimitStatus.limit) * 100

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Page Header */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monitoreo de IA</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Control integral de costos, uso y rendimiento de servicios de IA
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-3 sm:space-y-0">
            <Badge
              variant={getRateLimitBadgeVariant(rateLimitStatus.status)}
              className="flex items-center gap-1 w-fit"
            >
              {getRateLimitIcon(rateLimitStatus.status)}
              <span className="hidden sm:inline">Rate Limit:</span>
              <span className="sm:hidden">RL:</span>
              {rateLimitStatus.currentRequests}/{rateLimitStatus.limit}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar Reporte</span>
                <span className="sm:hidden">Exportar</span>
              </Button>
              {isAdmin && (
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Settings className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Configuración</span>
                  <span className="sm:hidden">Config</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Rate Limit Status Alert */}
        {rateLimitStatus.status !== 'normal' && (
          <Alert variant={rateLimitStatus.status === 'exceeded' ? 'destructive' : 'default'}>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-3">
                {getRateLimitIcon(rateLimitStatus.status)}
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">
                    {rateLimitStatus.status === 'exceeded'
                      ? 'Límite de Solicitudes Excedido'
                      : 'Advertencia de Rate Limit'
                    }
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Has utilizado {rateLimitStatus.currentRequests} de {rateLimitStatus.limit} solicitudes permitidas.
                    {rateLimitStatus.status === 'exceeded'
                      ? ' El servicio está temporalmente suspendido.'
                      : ' Considera reducir el uso para evitar suspensiones.'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right space-y-1">
                  <p className="text-sm font-medium">
                    Reinicio: {new Date(rateLimitStatus.resetTime).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rateLimitPercentage.toFixed(1)}% utilizado
                  </p>
                </div>
                <Badge variant={getRateLimitBadgeVariant(rateLimitStatus.status)} className="shrink-0">
                  {rateLimitStatus.status === 'exceeded' ? 'BLOQUEADO' : 'ADVERTENCIA'}
                </Badge>
              </div>
            </div>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-3 md:grid-cols-5'} min-w-fit`}>
              <TabsTrigger value="overview" className="flex items-center gap-1 px-3">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Vista General</span>
                <span className="sm:hidden">General</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 px-3">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Análisis</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-1 px-3">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Presupuesto</span>
                <span className="sm:hidden">Budget</span>
              </TabsTrigger>
              <TabsTrigger value="limits" className="flex items-center gap-1 px-3">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Límites</span>
                <span className="sm:hidden">Limits</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-1 px-3">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Export</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="flex items-center gap-1 px-3">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <CostDashboard profile={profile} />

            <Separator />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rateLimitStatus.currentRequests}/{rateLimitStatus.limit}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rateLimitPercentage.toFixed(1)}% utilizado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Operativo</div>
                  <p className="text-xs text-muted-foreground">
                    Todos los servicios funcionando
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reinicio Rate Limit</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(rateLimitStatus.resetTime).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Próximo reinicio
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Sin alertas pendientes
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <UsageMetrics profile={profile} />
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            <BudgetManagement profile={profile} isAdmin={isAdmin} />
          </TabsContent>

          {/* Rate Limits Tab */}
          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Control de Rate Limiting
                </CardTitle>
                <CardDescription>
                  Gestión de límites de solicitudes y quotas por usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Rate Limit Status */}
                <div className="space-y-4">
                  <h4 className="font-medium">Estado Actual</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Solicitudes Realizadas</p>
                      <p className="text-2xl font-bold">{rateLimitStatus.currentRequests}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Límite Máximo</p>
                      <p className="text-2xl font-bold">{rateLimitStatus.limit}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Solicitudes Disponibles</p>
                      <p className="text-2xl font-bold">{rateLimitStatus.limit - rateLimitStatus.currentRequests}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Rate Limit Rules by Role */}
                <div className="space-y-4">
                  <h4 className="font-medium">Límites por Rol</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Empleado</p>
                        <p className="text-sm text-muted-foreground">Rol básico</p>
                      </div>
                      <Badge variant="outline">5 solicitudes/minuto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Gerente</p>
                        <p className="text-sm text-muted-foreground">Rol intermedio</p>
                      </div>
                      <Badge variant="outline">20 solicitudes/minuto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Corporativo</p>
                        <p className="text-sm text-muted-foreground">Rol administrativo</p>
                      </div>
                      <Badge variant="outline">100 solicitudes/minuto</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Emergency Controls (Admin Only) */}
                {isAdmin && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Controles de Emergencia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="justify-start">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Suspender Usuario
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Shield className="mr-2 h-4 w-4" />
                        Resetear Límites
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Límites
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Activity className="mr-2 h-4 w-4" />
                        Ver Logs de Rate Limit
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <CostExport profile={profile} />
          </TabsContent>

          {/* Admin Tab */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <AdminCostControl profile={profile} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}