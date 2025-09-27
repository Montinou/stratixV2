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
  Settings,
  DollarSign,
  AlertTriangle,
  Bell,
  Shield,
  Edit,
  Save,
  X,
  Mail,
  Slack,
  Plus,
  Trash2
} from "lucide-react"
import { useState, useEffect } from "react"
import type { Profile } from "@/lib/database/services"

interface BudgetConfig {
  dailyLimit: number
  monthlyLimit: number
  emergencyThreshold: number
  warningThreshold: number
  alertsEnabled: boolean
  autoStopEnabled: boolean
  notificationChannels: string[]
  customRules: Array<{
    id: string
    name: string
    condition: string
    action: string
    enabled: boolean
  }>
}

interface BudgetStatus {
  currentDailySpend: number
  currentMonthlySpend: number
  projectedMonthlySpend: number
  daysLeftInMonth: number
  isOverBudget: boolean
  alertsTriggered: string[]
}

interface BudgetManagementProps {
  profile: Profile
  className?: string
  isAdmin?: boolean
}

export function BudgetManagement({ profile, className, isAdmin = false }: BudgetManagementProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<BudgetConfig>({
    dailyLimit: 500, // $5.00
    monthlyLimit: 10000, // $100.00
    emergencyThreshold: 90,
    warningThreshold: 80,
    alertsEnabled: true,
    autoStopEnabled: true,
    notificationChannels: ['email'],
    customRules: []
  })
  const [status, setStatus] = useState<BudgetStatus>({
    currentDailySpend: 0,
    currentMonthlySpend: 0,
    projectedMonthlySpend: 0,
    daysLeftInMonth: 30,
    isOverBudget: false,
    alertsTriggered: []
  })
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)

  const fetchBudgetData = async () => {
    setLoading(true)
    try {
      const [configResponse, statusResponse] = await Promise.all([
        fetch('/api/ai/budget/config'),
        fetch('/api/ai/budget/status')
      ])

      if (configResponse.ok) {
        const configData = await configResponse.json()
        setConfig(configData)
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setStatus(statusData)
      }
    } catch (error) {
      console.error("Error fetching budget data:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveBudgetConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/ai/budget/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        setShowEditDialog(false)
        await fetchBudgetData()
      }
    } catch (error) {
      console.error("Error saving budget config:", error)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchBudgetData()
  }, [profile])

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100)
  }

  const dailyProgress = (status.currentDailySpend / config.dailyLimit) * 100
  const monthlyProgress = (status.currentMonthlySpend / config.monthlyLimit) * 100

  const getProgressColor = (percentage: number) => {
    if (percentage >= config.emergencyThreshold) return "bg-red-500"
    if (percentage >= config.warningThreshold) return "bg-yellow-500"
    return "bg-green-500"
  }

  const addCustomRule = () => {
    setEditingRule({
      id: '',
      name: '',
      condition: '',
      action: '',
      enabled: true
    })
    setShowRuleDialog(true)
  }

  const saveCustomRule = () => {
    if (editingRule?.id) {
      // Update existing rule
      setConfig(prev => ({
        ...prev,
        customRules: prev.customRules.map(rule =>
          rule.id === editingRule.id ? editingRule : rule
        )
      }))
    } else {
      // Add new rule
      const newRule = {
        ...editingRule,
        id: Date.now().toString()
      }
      setConfig(prev => ({
        ...prev,
        customRules: [...prev.customRules, newRule]
      }))
    }
    setShowRuleDialog(false)
    setEditingRule(null)
  }

  const deleteCustomRule = (ruleId: string) => {
    setConfig(prev => ({
      ...prev,
      customRules: prev.customRules.filter(rule => rule.id !== ruleId)
    }))
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
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Presupuesto</h2>
          <p className="text-muted-foreground">
            Configura límites y alertas para controlar el gasto en IA
          </p>
        </div>
        {isAdmin && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Configuración de Presupuesto</DialogTitle>
                <DialogDescription>
                  Establece límites y configuraciones de alertas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Budget Limits */}
                <div className="space-y-4">
                  <h4 className="font-medium">Límites de Presupuesto</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyLimit">Límite Diario (USD)</Label>
                      <Input
                        id="dailyLimit"
                        type="number"
                        step="0.01"
                        value={config.dailyLimit / 100}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dailyLimit: Math.round(parseFloat(e.target.value) * 100)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyLimit">Límite Mensual (USD)</Label>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        step="0.01"
                        value={config.monthlyLimit / 100}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          monthlyLimit: Math.round(parseFloat(e.target.value) * 100)
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Alert Thresholds */}
                <div className="space-y-4">
                  <h4 className="font-medium">Umbrales de Alerta</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="warningThreshold">Umbral de Advertencia (%)</Label>
                      <Input
                        id="warningThreshold"
                        type="number"
                        min="0"
                        max="100"
                        value={config.warningThreshold}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          warningThreshold: parseInt(e.target.value)
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
                        value={config.emergencyThreshold}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          emergencyThreshold: parseInt(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Automation Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium">Automatización</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="alertsEnabled">Alertas Habilitadas</Label>
                        <p className="text-sm text-muted-foreground">
                          Enviar notificaciones cuando se alcancen umbrales
                        </p>
                      </div>
                      <Switch
                        id="alertsEnabled"
                        checked={config.alertsEnabled}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          alertsEnabled: checked
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoStopEnabled">Parada Automática</Label>
                        <p className="text-sm text-muted-foreground">
                          Detener servicios al alcanzar el umbral de emergencia
                        </p>
                      </div>
                      <Switch
                        id="autoStopEnabled"
                        checked={config.autoStopEnabled}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          autoStopEnabled: checked
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Channels */}
                <div className="space-y-4">
                  <h4 className="font-medium">Canales de Notificación</h4>
                  <div className="space-y-2">
                    {['email', 'slack', 'webhook'].map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={channel}
                          checked={config.notificationChannels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig(prev => ({
                                ...prev,
                                notificationChannels: [...prev.notificationChannels, channel]
                              }))
                            } else {
                              setConfig(prev => ({
                                ...prev,
                                notificationChannels: prev.notificationChannels.filter(c => c !== channel)
                              }))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={channel} className="capitalize">
                          {channel === 'email' ? 'Email' : channel === 'slack' ? 'Slack' : 'Webhook'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveBudgetConfig} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Budget Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Presupuesto Diario
            </CardTitle>
            <CardDescription>
              Gasto actual vs límite diario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilizado</span>
                <span className="font-medium">
                  {formatCurrency(status.currentDailySpend)} / {formatCurrency(config.dailyLimit)}
                </span>
              </div>
              <Progress
                value={dailyProgress}
                className="h-2"
                indicatorClassName={getProgressColor(dailyProgress)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>{dailyProgress.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
            {dailyProgress >= config.warningThreshold && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                {dailyProgress >= config.emergencyThreshold ? 'Límite de emergencia alcanzado' : 'Cerca del límite diario'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Presupuesto Mensual
            </CardTitle>
            <CardDescription>
              Gasto actual vs límite mensual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilizado</span>
                <span className="font-medium">
                  {formatCurrency(status.currentMonthlySpend)} / {formatCurrency(config.monthlyLimit)}
                </span>
              </div>
              <Progress
                value={monthlyProgress}
                className="h-2"
                indicatorClassName={getProgressColor(monthlyProgress)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>{monthlyProgress.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Proyección fin de mes: {formatCurrency(status.projectedMonthlySpend)}
            </div>
            {monthlyProgress >= config.warningThreshold && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                {monthlyProgress >= config.emergencyThreshold ? 'Límite de emergencia alcanzado' : 'Cerca del límite mensual'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuración de Alertas
          </CardTitle>
          <CardDescription>
            Estado actual de alertas y configuraciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Alertas</Label>
              <Badge variant={config.alertsEnabled ? "default" : "secondary"}>
                {config.alertsEnabled ? "Habilitadas" : "Deshabilitadas"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Parada Automática</Label>
              <Badge variant={config.autoStopEnabled ? "default" : "secondary"}>
                {config.autoStopEnabled ? "Habilitada" : "Deshabilitada"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Canales</Label>
              <div className="flex gap-1">
                {config.notificationChannels.map((channel) => (
                  <Badge key={channel} variant="outline" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Alertas Activas</h4>
            {status.alertsTriggered.length > 0 ? (
              <div className="space-y-2">
                {status.alertsTriggered.map((alert, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">{alert}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay alertas activas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Rules (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Reglas Personalizadas
              </div>
              <Button onClick={addCustomRule} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Regla
              </Button>
            </CardTitle>
            <CardDescription>
              Configura reglas avanzadas de control de costos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config.customRules.length > 0 ? (
              <div className="space-y-3">
                {config.customRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.condition} → {rule.action}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Activa" : "Inactiva"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule)
                          setShowRuleDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCustomRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay reglas personalizadas configuradas</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id ? "Editar Regla" : "Nueva Regla Personalizada"}
            </DialogTitle>
            <DialogDescription>
              Define condiciones y acciones para control automático de costos
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Nombre de la Regla</Label>
                <Input
                  id="ruleName"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Límite por modelo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleCondition">Condición</Label>
                <Textarea
                  id="ruleCondition"
                  value={editingRule.condition}
                  onChange={(e) => setEditingRule(prev => ({ ...prev, condition: e.target.value }))}
                  placeholder="Ej: Si gasto en GPT-4 > $10/día"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleAction">Acción</Label>
                <Textarea
                  id="ruleAction"
                  value={editingRule.action}
                  onChange={(e) => setEditingRule(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="Ej: Cambiar a modelo más barato"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ruleEnabled"
                  checked={editingRule.enabled}
                  onCheckedChange={(checked) => setEditingRule(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="ruleEnabled">Regla habilitada</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCustomRule}>
              Guardar Regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}