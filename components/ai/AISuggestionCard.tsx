'use client'

import * as React from 'react'
import { Lightbulb, Target, TrendingUp, CheckCircle, X, ThumbsUp, ThumbsDown, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export interface AISuggestion {
  id: string
  type: 'objective' | 'key-result' | 'template' | 'improvement' | 'metric'
  title: string
  description: string
  content: string
  confidence: number
  category: string
  priority: 'low' | 'medium' | 'high'
  reasoning?: string
  examples?: string[]
  metadata?: {
    estimatedImpact?: number
    difficulty?: 'easy' | 'medium' | 'hard'
    timeframe?: string
    relatedOKRs?: string[]
  }
}

interface AISuggestionCardProps {
  suggestion: AISuggestion
  onApply?: (suggestion: AISuggestion) => void
  onDismiss?: (suggestionId: string) => void
  onFeedback?: (suggestionId: string, feedback: 'positive' | 'negative') => void
  onCopy?: (content: string) => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

const SUGGESTION_ICONS = {
  objective: Target,
  'key-result': TrendingUp,
  template: Lightbulb,
  improvement: CheckCircle,
  metric: TrendingUp
}

const PRIORITY_CONFIG = {
  low: {
    color: 'text-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700'
  },
  medium: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-800/20',
    border: 'border-yellow-200 dark:border-yellow-700'
  },
  high: {
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-800/20',
    border: 'border-red-200 dark:border-red-700'
  }
}

export function AISuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  onFeedback,
  onCopy,
  showActions = true,
  compact = false,
  className
}: AISuggestionCardProps) {
  const [isApplying, setIsApplying] = React.useState(false)
  const [feedbackGiven, setFeedbackGiven] = React.useState<'positive' | 'negative' | null>(null)

  const IconComponent = SUGGESTION_ICONS[suggestion.type] || Lightbulb
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority]

  const handleApply = async () => {
    if (!onApply) return

    setIsApplying(true)
    try {
      await onApply(suggestion)
      toast.success('Sugerencia aplicada exitosamente')
    } catch (error) {
      toast.error('Error al aplicar la sugerencia')
      console.error('Error applying suggestion:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDismiss = () => {
    onDismiss?.(suggestion.id)
    toast.success('Sugerencia descartada')
  }

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    setFeedbackGiven(feedback)
    onFeedback?.(suggestion.id, feedback)
    toast.success(`Feedback ${feedback === 'positive' ? 'positivo' : 'negativo'} enviado`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion.content)
    onCopy?.(suggestion.content)
    toast.success('Contenido copiado al portapapeles')
  }

  const confidenceColor = React.useMemo(() => {
    if (suggestion.confidence >= 0.8) return 'text-green-600'
    if (suggestion.confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }, [suggestion.confidence])

  const confidenceLabel = React.useMemo(() => {
    if (suggestion.confidence >= 0.8) return 'Alta confianza'
    if (suggestion.confidence >= 0.6) return 'Confianza media'
    return 'Baja confianza'
  }, [suggestion.confidence])

  if (compact) {
    return (
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        priorityConfig.border,
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={cn(
              'p-2 rounded-md',
              priorityConfig.bg
            )}>
              <IconComponent className={cn('h-4 w-4', priorityConfig.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium truncate">{suggestion.title}</h4>
                <div className="flex items-center space-x-1">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                  {showActions && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApply}
                      disabled={isApplying}
                      className="h-7 px-2 text-xs"
                    >
                      Aplicar
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {suggestion.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-lg',
      priorityConfig.border,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn(
              'p-2 rounded-md',
              priorityConfig.bg
            )}>
              <IconComponent className={cn('h-5 w-5', priorityConfig.color)} />
            </div>

            <div className="flex-1">
              <CardTitle className="text-base font-medium">
                {suggestion.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {suggestion.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <Badge variant="outline" className="text-xs">
              {suggestion.category}
            </Badge>
            <Badge
              variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {suggestion.priority === 'high' ? 'Alta' :
               suggestion.priority === 'medium' ? 'Media' : 'Baja'} prioridad
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Confidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confianza IA:</span>
            <span className={cn('font-medium', confidenceColor)}>
              {confidenceLabel}
            </span>
          </div>
          <Progress
            value={suggestion.confidence * 100}
            className="h-2"
          />
        </div>

        {/* Content */}
        <div className="p-3 bg-muted/30 rounded-md">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {suggestion.content}
          </p>
        </div>

        {/* Reasoning */}
        {suggestion.reasoning && (
          <div className="space-y-2">
            <Separator />
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                Razonamiento:
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {suggestion.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Examples */}
        {suggestion.examples && suggestion.examples.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Ejemplos:
              </h5>
              <ul className="space-y-1">
                {suggestion.examples.map((example, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    • {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Metadata */}
        {suggestion.metadata && (
          <div className="space-y-2">
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs">
              {suggestion.metadata.estimatedImpact && (
                <div>
                  <span className="text-muted-foreground">Impacto estimado:</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <Progress
                      value={suggestion.metadata.estimatedImpact * 10}
                      className="h-1 flex-1"
                    />
                    <span className="font-medium">
                      {suggestion.metadata.estimatedImpact}/10
                    </span>
                  </div>
                </div>
              )}

              {suggestion.metadata.difficulty && (
                <div>
                  <span className="text-muted-foreground">Dificultad:</span>
                  <p className="font-medium mt-1 capitalize">
                    {suggestion.metadata.difficulty === 'easy' ? 'Fácil' :
                     suggestion.metadata.difficulty === 'medium' ? 'Media' : 'Difícil'}
                  </p>
                </div>
              )}

              {suggestion.metadata.timeframe && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Tiempo estimado:</span>
                  <p className="font-medium mt-1">{suggestion.metadata.timeframe}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleApply}
                disabled={isApplying}
                size="sm"
                className="h-8"
              >
                {isApplying ? 'Aplicando...' : 'Aplicar sugerencia'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8"
                aria-label="Copiar contenido"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              {/* Feedback buttons */}
              <Button
                variant={feedbackGiven === 'positive' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFeedback('positive')}
                className="h-8 w-8 p-0"
                aria-label="Feedback positivo"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>

              <Button
                variant={feedbackGiven === 'negative' ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => handleFeedback('negative')}
                className="h-8 w-8 p-0"
                aria-label="Feedback negativo"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                aria-label="Descartar sugerencia"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

// Component for displaying a list of AI suggestions
interface SuggestionListProps {
  suggestions: AISuggestion[]
  onApply?: (suggestion: AISuggestion) => void
  onDismiss?: (suggestionId: string) => void
  onFeedback?: (suggestionId: string, feedback: 'positive' | 'negative') => void
  loading?: boolean
  compact?: boolean
  maxItems?: number
  className?: string
}

export function SuggestionList({
  suggestions,
  onApply,
  onDismiss,
  onFeedback,
  loading = false,
  compact = false,
  maxItems,
  className
}: SuggestionListProps) {
  const displayedSuggestions = maxItems ? suggestions.slice(0, maxItems) : suggestions

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-muted rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="p-8 text-center">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            No hay sugerencias disponibles
          </h3>
          <p className="text-xs text-muted-foreground">
            La IA generará sugerencias basadas en tu contexto actual.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayedSuggestions.map((suggestion) => (
        <AISuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApply={onApply}
          onDismiss={onDismiss}
          onFeedback={onFeedback}
          compact={compact}
        />
      ))}

      {maxItems && suggestions.length > maxItems && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              +{suggestions.length - maxItems} sugerencias más disponibles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Loading states component
export function LoadingState({ type = 'suggestions' }: { type?: 'suggestions' | 'analysis' }) {
  const messages = {
    suggestions: 'Generando sugerencias...',
    analysis: 'Analizando contexto...'
  }

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {messages[type]}
        </p>
      </CardContent>
    </Card>
  )
}

export type { AISuggestion, AISuggestionCardProps, SuggestionListProps }