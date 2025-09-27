"use client"

import { useState, useEffect } from "react"
import { Check, Building, Users, TrendingUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CompanyType, DepartmentStructure } from "@/lib/types/smart-forms"
import { mockCompanyTypes } from "@/lib/forms/form-utils"

interface CompanyTypeSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  onStructureSuggestion?: (structure: DepartmentStructure[]) => void
  aiSuggestions?: boolean
  className?: string
}

const sizeIcons = {
  startup: TrendingUp,
  small: Building,
  medium: Building,
  large: Building,
  enterprise: Building,
}

const sizeColors = {
  startup: "text-green-500",
  small: "text-blue-500",
  medium: "text-purple-500",
  large: "text-orange-500",
  enterprise: "text-red-500",
}

const sizeDescriptions = {
  startup: "1-10 empleados",
  small: "11-50 empleados",
  medium: "51-200 empleados",
  large: "201-1000 empleados",
  enterprise: "1000+ empleados",
}

export function CompanyTypeSelector({
  value,
  onValueChange,
  onStructureSuggestion,
  aiSuggestions = true,
  className,
}: CompanyTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null)
  const [aiSuggestedTypes, setAiSuggestedTypes] = useState<CompanyType[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Find selected company type
  useEffect(() => {
    if (value) {
      const type = mockCompanyTypes.find(t => t.id === value)
      setSelectedType(type || null)
    }
  }, [value])

  // Get AI suggestions when component mounts
  useEffect(() => {
    if (aiSuggestions) {
      setIsLoadingAI(true)
      // Simulate AI suggestions (in real app, this would be an API call)
      setTimeout(() => {
        setAiSuggestedTypes([
          mockCompanyTypes[0], // Startup
        ])
        setIsLoadingAI(false)
      }, 1500)
    }
  }, [aiSuggestions])

  const handleTypeSelect = (type: CompanyType) => {
    setSelectedType(type)
    onValueChange(type.id)

    // Suggest structure if callback provided
    if (onStructureSuggestion && type.suggestedStructure) {
      onStructureSuggestion(type.suggestedStructure)
    }
  }

  const CompanyTypeCard = ({
    type,
    isSelected,
    isAISuggested = false
  }: {
    type: CompanyType
    isSelected: boolean
    isAISuggested?: boolean
  }) => {
    const SizeIcon = sizeIcons[type.size]
    const sizeColor = sizeColors[type.size]

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md relative",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:border-primary/50",
          isAISuggested && "ring-2 ring-primary/20"
        )}
        onClick={() => handleTypeSelect(type)}
      >
        {isAISuggested && (
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-primary text-primary-foreground text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-md bg-background border", sizeColor)}>
                <SizeIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{type.name}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {sizeDescriptions[type.size]}
                </div>
              </div>
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
          {type.description && (
            <CardDescription className="text-sm mt-2">
              {type.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Characteristics */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Características:
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {type.characteristics.map((char, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs"
                >
                  {char}
                </Badge>
              ))}
            </div>
          </div>

          {/* Suggested Structure Preview */}
          {type.suggestedStructure && type.suggestedStructure.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Estructura Sugerida:
              </Label>
              <div className="mt-1 space-y-1">
                {type.suggestedStructure.slice(0, 2).map((dept, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{dept.name}</span>
                    <span className="text-muted-foreground">
                      ({dept.roles.length} roles)
                    </span>
                  </div>
                ))}
                {type.suggestedStructure.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{type.suggestedStructure.length - 2} departamentos más
                  </div>
                )}
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
        <Label className="text-sm font-medium">Tipo de Empresa</Label>
        {aiSuggestions && (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            IA Habilitada
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* AI Suggestions */}
        {aiSuggestions && isLoadingAI && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Analizando tipo de empresa...
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="h-32 bg-primary/5 rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {aiSuggestedTypes.length > 0 && !isLoadingAI && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Recomendado para ti
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSuggestedTypes.map((type) => (
                <CompanyTypeCard
                  key={`ai-${type.id}`}
                  type={type}
                  isSelected={selectedType?.id === type.id}
                  isAISuggested={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Company Types */}
        <div className="space-y-3">
          {aiSuggestedTypes.length > 0 && (
            <div className="text-sm font-medium text-muted-foreground">
              Todos los tipos
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mockCompanyTypes.map((type) => (
              <CompanyTypeCard
                key={type.id}
                type={type}
                isSelected={selectedType?.id === type.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected Type Summary */}
      {selectedType && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                Seleccionaste: {selectedType.name}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedType.description}
              </p>

              {selectedType.suggestedStructure && onStructureSuggestion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStructureSuggestion(selectedType.suggestedStructure || [])}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Aplicar Estructura Sugerida
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}