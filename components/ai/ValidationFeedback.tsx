"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  X,
  Lightbulb,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ValidationResult, ValidationLevel } from "@/lib/services/smart-validation"

interface ValidationFeedbackProps {
  results: ValidationResult[]
  onSuggestionApply?: (suggestion: string) => void
  onSuggestionDismiss?: (resultId: string) => void
  onFeedback?: (resultId: string, helpful: boolean) => void
  showProgress?: boolean
  className?: string
}

const levelConfig = {
  error: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    badgeVariant: "secondary" as const,
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeVariant: "outline" as const,
  },
  success: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badgeVariant: "outline" as const,
  },
}

export function ValidationFeedback({
  results,
  onSuggestionApply,
  onSuggestionDismiss,
  onFeedback,
  showProgress = false,
  className,
}: ValidationFeedbackProps) {
  const [dismissedResults, setDismissedResults] = useState<Set<string>>(new Set())
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())

  // Filter out dismissed results
  const visibleResults = results.filter(result => {
    const resultId = `${result.fieldName}-${result.message}`
    return !dismissedResults.has(resultId)
  })

  // Calculate validation score
  const validationScore = results.length > 0
    ? (results.filter(r => r.level === "success").length / results.length) * 100
    : 100

  // Handle suggestion application
  const handleApplySuggestion = (result: ValidationResult) => {
    if (result.suggestion && onSuggestionApply) {
      onSuggestionApply(result.suggestion.text)
      const resultId = `${result.fieldName}-${result.message}`
      setAppliedSuggestions(prev => new Set([...prev, resultId]))
    }
  }

  // Handle suggestion dismissal
  const handleDismissSuggestion = (result: ValidationResult) => {
    const resultId = `${result.fieldName}-${result.message}`
    setDismissedResults(prev => new Set([...prev, resultId]))
    onSuggestionDismiss?.(resultId)
  }

  // Handle feedback
  const handleFeedback = (result: ValidationResult, helpful: boolean) => {
    const resultId = `${result.fieldName}-${result.message}`
    onFeedback?.(resultId, helpful)
  }

  // Group results by level
  const groupedResults = visibleResults.reduce((acc, result) => {
    if (!acc[result.level]) {
      acc[result.level] = []
    }
    acc[result.level].push(result)
    return acc
  }, {} as Record<ValidationLevel, ValidationResult[]>)

  if (visibleResults.length === 0) {
    return null
  }

  const ValidationResultItem = ({ result }: { result: ValidationResult }) => {
    const config = levelConfig[result.level]
    const Icon = config.icon
    const resultId = `${result.fieldName}-${result.message}`
    const isApplied = appliedSuggestions.has(resultId)

    return (
      <Alert className={cn("border-l-4", config.borderColor, config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.color)} />
        <AlertDescription className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{result.message}</span>
              {result.aiConfidence && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {Math.round(result.aiConfidence * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Confianza de IA: {Math.round(result.aiConfidence * 100)}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* AI Suggestion */}
            {result.suggestion && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        Sugerencia IA
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(result.suggestion.confidence * 100)}% confianza
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium">{result.suggestion.text}</div>
                      {result.suggestion.explanation && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.suggestion.explanation}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplySuggestion(result)}
                        disabled={isApplied}
                        className="h-7 text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {isApplied ? "Aplicado" : "Aplicar"}
                      </Button>

                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFeedback(result, true)}
                                className="h-7 w-7 p-0"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Útil</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFeedback(result, false)}
                                className="h-7 w-7 p-0"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No útil</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDismissSuggestion(result)}
            className="ml-2 h-6 w-6 p-0 shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Validation Progress */}
      {showProgress && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  Calidad del Formulario
                </span>
                <span className="text-sm font-bold text-primary">
                  {Math.round(validationScore)}%
                </span>
              </div>
              <Progress value={validationScore} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {results.filter(r => r.level === "success").length} de {results.length} validaciones pasadas
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results by Level */}
      {Object.entries(groupedResults).map(([level, levelResults]) => {
        if (levelResults.length === 0) return null

        const config = levelConfig[level as ValidationLevel]

        return (
          <div key={level} className="space-y-2">
            {/* Level Header */}
            <div className="flex items-center gap-2">
              <config.icon className={cn("h-4 w-4", config.color)} />
              <span className="text-sm font-medium capitalize">
                {level === "error" && "Errores"}
                {level === "warning" && "Advertencias"}
                {level === "info" && "Información"}
                {level === "success" && "Validaciones Correctas"}
              </span>
              <Badge variant={config.badgeVariant} className="text-xs">
                {levelResults.length}
              </Badge>
            </div>

            {/* Results */}
            <div className="space-y-2">
              {levelResults.map((result, index) => (
                <ValidationResultItem
                  key={`${result.fieldName}-${result.message}-${index}`}
                  result={result}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Summary for success cases */}
      {visibleResults.every(r => r.level === "success") && visibleResults.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ¡Excelente! Todos los campos están validados correctamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}