"use client"

import { useState, useEffect } from "react"
import { Check, Users, ArrowRight, Sparkles, Target, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DepartmentStructure, CompanyType, Industry } from "@/lib/types/smart-forms"

interface TeamStructureWizardProps {
  industry?: Industry
  companyType?: CompanyType
  currentStructure: DepartmentStructure[]
  onStructureChange: (structure: DepartmentStructure[]) => void
  onComplete?: () => void
  className?: string
}

interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
}

interface TeamTemplate {
  id: string
  name: string
  description: string
  structure: DepartmentStructure[]
  suitableFor: string[]
  pros: string[]
  cons: string[]
  score?: number
}

export function TeamStructureWizard({
  industry,
  companyType,
  currentStructure,
  onStructureChange,
  onComplete,
  className,
}: TeamStructureWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<TeamTemplate[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [customizationChoices, setCustomizationChoices] = useState<Record<string, any>>({})

  const steps: WizardStep[] = [
    {
      id: "analyze",
      title: "Análisis IA",
      description: "Analizamos tu industria y tipo de empresa",
      completed: currentStep > 0,
    },
    {
      id: "template",
      title: "Seleccionar Plantilla",
      description: "Elige una estructura organizacional",
      completed: currentStep > 1,
    },
    {
      id: "customize",
      title: "Personalizar",
      description: "Ajusta la estructura a tus necesidades",
      completed: currentStep > 2,
    },
    {
      id: "review",
      title: "Revisar",
      description: "Confirma tu estructura final",
      completed: currentStep > 3,
    },
  ]

  // Generate AI recommendations
  useEffect(() => {
    if (currentStep === 0 && (industry || companyType)) {
      generateAIRecommendations()
    }
  }, [currentStep, industry, companyType])

  const generateAIRecommendations = async () => {
    setIsLoadingAI(true)
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000))

      const templates: TeamTemplate[] = [
        {
          id: "startup-agile",
          name: "Startup Ágil",
          description: "Estructura plana con equipos multifuncionales",
          score: 95,
          suitableFor: ["Startups", "Tecnología", "Innovación rápida"],
          pros: ["Rápida toma de decisiones", "Flexibilidad", "Comunicación directa"],
          cons: ["Puede generar caos", "Falta de especialización"],
          structure: [
            {
              id: "founders",
              name: "Fundadores",
              description: "Liderazgo y dirección estratégica",
              level: 0,
              roles: ["CEO", "CTO", "Co-founder"],
              suggestedMetrics: ["Crecimiento de ingresos", "Product-market fit"]
            },
            {
              id: "product-dev",
              name: "Desarrollo de Producto",
              description: "Creación y mejora del producto principal",
              level: 1,
              roles: ["Product Manager", "Desarrollador Full-stack", "UX Designer"],
              suggestedMetrics: ["Velocidad de desarrollo", "Calidad del código", "User satisfaction"]
            },
            {
              id: "growth",
              name: "Crecimiento",
              description: "Marketing, ventas y crecimiento",
              level: 1,
              roles: ["Growth Hacker", "Sales Lead", "Marketing Specialist"],
              suggestedMetrics: ["CAC", "LTV", "Conversion rate"]
            }
          ]
        },
        {
          id: "traditional-hierarchical",
          name: "Jerárquica Tradicional",
          description: "Estructura departamental con jerarquía clara",
          score: 75,
          suitableFor: ["Empresas establecidas", "Industrias reguladas", "Operaciones complejas"],
          pros: ["Clara cadena de mando", "Especialización", "Escalabilidad"],
          cons: ["Lenta toma de decisiones", "Menos flexibilidad"],
          structure: [
            {
              id: "executive",
              name: "Ejecutivo",
              description: "Alta dirección y estrategia",
              level: 0,
              roles: ["CEO", "CFO", "COO"],
              suggestedMetrics: ["ROI", "Market share", "Stakeholder satisfaction"]
            },
            {
              id: "sales",
              name: "Ventas",
              description: "Generación de ingresos",
              level: 1,
              roles: ["Director de Ventas", "Account Manager", "Sales Rep"],
              suggestedMetrics: ["Revenue", "Sales quota", "Customer retention"]
            },
            {
              id: "operations",
              name: "Operaciones",
              description: "Eficiencia operacional",
              level: 1,
              roles: ["Operations Manager", "Process Analyst", "Quality Lead"],
              suggestedMetrics: ["Operational efficiency", "Cost reduction", "Process improvement"]
            },
            {
              id: "support",
              name: "Soporte",
              description: "Funciones de apoyo",
              level: 1,
              roles: ["HR Manager", "Finance Analyst", "IT Support"],
              suggestedMetrics: ["Employee satisfaction", "Process efficiency", "Service quality"]
            }
          ]
        },
        {
          id: "hybrid-modern",
          name: "Híbrida Moderna",
          description: "Combinación de agilidad y estructura",
          score: 88,
          suitableFor: ["Empresas en crecimiento", "Equipos remotos", "Proyectos complejos"],
          pros: ["Balance entre agilidad y estructura", "Escalable", "Adaptable"],
          cons: ["Complejidad inicial", "Requiere buena comunicación"],
          structure: [
            {
              id: "leadership",
              name: "Liderazgo",
              description: "Dirección estratégica",
              level: 0,
              roles: ["CEO", "VP Engineering", "VP Sales"],
              suggestedMetrics: ["Strategic goals", "Team performance", "Innovation index"]
            },
            {
              id: "product-teams",
              name: "Equipos de Producto",
              description: "Squads multifuncionales",
              level: 1,
              roles: ["Product Owner", "Tech Lead", "Designer", "Developer"],
              suggestedMetrics: ["Sprint velocity", "Feature adoption", "Technical debt"]
            },
            {
              id: "customer-success",
              name: "Éxito del Cliente",
              description: "Retención y satisfacción",
              level: 1,
              roles: ["Customer Success Manager", "Support Specialist", "Sales Engineer"],
              suggestedMetrics: ["NPS", "Churn rate", "Customer LTV"]
            }
          ]
        }
      ]

      // Adjust scores based on context
      if (companyType?.size === "startup") {
        templates[0].score += 10 // Boost agile startup
        templates[1].score -= 15 // Reduce traditional
      }

      if (industry?.id === "technology") {
        templates[0].score += 5
        templates[2].score += 5
      }

      setAiRecommendations(templates.sort((a, b) => (b.score || 0) - (a.score || 0)))
      setCurrentStep(1)
    } catch (error) {
      console.error("Error generating AI recommendations:", error)
    } finally {
      setIsLoadingAI(false)
    }
  }

  const selectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = aiRecommendations.find(t => t.id === templateId)
    if (template) {
      onStructureChange(template.structure)
      setCurrentStep(2)
    }
  }

  const handleCustomization = (choices: Record<string, any>) => {
    setCustomizationChoices(choices)
    setCurrentStep(3)
  }

  const completeWizard = () => {
    setCurrentStep(4)
    onComplete?.()
  }

  const TemplateCard = ({ template }: { template: TeamTemplate }) => (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md relative",
        selectedTemplate === template.id
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50"
      )}
      onClick={() => selectTemplate(template.id)}
    >
      {template.score && template.score > 85 && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-primary-foreground text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Recomendado
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 border">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.score && (
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={template.score} className="h-1 w-16" />
                  <span className="text-xs text-muted-foreground">{template.score}% match</span>
                </div>
              )}
            </div>
          </div>
          {selectedTemplate === template.id && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </div>
        <CardDescription className="text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">
            Adecuado para:
          </Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {template.suitableFor.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-green-600">
              Ventajas:
            </Label>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              {template.pros.slice(0, 2).map((pro, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  {pro}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Label className="text-xs font-medium text-orange-600">
              Consideraciones:
            </Label>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              {template.cons.slice(0, 2).map((con, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">
            Estructura ({template.structure.length} departamentos):
          </Label>
          <div className="mt-1 space-y-1">
            {template.structure.slice(0, 3).map((dept, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{dept.name}</span>
                <span className="text-muted-foreground">({dept.roles.length} roles)</span>
              </div>
            ))}
            {template.structure.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{template.structure.length - 3} más...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Asistente de Estructura Organizacional</h3>
            <p className="text-sm text-muted-foreground">
              Te ayudamos a crear la estructura ideal para tu equipo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Paso {Math.min(currentStep + 1, steps.length)} de {steps.length}
            </span>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-20" />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    index <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 0: AI Analysis */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
                <h3 className="text-lg font-semibold">Analizando tu contexto</h3>
                <p className="text-muted-foreground">
                  Estamos analizando tu industria y tipo de empresa para sugerir la mejor estructura
                </p>
              </div>

              {isLoadingAI && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Analizando industria: {industry?.name || "No especificada"}
                  </div>
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Evaluando tipo de empresa: {companyType?.name || "No especificado"}
                  </div>
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Generando recomendaciones...
                  </div>
                </div>
              )}

              {!isLoadingAI && aiRecommendations.length === 0 && (
                <Button onClick={generateAIRecommendations}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Análisis IA
                </Button>
              )}
            </div>
          )}

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Selecciona una Plantilla</h3>
                <p className="text-muted-foreground">
                  Basándose en tu análisis, estas son las estructuras más recomendadas
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {aiRecommendations.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Customization */}
          {currentStep === 2 && selectedTemplate && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Personalizar Estructura</h3>
                <p className="text-muted-foreground">
                  Ajusta los departamentos y roles según tus necesidades específicas
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Departamentos Incluidos</h4>
                  <Button size="sm" onClick={() => handleCustomization({})}>
                    <Target className="h-4 w-4 mr-2" />
                    Continuar con esta estructura
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentStructure.map((dept, index) => (
                    <Card key={dept.id} className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{dept.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {dept.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {dept.roles.map((role, roleIndex) => (
                              <Badge key={roleIndex} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          {dept.suggestedMetrics && dept.suggestedMetrics.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Métricas: {dept.suggestedMetrics.slice(0, 2).join(", ")}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Revisar Estructura Final</h3>
                <p className="text-muted-foreground">
                  Confirma que la estructura organizacional se adapte a tus necesidades
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Resumen de tu Estructura</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{currentStructure.length}</div>
                      <div className="text-xs text-muted-foreground">Departamentos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {currentStructure.reduce((sum, dept) => sum + dept.roles.length, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Roles Totales</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {Math.max(...currentStructure.map(d => d.level)) + 1}
                      </div>
                      <div className="text-xs text-muted-foreground">Niveles</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {aiRecommendations.find(t => t.id === selectedTemplate)?.score || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Compatibilidad</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Volver a Plantillas
                  </Button>
                  <Button onClick={completeWizard}>
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar Configuración
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Completion */}
          {currentStep === 4 && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">¡Estructura Configurada!</h3>
                <p className="text-muted-foreground">
                  Tu estructura organizacional está lista. Puedes continuar con el siguiente paso del proceso.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>{currentStructure.length}</strong> departamentos configurados con{" "}
                  <strong>{currentStructure.reduce((sum, dept) => sum + dept.roles.length, 0)}</strong> roles totales
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}