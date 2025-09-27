"use client"

import { useState, useEffect } from "react"
import {
  Lightbulb,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  ChevronRight,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ImprovementSuggestion {
  id: string
  title: string
  description: string
  category: "content" | "structure" | "metrics" | "strategy" | "engagement" | "efficiency"
  priority: "high" | "medium" | "low"
  impact: "high" | "medium" | "low"
  effort: "low" | "medium" | "high"
  confidence: number
  reason: string
  implementation: {
    steps: string[]
    timeEstimate: string
    resources: string[]
  }
  before?: string
  after?: string
  metrics?: {
    name: string
    expectedImprovement: string
  }[]
  examples?: string[]
  relatedFields?: string[]
}

interface ImprovementSuggestionsProps {
  formData: Record<string, any>
  context?: any
  onApplySuggestion?: (suggestion: ImprovementSuggestion) => void
  onDismissSuggestion?: (suggestionId: string) => void
  onFeedback?: (suggestionId: string, helpful: boolean) => void
  onRefresh?: () => void
  className?: string
}

const categoryIcons = {
  content: Lightbulb,
  structure: BarChart3,
  metrics: TrendingUp,
  strategy: Target,
  engagement: Users,
  efficiency: Zap,
}

const categoryColors = {
  content: "text-blue-500",
  structure: "text-purple-500",
  metrics: "text-green-500",
  strategy: "text-orange-500",
  engagement: "text-pink-500",
  efficiency: "text-cyan-500",
}

const priorityColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
}

const impactColors = {
  high: "text-green-600",
  medium: "text-yellow-600",
  low: "text-gray-600",
}

const effortColors = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
}

