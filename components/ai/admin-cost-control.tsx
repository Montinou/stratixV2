"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Shield,
  DollarSign,
  Users,
  Settings,
  AlertTriangle,
  Ban,
  Play,
  Pause,
  Trash2,
  Edit,
  Save,
  RefreshCw,
  TrendingUp,
  Activity,
  Zap,
  Crown,
  UserX,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useState, useEffect } from "react"
import type { Profile } from "@/lib/database/services"

interface OrganizationBudget {
  id: string
  companyName: string
  dailyLimit: number
  monthlyLimit: number
  currentDailySpend: number
  currentMonthlySpend: number
  status: 'active' | 'suspended' | 'warning'
  userCount: number
  lastActivity: string
}

interface UserQuota {
  id: string
  userName: string
  email: string
  role: string
  requestsToday: number
  requestsThisMonth: number
  dailyLimit: number
  monthlyLimit: number
  status: 'active' | 'suspended' | 'limited'
  costToday: number
  costThisMonth: number
  lastActivity: string
}

interface SystemSettings {
  globalRateLimit: number
  emergencyStopThreshold: number
  autoSuspendUsers: boolean
  maxCostPerRequest: number
  allowedModels: string[]
  maintenanceMode: boolean
  alertWebhook: string
}

interface AdminCostControlProps {
  profile: Profile
  className?: string
}

export function AdminCostControl({ profile, className }: AdminCostControlProps) {
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<OrganizationBudget[]>([])
  const [users, setUsers] = useState<UserQuota[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    globalRateLimit: 1000,
    emergencyStopThreshold: 95,
    autoSuspendUsers: true,
    maxCostPerRequest: 100,
    allowedModels: ['gpt-4o-mini', 'claude-3-haiku'],
    maintenanceMode: false,
    alertWebhook: ''
  })
  const [selectedTab, setSelectedTab] = useState("organizations")
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const [orgsResponse, usersResponse, settingsResponse] = await Promise.all([
        fetch('/api/admin/ai/organizations'),
        fetch('/api/admin/ai/users'),
        fetch('/api/admin/ai/settings')
      ])

      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json()
        setOrganizations(orgsData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSystemSettings(settingsData)
      }
    } catch (error) {
      console.error("Error fetching admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile.roleType === 'corporativo') {
      fetchAdminData()
    }
  }, [profile])

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Activo</Badge>
      case 'suspended': return <Badge variant="destructive">Suspendido</Badge>
      case 'warning': return <Badge variant="secondary">Advertencia</Badge>
      case 'limited': return <Badge variant="outline">Limitado</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'limited': return <Pause className="h-4 w-4 text-blue-500" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const suspendOrganization = async (orgId: string) => {
    try {
      await fetch(`/api/admin/ai/organizations/${orgId}/suspend`, { method: 'POST' })
      await fetchAdminData()
    } catch (error) {
      console.error("Error suspending organization:", error)
    }
  }

  const suspendUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/ai/users/${userId}/suspend`, { method: 'POST' })
      await fetchAdminData()
    } catch (error) {
      console.error("Error suspending user:", error)
    }
  }

  const updateSystemSettings = async () => {
    try {
      await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      })
      setShowSettingsDialog(false)
    } catch (error) {
      console.error("Error updating system settings:", error)
    }
  }

  if (profile.roleType !== 'corporativo') {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            Solo los usuarios con rol corporativo pueden acceder al panel de control administrativo.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6" />
            Control Administrativo
          </h2>
          <p className="text-muted-foreground">
            Gestión avanzada de costos, usuarios y configuraciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configuración del Sistema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Configuración del Sistema</DialogTitle>
                <DialogDescription>
                  Configuraciones globales para el control de costos de IA
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalRateLimit">Rate Limit Global (req/min)</Label>
                    <Input
                      id="globalRateLimit"
                      type="number"
                      value={systemSettings.globalRateLimit}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        globalRateLimit: parseInt(e.target.value)
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyThreshold">Umbral de Emergencia (%)</Label>
                    <Input
                      id="emergencyThreshold"
                      type="number"
                      min="0"
                      max="100"
                      value={systemSettings.emergencyStopThreshold}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        emergencyStopThreshold: parseInt(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoSuspend">Suspensión Automática</Label>
                    <Switch
                      id="autoSuspend"
                      checked={systemSettings.autoSuspendUsers}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        autoSuspendUsers: checked
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maintenanceMode">Modo Mantenimiento</Label>
                    <Switch
                      id="maintenanceMode"
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        maintenanceMode: checked
                      }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={updateSystemSettings}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchAdminData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizaciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">
              {organizations.filter(o => o.status === 'active').length} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.status === 'active').length} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(organizations.reduce((sum, org) => sum + org.currentDailySpend, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas las organizaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemSettings.maintenanceMode ? 'Mantenimiento' : 'Operativo'}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los servicios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organizations">Organizaciones</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="alerts">Alertas y Logs</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Organizaciones</CardTitle>
              <CardDescription>
                Control de presupuestos y límites por organización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Gasto Diario</TableHead>
                    <TableHead>Límite Mensual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            Última actividad: {new Date(org.lastActivity).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{org.userCount}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(org.currentDailySpend)}</p>
                          <p className="text-sm text-muted-foreground">
                            / {formatCurrency(org.dailyLimit)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(org.currentMonthlySpend)}</p>
                          <Progress
                            value={(org.currentMonthlySpend / org.monthlyLimit) * 100}
                            className="h-2 mt-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {org.status === 'active' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspender Organización</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de que quieres suspender a {org.companyName}?
                                    Esto bloqueará todas las solicitudes de IA para esta organización.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => suspendOrganization(org.id)}>
                                    Suspender
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Control individual de cuotas y límites de usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Uso Hoy</TableHead>
                    <TableHead>Costo Mes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.userName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.requestsToday} reqs</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(user.costToday)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(user.costThisMonth)}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.requestsThisMonth} solicitudes
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.status === 'active' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspender Usuario</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de que quieres suspender a {user.userName}?
                                    El usuario no podrá realizar más solicitudes de IA.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => suspendUser(user.id)}>
                                    Suspender
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas del Sistema</CardTitle>
              <CardDescription>
                Monitoreo de eventos y alertas de seguridad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded bg-red-50 border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">Límite de emergencia alcanzado</p>
                    <p className="text-sm text-muted-foreground">
                      Organización "TechCorp" superó el 95% de su presupuesto mensual
                    </p>
                  </div>
                  <Badge variant="destructive">Crítico</Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded bg-yellow-50 border-yellow-200">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">Rate limit frecuente</p>
                    <p className="text-sm text-muted-foreground">
                      Usuario juan@empresa.com alcanzó límite 5 veces en la última hora
                    </p>
                  </div>
                  <Badge variant="secondary">Advertencia</Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Sistema operativo</p>
                    <p className="text-sm text-muted-foreground">
                      Todos los servicios funcionando correctamente
                    </p>
                  </div>
                  <Badge className="bg-green-500">Normal</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}