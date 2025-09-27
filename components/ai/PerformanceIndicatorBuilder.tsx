"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  TrendingUp,
  Target,
  Calculator,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"

interface PerformanceIndicator {
  id: string
  name: string
  description: string
  category: "financial" | "operational" | "customer" | "learning" | "quality" | "efficiency"
  type: "ratio" | "percentage" | "count" | "amount" | "score" | "time"
  formula: string
  unit: string
  targetValue: number
  currentValue: number
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  trend: "higher_better" | "lower_better" | "target_range"
  thresholds: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  aiSuggestions?: {
    improvements: string[]
    benchmarks: string[]
    relatedKPIs: string[]
  }
  isActive: boolean
  lastUpdated?: Date
}

interface PerformanceIndicatorBuilderProps {
  department?: string
  industry?: string
  objectives?: any[]
  onIndicatorsChange: (indicators: PerformanceIndicator[]) => void
  className?: string
}

interface IndicatorFormData {
  name: string
  description: string
  category: PerformanceIndicator["category"]
  type: PerformanceIndicator["type"]
  formula: string
  unit: string
  targetValue: number
  currentValue: number
  frequency: PerformanceIndicator["frequency"]
  trend: PerformanceIndicator["trend"]
  thresholds: PerformanceIndicator["thresholds"]
}

const categoryIcons = {
  financial: TrendingUp,
  operational: BarChart3,
  customer: Target,
  learning: Lightbulb,
  quality: CheckCircle,
  efficiency: Calculator,
}

const categoryColors = {
  financial: "text-green-500",
  operational: "text-blue-500",
  customer: "text-purple-500",
  learning: "text-orange-500",
  quality: "text-emerald-500",
  efficiency: "text-cyan-500",
}

const typeDescriptions = {
  ratio: "Relación entre dos valores (ej: ROI)",
  percentage: "Porcentaje o tasa (ej: Churn Rate)",
  count: "Cantidad absoluta (ej: Número de clientes)",
  amount: "Valor monetario (ej: Ingresos)",
  score: "Puntuación o calificación (ej: NPS)",
  time: "Duración o tiempo (ej: Tiempo de respuesta)",
}

