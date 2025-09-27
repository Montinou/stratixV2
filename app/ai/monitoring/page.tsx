import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CostDashboard } from "@/components/ai/cost-dashboard"
import { UsageMetrics } from "@/components/ai/usage-metrics"
import { BudgetManagement } from "@/components/ai/budget-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monitoreo de IA</h1>
            <p className="text-muted-foreground">
              Control integral de costos, uso y rendimiento de servicios de IA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getRateLimitBadgeVariant(rateLimitStatus.status)} className="flex items-center gap-1">
              {getRateLimitIcon(rateLimitStatus.status)}
              Rate Limit: {rateLimitStatus.currentRequests}/{rateLimitStatus.limit}
            </Badge>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Reporte
            </Button>
            {isAdmin && (
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Button>
            )}
          </div>
        </div>

        {/* Rate Limit Status Card */}
        {rateLimitStatus.status !== 'normal' && (
          <Card className={`border-${rateLimitStatus.status === 'exceeded' ? 'destructive' : 'warning'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRateLimitIcon(rateLimitStatus.status)}
                  <div>
                    <h4 className="font-semibold">
                      {rateLimitStatus.status === 'exceeded'
                        ? 'Límite de Solicitudes Excedido'
                        : 'Advertencia de Rate Limit'
                      }
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Has utilizado {rateLimitStatus.currentRequests} de {rateLimitStatus.limit} solicitudes permitidas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Reinicio: {new Date(rateLimitStatus.resetTime).toLocaleTimeString('es-ES')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rateLimitPercentage.toFixed(1)}% utilizado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Vista General
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Límites
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </DashboardLayout>
  )
}