export function ImprovementSuggestions({
  formData,
  context,
  onApplySuggestion,
  onDismissSuggestion,
  onFeedback,
  onRefresh,
  className,
}: ImprovementSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Generate suggestions when form data changes
  useEffect(() => {
    generateSuggestions()
  }, [formData])

  const generateSuggestions = async () => {
    setIsLoading(true)
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500))

      const generatedSuggestions = await analyzeFormAndGenerateSuggestions(formData, context)
      setSuggestions(generatedSuggestions)
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(suggestion => {
    if (dismissedSuggestions.has(suggestion.id)) return false
    if (selectedCategory !== "all" && suggestion.category !== selectedCategory) return false
    return true
  })

  // Group suggestions by priority
  const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.priority]) {
      acc[suggestion.priority] = []
    }
    acc[suggestion.priority].push(suggestion)
    return acc
  }, {} as Record<string, ImprovementSuggestion[]>)

  // Handle suggestion application
  const handleApplySuggestion = (suggestion: ImprovementSuggestion) => {
    setAppliedSuggestions(prev => new Set([...prev, suggestion.id]))
    onApplySuggestion?.(suggestion)
  }

  // Handle suggestion dismissal
  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    onDismissSuggestion?.(suggestionId)
  }

  // Calculate improvement score
  const improvementScore = suggestions.length > 0
    ? Math.round(((suggestions.length - filteredSuggestions.length) / suggestions.length) * 100)
    : 100

  const SuggestionCard = ({ suggestion }: { suggestion: ImprovementSuggestion }) => {
    const CategoryIcon = categoryIcons[suggestion.category]
    const categoryColor = categoryColors[suggestion.category]
    const isApplied = appliedSuggestions.has(suggestion.id)

    return (
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          isApplied && "border-green-200 bg-green-50"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn("p-2 rounded-md bg-background border", categoryColor)}>
                <CategoryIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm leading-tight">
                  {suggestion.title}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {suggestion.description}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Confianza de IA: {Math.round(suggestion.confidence * 100)}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismissSuggestion(suggestion.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            <Badge
              variant="outline"
              className={cn("text-xs", priorityColors[suggestion.priority])}
            >
              {suggestion.priority === "high" && "Alta Prioridad"}
              {suggestion.priority === "medium" && "Media Prioridad"}
              {suggestion.priority === "low" && "Baja Prioridad"}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className={cn("h-3 w-3 mr-1", impactColors[suggestion.impact])} />
                    Impacto {suggestion.impact}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Impacto esperado: {suggestion.impact}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <Clock className={cn("h-3 w-3 mr-1", effortColors[suggestion.effort])} />
                    Esfuerzo {suggestion.effort}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Esfuerzo requerido: {suggestion.effort}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Reason */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Por qué:</strong> {suggestion.reason}
          </div>

          {/* Before/After */}
          {suggestion.before && suggestion.after && (
            <div className="space-y-2">
              <div className="text-xs">
                <div className="text-muted-foreground">Antes:</div>
                <div className="bg-red-50 p-2 rounded text-red-800 font-mono text-xs">
                  {suggestion.before}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-muted-foreground">Después:</div>
                <div className="bg-green-50 p-2 rounded text-green-800 font-mono text-xs">
                  {suggestion.after}
                </div>
              </div>
            </div>
          )}

          {/* Implementation Steps */}
          {suggestion.implementation.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Pasos de implementación:
              </div>
              <div className="space-y-1">
                {suggestion.implementation.steps.slice(0, 3).map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </div>
                    <span className="flex-1">{step}</span>
                  </div>
                ))}
                {suggestion.implementation.steps.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{suggestion.implementation.steps.length - 3} pasos más...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expected Metrics */}
          {suggestion.metrics && suggestion.metrics.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Mejoras esperadas:
              </div>
              <div className="space-y-1">
                {suggestion.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{metric.name}:</span>
                    <Badge variant="outline" className="text-xs">
                      {metric.expectedImprovement}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {suggestion.examples && suggestion.examples.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Ejemplos:
              </div>
              <div className="text-xs bg-blue-50 p-2 rounded">
                "{suggestion.examples[0]}"
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                ⏱️ {suggestion.implementation.timeEstimate}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isApplied && (
                <Button
                  size="sm"
                  onClick={() => handleApplySuggestion(suggestion)}
                  className="h-7 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Aplicar
                </Button>
              )}

              {isApplied && (
                <Badge variant="outline" className="text-xs text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aplicado
                </Badge>
              )}

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onFeedback?.(suggestion.id, true)}
                  className="h-6 w-6 p-0"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onFeedback?.(suggestion.id, false)}
                  className="h-6 w-6 p-0"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
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
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Sugerencias de Mejora</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Mejoras inteligentes basadas en tu contenido actual
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                Progreso de Optimización
              </span>
              <span className="text-sm font-bold text-primary">
                {improvementScore}%
              </span>
            </div>
            <Progress value={improvementScore} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {appliedSuggestions.size} de {suggestions.length} mejoras implementadas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="structure">Estructura</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-48">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-primary/10 rounded animate-pulse" />
                      <div className="h-3 bg-primary/10 rounded animate-pulse w-3/4" />
                      <div className="space-y-2">
                        <div className="h-2 bg-primary/10 rounded animate-pulse" />
                        <div className="h-2 bg-primary/10 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">¡Excelente trabajo!</h3>
                <p className="text-muted-foreground text-center">
                  No hay sugerencias de mejora disponibles en este momento.
                  Tu formulario se ve muy bien.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* High Priority */}
              {groupedSuggestions.high && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <h4 className="font-medium">Alta Prioridad</h4>
                    <Badge variant="outline">{groupedSuggestions.high.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedSuggestions.high.map((suggestion) => (
                      <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Priority */}
              {groupedSuggestions.medium && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <h4 className="font-medium">Media Prioridad</h4>
                    <Badge variant="outline">{groupedSuggestions.medium.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedSuggestions.medium.map((suggestion) => (
                      <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                </div>
              )}

              {/* Low Priority */}
              {groupedSuggestions.low && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <h4 className="font-medium">Baja Prioridad</h4>
                    <Badge variant="outline">{groupedSuggestions.low.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedSuggestions.low.map((suggestion) => (
                      <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Mock AI suggestion generation
async function analyzeFormAndGenerateSuggestions(
  formData: Record<string, any>,
  context?: any
): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = []

  // Analyze objective title
  if (formData.title && typeof formData.title === "string") {
    const title = formData.title.toLowerCase()

    // Check for SMART criteria
    if (!title.includes("aumentar") && !title.includes("reducir") && !title.includes("mejorar")) {
      suggestions.push({
        id: "smart-verb-1",
        title: "Usar verbos de acción específicos",
        description: "Los objetivos SMART deben comenzar con verbos de acción claros",
        category: "content",
        priority: "high",
        impact: "high",
        effort: "low",
        confidence: 0.9,
        reason: "Los objetivos con verbos de acción específicos son más claros y medibles",
        implementation: {
          steps: [
            "Identificar el resultado deseado",
            "Elegir un verbo de acción específico",
            "Reformular el objetivo con el nuevo verbo"
          ],
          timeEstimate: "5 minutos",
          resources: ["Guía de verbos SMART"]
        },
        before: formData.title,
        after: `Aumentar ${formData.title.toLowerCase()}`,
        examples: [
          "Aumentar la satisfacción del cliente a 4.5/5",
          "Reducir el tiempo de respuesta en 50%",
          "Mejorar la calidad del producto en 30%"
        ]
      })
    }

    // Check for measurability
    if (!/\d+/.test(title) && !/%/.test(title)) {
      suggestions.push({
        id: "measurable-1",
        title: "Agregar métricas específicas",
        description: "Los objetivos deben incluir números o porcentajes medibles",
        category: "metrics",
        priority: "high",
        impact: "high",
        effort: "low",
        confidence: 0.85,
        reason: "Las métricas específicas hacen los objetivos más claros y permiten medir el progreso",
        implementation: {
          steps: [
            "Identificar qué se puede medir",
            "Definir el valor actual",
            "Establecer el valor objetivo",
            "Agregar la métrica al título"
          ],
          timeEstimate: "10 minutos",
          resources: ["Calculadora", "Datos históricos"]
        },
        before: formData.title,
        after: `${formData.title} en un 25%`,
        metrics: [
          { name: "Claridad del objetivo", expectedImprovement: "+40%" },
          { name: "Capacidad de seguimiento", expectedImprovement: "+60%" }
        ]
      })
    }
  }

  // Analyze description
  if (formData.description && typeof formData.description === "string") {
    if (formData.description.length < 50) {
      suggestions.push({
        id: "description-length-1",
        title: "Expandir la descripción del objetivo",
        description: "Una descripción más detallada ayuda a entender mejor el contexto",
        category: "content",
        priority: "medium",
        impact: "medium",
        effort: "low",
        confidence: 0.8,
        reason: "Las descripciones detalladas mejoran la comprensión y el alineamiento del equipo",
        implementation: {
          steps: [
            "Explicar el contexto del objetivo",
            "Describir por qué es importante",
            "Mencionar cómo se medirá",
            "Incluir beneficios esperados"
          ],
          timeEstimate: "15 minutos",
          resources: ["Contexto del negocio", "Estrategia departamental"]
        },
        examples: [
          "Este objetivo es crucial para mejorar la retención de clientes y aumentar el LTV...",
          "Implementaremos esta mejora para optimizar nuestros procesos operativos..."
        ]
      })
    }

    if (!formData.description.toLowerCase().includes("medir")) {
      suggestions.push({
        id: "measurement-context-1",
        title: "Especificar cómo se medirá el objetivo",
        description: "Incluir información sobre las métricas y metodología de medición",
        category: "metrics",
        priority: "medium",
        impact: "medium",
        effort: "low",
        confidence: 0.75,
        reason: "Especificar la metodología de medición evita confusiones futuras",
        implementation: {
          steps: [
            "Identificar las métricas principales",
            "Definir la frecuencia de medición",
            "Especificar las herramientas de seguimiento",
            "Agregar esta información a la descripción"
          ],
          timeEstimate: "10 minutos",
          resources: ["Herramientas de analytics", "Dashboard de métricas"]
        }
      })
    }
  }

  // Analyze timeframe
  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff > 365) {
      suggestions.push({
        id: "timeframe-too-long-1",
        title: "Considerar dividir en objetivos más cortos",
        description: "Los objetivos de más de 1 año pueden dividirse en hitos trimestrales",
        category: "structure",
        priority: "medium",
        impact: "high",
        effort: "medium",
        confidence: 0.8,
        reason: "Los objetivos más cortos permiten mejor seguimiento y ajustes más frecuentes",
        implementation: {
          steps: [
            "Dividir el objetivo en 4 trimestres",
            "Definir hitos intermedios",
            "Crear objetivos trimestrales específicos",
            "Establecer puntos de revisión"
          ],
          timeEstimate: "30 minutos",
          resources: ["Calendario", "Planificación estratégica"]
        },
        metrics: [
          { name: "Frecuencia de seguimiento", expectedImprovement: "+300%" },
          { name: "Capacidad de ajuste", expectedImprovement: "+150%" }
        ]
      })
    }
  }

  // Analyze key results if available
  if (formData.keyResults && Array.isArray(formData.keyResults)) {
    if (formData.keyResults.length < 3) {
      suggestions.push({
        id: "key-results-count-1",
        title: "Agregar más resultados clave",
        description: "Los objetivos efectivos tienen entre 3-5 resultados clave",
        category: "structure",
        priority: "medium",
        impact: "medium",
        effort: "medium",
        confidence: 0.85,
        reason: "Múltiples resultados clave proporcionan diferentes perspectivas para medir el éxito",
        implementation: {
          steps: [
            "Identificar aspectos adicionales a medir",
            "Definir métricas complementarias",
            "Asegurar que cubran diferentes dimensiones",
            "Agregar 1-2 resultados clave más"
          ],
          timeEstimate: "20 minutos",
          resources: ["Framework SMART", "Métricas de la industria"]
        }
      })
    }

    // Check if all key results have proper units
    const hasIncompleteKRs = formData.keyResults.some((kr: any) =>
      !kr.unit || !kr.targetValue || kr.targetValue === 0
    )

    if (hasIncompleteKRs) {
      suggestions.push({
        id: "key-results-completion-1",
        title: "Completar información de resultados clave",
        description: "Todos los resultados clave deben tener valores objetivo y unidades específicas",
        category: "metrics",
        priority: "high",
        impact: "high",
        effort: "low",
        confidence: 0.9,
        reason: "Los resultados clave incompletos no pueden medirse adecuadamente",
        implementation: {
          steps: [
            "Revisar cada resultado clave",
            "Definir valores objetivo específicos",
            "Especificar unidades de medida",
            "Validar que sean alcanzables"
          ],
          timeEstimate: "15 minutos",
          resources: ["Datos históricos", "Benchmarks de industria"]
        }
      })
    }
  }

  return suggestions
}