export function PerformanceIndicatorBuilder({
  department = "",
  industry = "",
  objectives = [],
  onIndicatorsChange,
  className,
}: PerformanceIndicatorBuilderProps) {
  const [indicators, setIndicators] = useState<PerformanceIndicator[]>([])
  const [editingIndicator, setEditingIndicator] = useState<PerformanceIndicator | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Update parent when indicators change
  useEffect(() => {
    onIndicatorsChange(indicators)
  }, [indicators, onIndicatorsChange])

  // Generate AI suggestions for KPIs
  const generateAISuggestions = async (formData: Partial<IndicatorFormData>) => {
    if (!formData.name || !formData.category) return null

    setIsLoadingAI(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock AI suggestions based on category and context
      const suggestions = {
        improvements: generateImprovementSuggestions(formData.category!),
        benchmarks: generateBenchmarkSuggestions(formData.category!, industry),
        relatedKPIs: generateRelatedKPIs(formData.category!),
      }

      return suggestions
    } catch (error) {
      console.error("Error generating AI suggestions:", error)
      return null
    } finally {
      setIsLoadingAI(false)
    }
  }

  const generateImprovementSuggestions = (category: PerformanceIndicator["category"]): string[] => {
    const suggestions: Record<string, string[]> = {
      financial: [
        "Implementar análisis de varianza mensual",
        "Establecer alertas automáticas para desviaciones >10%",
        "Crear dashboard en tiempo real para seguimiento"
      ],
      operational: [
        "Automatizar la recolección de datos",
        "Implementar benchmarking con industria",
        "Crear reportes semanales automatizados"
      ],
      customer: [
        "Segmentar métricas por tipo de cliente",
        "Implementar encuestas automáticas post-interacción",
        "Crear análisis de cohortes para retención"
      ],
      learning: [
        "Conectar con métricas de performance individual",
        "Implementar seguimiento de skill gaps",
        "Crear planes de desarrollo personalizados"
      ],
      quality: [
        "Implementar control estadístico de procesos",
        "Establecer métricas leading vs lagging",
        "Crear sistema de feedback en tiempo real"
      ],
      efficiency: [
        "Implementar medición de ciclo completo",
        "Establecer métricas de waste reduction",
        "Crear análisis de cuellos de botella"
      ]
    }

    return suggestions[category] || []
  }

  const generateBenchmarkSuggestions = (category: PerformanceIndicator["category"], ind: string): string[] => {
    const benchmarks: Record<string, string[]> = {
      financial: [
        "ROI promedio industria: 15-25%",
        "Margen bruto típico: 60-80%",
        "Crecimiento anual: 20-40%"
      ],
      operational: [
        "Uptime objetivo: 99.9%",
        "Eficiencia operativa: 85-95%",
        "Tiempo de ciclo: -20% anual"
      ],
      customer: [
        "NPS excelente: >50",
        "Churn rate SaaS: <5% mensual",
        "CSAT objetivo: >4.5/5"
      ],
      learning: [
        "Horas capacitación/año: 40-80h",
        "Skill assessment: >80% competencia",
        "Certificaciones: 2-3 por año"
      ],
      quality: [
        "Defect rate: <0.1%",
        "First-pass yield: >95%",
        "Customer complaints: <1%"
      ],
      efficiency: [
        "Process efficiency: >90%",
        "Resource utilization: 80-85%",
        "Cycle time reduction: 15% anual"
      ]
    }

    return benchmarks[category] || []
  }

  const generateRelatedKPIs = (category: PerformanceIndicator["category"]): string[] => {
    const related: Record<string, string[]> = {
      financial: ["Revenue Growth", "Profit Margin", "Cash Flow", "ROI", "EBITDA"],
      operational: ["Throughput", "Capacity Utilization", "Downtime", "Efficiency Ratio"],
      customer: ["NPS", "CSAT", "Churn Rate", "LTV", "Retention Rate"],
      learning: ["Training Hours", "Skill Level", "Certification Rate", "Knowledge Sharing"],
      quality: ["Defect Rate", "First Pass Yield", "Customer Complaints", "Rework Rate"],
      efficiency: ["Cycle Time", "Process Efficiency", "Resource Utilization", "Waste Reduction"]
    }

    return related[category] || []
  }

  // Add indicator
  const addIndicator = async (formData: IndicatorFormData) => {
    const aiSuggestions = await generateAISuggestions(formData)

    const newIndicator: PerformanceIndicator = {
      id: Date.now().toString(),
      ...formData,
      aiSuggestions,
      isActive: true,
      lastUpdated: new Date(),
    }

    setIndicators(prev => [...prev, newIndicator])
    setIsDialogOpen(false)
    toast({
      title: "KPI agregado",
      description: `${formData.name} ha sido agregado exitosamente`,
    })
  }

  // Update indicator
  const updateIndicator = async (formData: IndicatorFormData) => {
    if (!editingIndicator) return

    const aiSuggestions = await generateAISuggestions(formData)

    setIndicators(prev => prev.map(indicator =>
      indicator.id === editingIndicator.id
        ? { ...indicator, ...formData, aiSuggestions, lastUpdated: new Date() }
        : indicator
    ))

    setEditingIndicator(null)
    setIsDialogOpen(false)
    toast({
      title: "KPI actualizado",
      description: `${formData.name} ha sido actualizado exitosamente`,
    })
  }

  // Delete indicator
  const deleteIndicator = (id: string) => {
    setIndicators(prev => prev.filter(indicator => indicator.id !== id))
    toast({
      title: "KPI eliminado",
      description: "El indicador ha sido eliminado exitosamente",
    })
  }

  // Toggle indicator active status
  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(indicator =>
      indicator.id === id
        ? { ...indicator, isActive: !indicator.isActive }
        : indicator
    ))
  }

  // Calculate performance status
  const getPerformanceStatus = (indicator: PerformanceIndicator) => {
    const { currentValue, thresholds, trend } = indicator

    if (trend === "higher_better") {
      if (currentValue >= thresholds.excellent) return { status: "excellent", color: "text-green-600" }
      if (currentValue >= thresholds.good) return { status: "good", color: "text-blue-600" }
      if (currentValue >= thresholds.fair) return { status: "fair", color: "text-yellow-600" }
      return { status: "poor", color: "text-red-600" }
    } else if (trend === "lower_better") {
      if (currentValue <= thresholds.excellent) return { status: "excellent", color: "text-green-600" }
      if (currentValue <= thresholds.good) return { status: "good", color: "text-blue-600" }
      if (currentValue <= thresholds.fair) return { status: "fair", color: "text-yellow-600" }
      return { status: "poor", color: "text-red-600" }
    }

    return { status: "fair", color: "text-gray-600" }
  }

  const IndicatorCard = ({ indicator }: { indicator: PerformanceIndicator }) => {
    const CategoryIcon = categoryIcons[indicator.category]
    const categoryColor = categoryColors[indicator.category]
    const performance = getPerformanceStatus(indicator)
    const progress = indicator.trend === "higher_better"
      ? (indicator.currentValue / indicator.targetValue) * 100
      : indicator.targetValue > 0 ? (indicator.targetValue / Math.max(indicator.currentValue, indicator.targetValue)) * 100 : 0

    return (
      <Card className={cn("h-full", !indicator.isActive && "opacity-60")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-md bg-background border", categoryColor)}>
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{indicator.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {indicator.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {indicator.frequency}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Switch
                checked={indicator.isActive}
                onCheckedChange={() => toggleIndicator(indicator.id)}
                size="sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingIndicator(indicator)
                  setIsDialogOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteIndicator(indicator.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {indicator.description && (
            <CardDescription className="text-sm">
              {indicator.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Current Value and Target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className={cn("text-2xl font-bold", performance.color)}>
                {indicator.currentValue.toLocaleString()} {indicator.unit}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Objetivo</div>
                <div className="text-sm font-medium">
                  {indicator.targetValue.toLocaleString()} {indicator.unit}
                </div>
              </div>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className={performance.color}>
                {performance.status === "excellent" && "Excelente"}
                {performance.status === "good" && "Bueno"}
                {performance.status === "fair" && "Regular"}
                {performance.status === "poor" && "Pobre"}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}% del objetivo</span>
            </div>
          </div>

          {/* Formula */}
          {indicator.formula && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Fórmula</Label>
              <div className="text-xs bg-muted p-2 rounded font-mono">
                {indicator.formula}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {indicator.aiSuggestions && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Sugerencias IA</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {indicator.aiSuggestions.improvements[0]}
              </div>
            </div>
          )}

          {/* Thresholds */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Umbrales de Performance</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-1 bg-green-100 rounded">
                      <div className="text-xs font-medium text-green-800">Exc</div>
                      <div className="text-xs text-green-600">{indicator.thresholds.excellent}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Excelente: {indicator.thresholds.excellent}+</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-1 bg-blue-100 rounded">
                      <div className="text-xs font-medium text-blue-800">Bue</div>
                      <div className="text-xs text-blue-600">{indicator.thresholds.good}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bueno: {indicator.thresholds.good}+</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-1 bg-yellow-100 rounded">
                      <div className="text-xs font-medium text-yellow-800">Reg</div>
                      <div className="text-xs text-yellow-600">{indicator.thresholds.fair}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Regular: {indicator.thresholds.fair}+</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-1 bg-red-100 rounded">
                      <div className="text-xs font-medium text-red-800">Pob</div>
                      <div className="text-xs text-red-600">{indicator.thresholds.poor}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pobre: menos de {indicator.thresholds.poor}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Constructor de KPIs</Label>
          <p className="text-xs text-muted-foreground">
            Crea y gestiona indicadores de rendimiento con asistencia IA
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => setEditingIndicator(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo KPI
            </Button>
          </DialogTrigger>
          <IndicatorDialog
            indicator={editingIndicator}
            isLoadingAI={isLoadingAI}
            onSave={editingIndicator ? updateIndicator : addIndicator}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingIndicator(null)
            }}
          />
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {indicators.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay KPIs definidos</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comienza creando tu primer indicador de rendimiento
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer KPI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicators.map((indicator) => (
                <IndicatorCard key={indicator.id} indicator={indicator} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="space-y-6">
            {Object.entries(categoryIcons).map(([category, Icon]) => {
              const categoryIndicators = indicators.filter(i => i.category === category)
              if (categoryIndicators.length === 0) return null

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn("h-5 w-5", categoryColors[category as keyof typeof categoryColors])} />
                    <h3 className="text-lg font-semibold capitalize">{category}</h3>
                    <Badge variant="outline">{categoryIndicators.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryIndicators.map((indicator) => (
                      <IndicatorCard key={indicator.id} indicator={indicator} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Análisis Avanzado</h3>
              <p className="text-muted-foreground text-center">
                Próximamente: análisis de correlaciones, tendencias y predicciones IA
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Indicator Dialog Component
function IndicatorDialog({
  indicator,
  isLoadingAI,
  onSave,
  onCancel,
}: {
  indicator: PerformanceIndicator | null
  isLoadingAI: boolean
  onSave: (formData: IndicatorFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<IndicatorFormData>({
    name: indicator?.name || "",
    description: indicator?.description || "",
    category: indicator?.category || "operational",
    type: indicator?.type || "percentage",
    formula: indicator?.formula || "",
    unit: indicator?.unit || "%",
    targetValue: indicator?.targetValue || 0,
    currentValue: indicator?.currentValue || 0,
    frequency: indicator?.frequency || "monthly",
    trend: indicator?.trend || "higher_better",
    thresholds: indicator?.thresholds || {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 0,
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave(formData)
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {indicator ? "Editar KPI" : "Nuevo KPI"}
        </DialogTitle>
        <DialogDescription>
          Define un indicador de rendimiento específico y medible
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del KPI *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Net Promoter Score"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.category}
              onValueChange={(value: PerformanceIndicator["category"]) =>
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial">Financiero</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="learning">Aprendizaje</SelectItem>
                <SelectItem value="quality">Calidad</SelectItem>
                <SelectItem value="efficiency">Eficiencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe qué mide este indicador y por qué es importante"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: PerformanceIndicator["type"]) =>
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeDescriptions).map(([key, description]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium capitalize">{key}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidad</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              placeholder="%, $, puntos, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frecuencia</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value: PerformanceIndicator["frequency"]) =>
                setFormData(prev => ({ ...prev, frequency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="formula">Fórmula (opcional)</Label>
          <Input
            id="formula"
            value={formData.formula}
            onChange={(e) => setFormData(prev => ({ ...prev, formula: e.target.value }))}
            placeholder="Ej: (Promoters - Detractors) / Total Responses * 100"
            className="font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentValue">Valor Actual</Label>
            <Input
              id="currentValue"
              type="number"
              value={formData.currentValue}
              onChange={(e) => setFormData(prev => ({ ...prev, currentValue: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">Valor Objetivo</Label>
            <Input
              id="targetValue"
              type="number"
              value={formData.targetValue}
              onChange={(e) => setFormData(prev => ({ ...prev, targetValue: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tendencia</Label>
          <Select
            value={formData.trend}
            onValueChange={(value: PerformanceIndicator["trend"]) =>
              setFormData(prev => ({ ...prev, trend: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="higher_better">Más alto es mejor</SelectItem>
              <SelectItem value="lower_better">Más bajo es mejor</SelectItem>
              <SelectItem value="target_range">Rango objetivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Umbrales de Performance</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-green-600">Excelente</Label>
              <Input
                type="number"
                value={formData.thresholds.excellent}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    excellent: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-blue-600">Bueno</Label>
              <Input
                type="number"
                value={formData.thresholds.good}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    good: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-yellow-600">Regular</Label>
              <Input
                type="number"
                value={formData.thresholds.fair}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    fair: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-red-600">Pobre</Label>
              <Input
                type="number"
                value={formData.thresholds.poor}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    poor: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
          </div>
        </div>

        {isLoadingAI && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Generando sugerencias IA...
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formData.name.trim() || isLoadingAI}>
            {indicator ? "Actualizar" : "Crear"} KPI
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}