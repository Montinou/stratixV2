"use client"

import { useState, useEffect, useRef } from "react"
import {
  Target,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  MessageCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  BarChart3,
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
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { SmartObjective, SmartKeyResult } from "@/lib/types/smart-forms"
import { format } from "date-fns"

interface OKREditorProps {
  value: SmartObjective[]
  onChange: (objectives: SmartObjective[]) => void
  department?: string
  industry?: string
  aiAssistance?: boolean
  className?: string
}

interface AIMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  suggestions?: AISuggestion[]
}

interface AISuggestion {
  type: "objective" | "keyresult" | "improvement"
  title: string
  description: string
  details?: any
}

interface ObjectiveFormData {
  title: string
  description: string
  department: string
  keyResults: Omit<SmartKeyResult, "id">[]
  startDate: string
  endDate: string
}

export function OKREditor({
  value,
  onChange,
  department = "",
  industry = "",
  aiAssistance = true,
  className,
}: OKREditorProps) {
  const [objectives, setObjectives] = useState<SmartObjective[]>(value)
  const [editingObjective, setEditingObjective] = useState<SmartObjective | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("editor")

  // AI Chat State
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isAITyping, setIsAITyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Update parent when objectives change
  useEffect(() => {
    onChange(objectives)
  }, [objectives, onChange])

  // Initialize AI assistant
  useEffect(() => {
    if (aiAssistance && messages.length === 0) {
      const welcomeMessage: AIMessage = {
        id: "welcome",
        type: "assistant",
        content: "¡Hola! Soy tu asistente de OKRs. Te ayudo a crear objetivos SMART y resultados clave medibles. ¿Qué objetivo quieres trabajar hoy?",
        timestamp: new Date(),
        suggestions: [
          {
            type: "objective",
            title: "Sugerir objetivo para " + department,
            description: "Te ayudo a crear un objetivo específico para tu departamento"
          },
          {
            type: "improvement",
            title: "Mejorar objetivos existentes",
            description: "Analizo tus objetivos actuales y sugiero mejoras"
          }
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [aiAssistance, department, messages.length])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsAITyping(true)

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 2000))

      const aiResponse = await generateAIResponse(inputMessage, objectives, department, industry)

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error("Error getting AI response:", error)
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAITyping(false)
    }
  }

  // Generate AI response
  const generateAIResponse = async (
    message: string,
    currentObjectives: SmartObjective[],
    dept: string,
    ind: string
  ): Promise<AIMessage> => {
    const lowerMessage = message.toLowerCase()

    // Detect intent and generate appropriate response
    if (lowerMessage.includes("objetivo") || lowerMessage.includes("okr")) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "Te ayudo a crear un objetivo SMART. Un buen objetivo debe ser Específico, Medible, Alcanzable, Relevante y Temporal. ¿Qué quieres lograr?",
        timestamp: new Date(),
        suggestions: [
          {
            type: "objective",
            title: `Aumentar eficiencia en ${dept}`,
            description: "Objetivo enfocado en mejorar procesos y productividad",
            details: {
              title: `Aumentar la eficiencia operativa de ${dept} en 25%`,
              description: "Optimizar procesos y herramientas para mejorar la productividad del equipo",
              keyResults: [
                {
                  title: "Reducir tiempo de procesos en 30%",
                  metric: "Tiempo promedio",
                  targetValue: 30,
                  currentValue: 0,
                  unit: "% reducción"
                },
                {
                  title: "Aumentar satisfacción del equipo",
                  metric: "Puntuación NPS",
                  targetValue: 8,
                  currentValue: 6,
                  unit: "puntos"
                }
              ]
            }
          },
          {
            type: "objective",
            title: `Mejorar satisfacción del cliente`,
            description: "Objetivo centrado en la experiencia del cliente",
            details: {
              title: "Mejorar la satisfacción del cliente a 4.5/5",
              description: "Implementar mejoras en el servicio y producto basadas en feedback",
              keyResults: [
                {
                  title: "Alcanzar puntuación de satisfacción 4.5/5",
                  metric: "Rating promedio",
                  targetValue: 4.5,
                  currentValue: 3.8,
                  unit: "estrellas"
                },
                {
                  title: "Reducir tiempo de respuesta",
                  metric: "Tiempo promedio",
                  targetValue: 2,
                  currentValue: 5,
                  unit: "horas"
                }
              ]
            }
          }
        ]
      }
    }

    if (lowerMessage.includes("resultado") || lowerMessage.includes("métrica")) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "Los resultados clave deben ser específicos y medibles. Te sugiero algunas métricas comunes:",
        timestamp: new Date(),
        suggestions: [
          {
            type: "keyresult",
            title: "Métrica de crecimiento",
            description: "Aumentar X en Y% durante Z tiempo"
          },
          {
            type: "keyresult",
            title: "Métrica de calidad",
            description: "Mejorar puntuación/rating a X puntos"
          },
          {
            type: "keyresult",
            title: "Métrica de eficiencia",
            description: "Reducir tiempo/costo en X%"
          }
        ]
      }
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: "assistant",
      content: `Entiendo que quieres trabajar en: "${message}". Te puedo ayudar a estructurar esto como un objetivo SMART. ¿Te gustaría que sugiera una estructura específica?`,
      timestamp: new Date(),
      suggestions: [
        {
          type: "objective",
          title: "Convertir en objetivo SMART",
          description: "Te ayudo a estructurar tu idea como un objetivo medible"
        }
      ]
    }
  }

  // Apply AI suggestion
  const applySuggestion = (suggestion: AISuggestion) => {
    if (suggestion.type === "objective" && suggestion.details) {
      const newObjective: SmartObjective = {
        id: Date.now().toString(),
        title: suggestion.details.title,
        description: suggestion.details.description,
        department: department,
        keyResults: suggestion.details.keyResults.map((kr: any, index: number) => ({
          id: `${Date.now()}-kr-${index}`,
          ...kr
        })),
        status: "draft",
        progress: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 90 days
      }

      setObjectives(prev => [...prev, newObjective])
      toast({
        title: "Objetivo agregado",
        description: "El objetivo sugerido ha sido agregado exitosamente",
      })
    }
  }

  // Add objective
  const addObjective = (formData: ObjectiveFormData) => {
    const newObjective: SmartObjective = {
      id: Date.now().toString(),
      ...formData,
      keyResults: formData.keyResults.map((kr, index) => ({
        id: `${Date.now()}-kr-${index}`,
        ...kr
      })),
      status: "draft",
      progress: 0,
    }

    setObjectives(prev => [...prev, newObjective])
    setIsDialogOpen(false)
    toast({
      title: "Objetivo agregado",
      description: "El objetivo ha sido agregado exitosamente",
    })
  }

  // Update objective
  const updateObjective = (formData: ObjectiveFormData) => {
    if (!editingObjective) return

    setObjectives(prev => prev.map(obj =>
      obj.id === editingObjective.id
        ? {
            ...obj,
            ...formData,
            keyResults: formData.keyResults.map((kr, index) => ({
              id: kr.id || `${Date.now()}-kr-${index}`,
              ...kr
            }))
          }
        : obj
    ))

    setEditingObjective(null)
    setIsDialogOpen(false)
    toast({
      title: "Objetivo actualizado",
      description: "El objetivo ha sido actualizado exitosamente",
    })
  }

  // Delete objective
  const deleteObjective = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id))
    toast({
      title: "Objetivo eliminado",
      description: "El objetivo ha sido eliminado exitosamente",
    })
  }

  const ObjectiveCard = ({ objective }: { objective: SmartObjective }) => {
    const totalProgress = objective.keyResults.length > 0
      ? objective.keyResults.reduce((sum, kr) => sum + (kr.currentValue / kr.targetValue) * 100, 0) / objective.keyResults.length
      : 0

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 border">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{objective.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {objective.status === "draft" && "Borrador"}
                    {objective.status === "in_progress" && "En Progreso"}
                    {objective.status === "completed" && "Completado"}
                    {objective.status === "cancelled" && "Cancelado"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {objective.department}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingObjective(objective)
                  setIsDialogOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteObjective(objective.id!)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {objective.description && (
            <CardDescription className="text-sm">
              {objective.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Progreso General
              </Label>
              <span className="text-xs font-medium">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>

          {/* Key Results */}
          {objective.keyResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Resultados Clave ({objective.keyResults.length})
              </Label>
              <div className="space-y-2">
                {objective.keyResults.slice(0, 3).map((kr, index) => {
                  const krProgress = (kr.currentValue / kr.targetValue) * 100
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{kr.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {kr.currentValue}/{kr.targetValue} {kr.unit}
                        </span>
                      </div>
                      <Progress value={krProgress} className="h-1" />
                    </div>
                  )
                })}
                {objective.keyResults.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{objective.keyResults.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">
              Cronograma
            </Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(objective.startDate), "dd/MM/yyyy")}</span>
              <span>→</span>
              <span>{format(new Date(objective.endDate), "dd/MM/yyyy")}</span>
            </div>
          </div>

          {/* AI Enhancements */}
          {objective.aiEnhancements && objective.aiEnhancements.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Sugerencias IA</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {objective.aiEnhancements[0]}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Editor de OKRs</Label>
          <p className="text-xs text-muted-foreground">
            Crea y gestiona objetivos con asistencia de IA
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => setEditingObjective(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Objetivo
            </Button>
          </DialogTrigger>
          <ObjectiveDialog
            objective={editingObjective}
            department={department}
            onSave={editingObjective ? updateObjective : addObjective}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingObjective(null)
            }}
          />
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor de Objetivos</TabsTrigger>
          <TabsTrigger value="assistant">
            <MessageCircle className="h-4 w-4 mr-2" />
            Asistente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          {objectives.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay objetivos definidos</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comienza creando tu primer objetivo o usa el asistente IA para obtener sugerencias
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Objetivo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("assistant")}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Usar Asistente IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectives.map((objective) => (
                <ObjectiveCard key={objective.id} objective={objective} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assistant" className="mt-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">Asistente de OKRs</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Pregúntame sobre objetivos, métricas, o pide sugerencias específicas
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.type === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          message.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p>{message.content}</p>

                        {/* AI Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="bg-background/50 rounded-md p-2 border cursor-pointer hover:bg-background/70 transition-colors"
                                onClick={() => applySuggestion(suggestion)}
                              >
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-3 w-3 text-primary" />
                                  <span className="text-xs font-medium">{suggestion.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {suggestion.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-60">
                            {format(message.timestamp, "HH:mm")}
                          </span>
                          {message.type === "assistant" && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-auto p-1">
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-auto p-1">
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isAITyping && (
                    <div className="flex gap-3">
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: "0.2s"}}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: "0.4s"}}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Pregúntame sobre OKRs, métricas, o pide sugerencias..."
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={isAITyping}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isAITyping}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Objective Dialog Component
function ObjectiveDialog({
  objective,
  department,
  onSave,
  onCancel,
}: {
  objective: SmartObjective | null
  department: string
  onSave: (formData: ObjectiveFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<ObjectiveFormData>({
    title: objective?.title || "",
    description: objective?.description || "",
    department: objective?.department || department,
    keyResults: objective?.keyResults?.map(kr => ({
      title: kr.title,
      description: kr.description,
      metric: kr.metric,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit,
    })) || [],
    startDate: objective?.startDate || new Date().toISOString().split("T")[0],
    endDate: objective?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  const addKeyResult = () => {
    setFormData(prev => ({
      ...prev,
      keyResults: [
        ...prev.keyResults,
        {
          title: "",
          description: "",
          metric: "",
          targetValue: 0,
          currentValue: 0,
          unit: "",
        }
      ]
    }))
  }

  const updateKeyResult = (index: number, field: keyof SmartKeyResult, value: any) => {
    setFormData(prev => ({
      ...prev,
      keyResults: prev.keyResults.map((kr, i) =>
        i === index ? { ...kr, [field]: value } : kr
      )
    }))
  }

  const removeKeyResult = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyResults: prev.keyResults.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave(formData)
  }

  return (
    <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {objective ? "Editar Objetivo" : "Nuevo Objetivo"}
        </DialogTitle>
        <DialogDescription>
          Define un objetivo SMART con resultados clave medibles
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título del Objetivo *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ej: Aumentar la satisfacción del cliente a 4.5/5"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe el contexto y propósito del objetivo"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de Fin *</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Key Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Resultados Clave</Label>
            <Button type="button" onClick={addKeyResult} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Resultado
            </Button>
          </div>

          {formData.keyResults.map((kr, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Resultado Clave {index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeKeyResult(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <Input
                  value={kr.title}
                  onChange={(e) => updateKeyResult(index, "title", e.target.value)}
                  placeholder="Título del resultado clave"
                />

                <div className="grid grid-cols-4 gap-2">
                  <Input
                    value={kr.metric}
                    onChange={(e) => updateKeyResult(index, "metric", e.target.value)}
                    placeholder="Métrica"
                  />
                  <Input
                    type="number"
                    value={kr.currentValue}
                    onChange={(e) => updateKeyResult(index, "currentValue", parseFloat(e.target.value) || 0)}
                    placeholder="Actual"
                  />
                  <Input
                    type="number"
                    value={kr.targetValue}
                    onChange={(e) => updateKeyResult(index, "targetValue", parseFloat(e.target.value) || 0)}
                    placeholder="Meta"
                  />
                  <Input
                    value={kr.unit}
                    onChange={(e) => updateKeyResult(index, "unit", e.target.value)}
                    placeholder="Unidad"
                  />
                </div>
              </div>
            </Card>
          ))}

          {formData.keyResults.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                No hay resultados clave definidos
              </p>
              <Button type="button" onClick={addKeyResult} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Resultado
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formData.title.trim()}>
            {objective ? "Actualizar" : "Crear"} Objetivo
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}