'use client'

import * as React from 'react'
import { HelpCircle, Lightbulb, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export interface AITooltipContent {
  type: 'simple' | 'rich' | 'contextual'
  title?: string
  content: string
  confidence?: number
  category?: 'help' | 'suggestion' | 'warning' | 'success' | 'info'
  actions?: {
    label: string
    action: () => void
    variant?: 'default' | 'secondary' | 'outline'
  }[]
  examples?: string[]
  learnMore?: {
    url: string
    label: string
  }
}

interface AITooltipProps {
  content: AITooltipContent
  children: React.ReactNode
  trigger?: 'hover' | 'click' | 'focus'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delay?: number
  interactive?: boolean
  disabled?: boolean
  className?: string
}

const CATEGORY_CONFIG = {
  help: {
    icon: HelpCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  suggestion: {
    icon: Lightbulb,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  info: {
    icon: Info,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    borderColor: 'border-slate-200 dark:border-slate-800'
  }
}

export function AITooltip({
  content,
  children,
  trigger = 'hover',
  side = 'top',
  align = 'center',
  delay = 200,
  interactive = false,
  disabled = false,
  className
}: AITooltipProps) {
  const categoryConfig = CATEGORY_CONFIG[content.category || 'info']
  const IconComponent = categoryConfig.icon

  // Simple tooltip for basic content
  if (content.type === 'simple' && !interactive) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={delay}>
          <TooltipTrigger asChild className={className}>
            {children}
          </TooltipTrigger>
          <TooltipContent
            side={side}
            align={align}
            className={cn(
              'max-w-xs',
              categoryConfig.bgColor,
              categoryConfig.borderColor
            )}
          >
            <div className="flex items-start space-x-2">
              <IconComponent className={cn('h-4 w-4 mt-0.5', categoryConfig.color)} />
              <div className="text-sm">
                {content.title && (
                  <p className="font-medium mb-1">{content.title}</p>
                )}
                <p className="text-muted-foreground leading-relaxed">
                  {content.content}
                </p>
                {content.confidence && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-muted-foreground">Confianza:</span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(content.confidence * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Rich popover for complex content
  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild className={className}>
          {children}
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          className="w-80 p-0"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className={cn(
              'pb-3',
              categoryConfig.bgColor,
              categoryConfig.borderColor,
              'border-b'
            )}>
              <div className="flex items-center space-x-2">
                <IconComponent className={cn('h-5 w-5', categoryConfig.color)} />
                <div className="flex-1">
                  {content.title && (
                    <CardTitle className="text-sm font-medium">
                      {content.title}
                    </CardTitle>
                  )}
                  {content.confidence && (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Confianza IA:
                      </span>
                      <Badge
                        variant={content.confidence > 0.8 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {Math.round(content.confidence * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.content}
              </p>

              {content.examples && content.examples.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Ejemplos:
                    </h4>
                    <ul className="space-y-1">
                      {content.examples.map((example, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.actions && content.actions.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {content.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'outline'}
                        onClick={action.action}
                        className="text-xs h-7"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {content.learnMore && (
                <div className="space-y-2">
                  <Separator />
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={() => window.open(content.learnMore!.url, '_blank')}
                  >
                    {content.learnMore.label} →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}

// Convenience wrapper for contextual help
interface ContextualHelpProps {
  context: string
  position?: string
  fieldName?: string
  children: React.ReactNode
  className?: string
}

export function ContextualHelp({
  context,
  position,
  fieldName,
  children,
  className
}: ContextualHelpProps) {
  // In a real implementation, this would call an AI service
  // to get contextual help based on the current form state/position
  const getContextualContent = React.useCallback((): AITooltipContent => {
    // Mock AI-generated contextual help
    const helpMap: Record<string, AITooltipContent> = {
      'objectives-title': {
        type: 'rich',
        title: 'Título del Objetivo',
        content: 'Un buen título de objetivo debe ser claro, específico y inspirador. Evita jerga técnica y sé conciso.',
        confidence: 0.92,
        category: 'suggestion',
        examples: [
          'Aumentar satisfacción del cliente',
          'Mejorar eficiencia operacional',
          'Expandir presencia en el mercado'
        ],
        actions: [
          {
            label: 'Sugerir títulos',
            action: () => console.log('Generate suggestions'),
            variant: 'default'
          }
        ]
      },
      'key-results': {
        type: 'rich',
        title: 'Key Results',
        content: 'Los Key Results deben ser específicos, medibles, alcanzables, relevantes y con límite de tiempo (SMART).',
        confidence: 0.87,
        category: 'help',
        examples: [
          'Aumentar NPS de 7 a 8.5 en Q4',
          'Reducir tiempo de respuesta a 2h',
          'Conseguir 100 nuevos clientes'
        ],
        learnMore: {
          url: 'https://example.com/okr-guide',
          label: 'Aprende más sobre OKRs'
        }
      }
    }

    return helpMap[fieldName || context] || {
      type: 'simple',
      content: 'Ayuda contextual no disponible para este campo.',
      category: 'info',
      confidence: 0.5
    }
  }, [context, fieldName])

  const tooltipContent = getContextualContent()

  return (
    <AITooltip
      content={tooltipContent}
      trigger="click"
      interactive={true}
      className={className}
    >
      {children}
    </AITooltip>
  )
}

// Component for triggering contextual help
interface HelpTriggerProps {
  context: string
  fieldName?: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function HelpTrigger({
  context,
  fieldName,
  size = 'sm',
  className
}: HelpTriggerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <ContextualHelp context={context} fieldName={fieldName}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-muted-foreground hover:text-foreground',
          sizeClasses[size],
          'p-0',
          className
        )}
        aria-label="Obtener ayuda contextual"
      >
        <HelpCircle className={sizeClasses[size]} />
      </Button>
    </ContextualHelp>
  )
}

export type { AITooltipContent, AITooltipProps, ContextualHelpProps, HelpTriggerProps }