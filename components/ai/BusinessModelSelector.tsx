"use client"

import { useState, useEffect } from "react"
import { Check, DollarSign, TrendingUp, Target, Sparkles, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BusinessModel } from "@/lib/types/smart-forms"
import { mockBusinessModels } from "@/lib/forms/form-utils"

interface BusinessModelSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  onOKRSuggestion?: (okrs: string[]) => void
  industry?: string
  companyType?: string
  aiSuggestions?: boolean
  className?: string
}

const modelIcons = {
  saas: TrendingUp,
  ecommerce: DollarSign,
  consulting: Target,
}

const modelColors = {
  saas: "text-blue-500",
  ecommerce: "text-green-500",
  consulting: "text-purple-500",
}

export function BusinessModelSelector({
  value,
  onValueChange,
  onOKRSuggestion,
  industry,
  companyType,
  aiSuggestions = true,
  className,
}: BusinessModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<BusinessModel | null>(null)
  const [aiSuggestedModels, setAiSuggestedModels] = useState<BusinessModel[]>([])
  const [aiRecommendationScores, setAiRecommendationScores] = useState<Record<string, number>>({})
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Find selected business model
  useEffect(() => {
    if (value) {
      const model = mockBusinessModels.find(m => m.id === value)
      setSelectedModel(model || null)
    }
  }, [value])

  // Get AI suggestions based on industry and company type
  useEffect(() => {
    if (aiSuggestions && (industry || companyType)) {
      setIsLoadingAI(true)

      // Simulate AI analysis with realistic scores
      setTimeout(() => {
        const scores: Record<string, number> = {}
        let suggestions: BusinessModel[] = []

        // Industry-based recommendations
        if (industry === "technology") {
          scores.saas = 95
          scores.ecommerce = 70
          scores.consulting = 60
          suggestions = [mockBusinessModels[0]] // SaaS
        } else if (industry === "finance") {
          scores.saas = 85
          scores.consulting = 90
          scores.ecommerce = 50
          suggestions = [mockBusinessModels[2], mockBusinessModels[0]] // Consulting, SaaS
        } else {
          scores.ecommerce = 80
          scores.consulting = 75
          scores.saas = 65
          suggestions = [mockBusinessModels[1]] // E-commerce
        }

        // Company type adjustments
        if (companyType === "startup") {
          scores.saas = (scores.saas || 0) + 10
          scores.ecommerce = (scores.ecommerce || 0) + 5
        } else if (companyType === "enterprise") {
          scores.consulting = (scores.consulting || 0) + 15
        }

        setAiRecommendationScores(scores)
        setAiSuggestedModels(suggestions)
        setIsLoadingAI(false)
      }, 2000)
    }
  }, [industry, companyType, aiSuggestions])

  const handleModelSelect = (model: BusinessModel) => {
    setSelectedModel(model)
    onValueChange(model.id)

    // Suggest OKRs if callback provided
    if (onOKRSuggestion && model.suggestedOKRs) {
      onOKRSuggestion(model.suggestedOKRs)
    }
  }

  const getRecommendationScore = (modelId: string): number => {
    return aiRecommendationScores[modelId] || 0
  }

  const BusinessModelCard = ({
    model,
    isSelected,
    isAISuggested = false,
    score = 0
  }: {
    model: BusinessModel
    isSelected: boolean
    isAISuggested?: boolean
    score?: number
  }) => {
    const ModelIcon = modelIcons[model.id as keyof typeof modelIcons] || BarChart3
    const modelColor = modelColors[model.id as keyof typeof modelColors] || "text-gray-500"

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md relative",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:border-primary/50",
          isAISuggested && "ring-2 ring-primary/20"
        )}
        onClick={() => handleModelSelect(model)}
      >
        {isAISuggested && score > 0 && (
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-primary text-primary-foreground text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {score}%
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-md bg-background border", modelColor)}>
                <ModelIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{model.name}</CardTitle>
                {score > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Compatibilidad:</span>
                      <Progress value={score} className="h-1 w-16" />
                      <span>{score}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
          {model.description && (
            <CardDescription className="text-sm mt-2">
              {model.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Revenue Streams */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Fuentes de Ingresos:
            </Label>
            <div className="mt-1 space-y-1">
              {model.revenueStreams.slice(0, 3).map((stream, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span>{stream}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Métricas Clave:
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {model.keyMetrics.slice(0, 4).map((metric, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs"
                >
                  {metric}
                </Badge>
              ))}
              {model.keyMetrics.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{model.keyMetrics.length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Suggested OKRs Preview */}
          {model.suggestedOKRs && model.suggestedOKRs.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                OKR Sugerido:
              </Label>
              <div className="text-xs text-muted-foreground mt-1">
                • {model.suggestedOKRs[0]}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Modelo de Negocio</Label>
        {aiSuggestions && (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            IA Habilitada
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* AI Analysis */}
        {aiSuggestions && isLoadingAI && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Analizando modelo óptimo...
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded animate-pulse flex-1" />
                    <div className="text-xs text-muted-foreground">Analizando industria</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded animate-pulse flex-1" />
                    <div className="text-xs text-muted-foreground">Evaluando tipo de empresa</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded animate-pulse flex-1" />
                    <div className="text-xs text-muted-foreground">Calculando compatibilidad</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Recommendations */}
        {aiSuggestedModels.length > 0 && !isLoadingAI && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Recomendado para ti
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSuggestedModels.map((model) => (
                <BusinessModelCard
                  key={`ai-${model.id}`}
                  model={model}
                  isSelected={selectedModel?.id === model.id}
                  isAISuggested={true}
                  score={getRecommendationScore(model.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Business Models */}
        <div className="space-y-3">
          {aiSuggestedModels.length > 0 && (
            <div className="text-sm font-medium text-muted-foreground">
              Todos los modelos
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockBusinessModels.map((model) => (
              <BusinessModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel?.id === model.id}
                score={getRecommendationScore(model.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected Model Summary */}
      {selectedModel && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                Modelo Seleccionado: {selectedModel.name}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {selectedModel.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Métricas Clave a Rastrear:
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedModel.keyMetrics.map((metric, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedModel.suggestedOKRs && onOKRSuggestion && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOKRSuggestion(selectedModel.suggestedOKRs)}
                      className="w-full"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Aplicar OKRs Sugeridos
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}