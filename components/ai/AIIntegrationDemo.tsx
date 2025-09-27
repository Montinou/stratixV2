'use client'

import * as React from 'react'
import { Target, Lightbulb, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Import our new AI components
import { FloatingAIChat } from './FloatingAIChat'
import { AITooltip, ContextualHelp, HelpTrigger } from './AITooltip'
import { AISuggestionCard, SuggestionList, LoadingState } from './AISuggestionCard'
import { useAI } from '@/lib/hooks/use-ai'
import { useAIChat, useAIPreferences } from '@/lib/stores/ai-store'
import type { AISuggestion } from './AISuggestionCard'

/**
 * Demo component to showcase AI integration with shadcn components
 * This demonstrates all 4 streams working together
 */
export function AIIntegrationDemo() {
  const [formData, setFormData] = React.useState({
    objective: '',
    keyResult: '',
    department: 'engineering',
    priority: 'medium'
  })

  // AI hooks
  const {
    suggestions,
    loadingSuggestions,
    getSuggestions,
    applySuggestion,
    dismissSuggestion,
    provideFeedback
  } = useAI({
    context: {
      page: 'objectives',
      section: 'create',
      formData,
      department: formData.department
    }
  })

  // AI store hooks
  const { isOpen, toggle, position } = useAIChat()
  const { preferences } = useAIPreferences()

  // Load suggestions on mount
  React.useEffect(() => {
    getSuggestions()
  }, [getSuggestions])

  const handleApplySuggestion = async (suggestion: AISuggestion) => {
    await applySuggestion(suggestion)

    // Apply the suggestion to form based on type
    if (suggestion.type === 'objective') {
      setFormData(prev => ({ ...prev, objective: suggestion.content }))
    } else if (suggestion.type === 'key-result') {
      setFormData(prev => ({ ...prev, keyResult: suggestion.content }))
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Demo: Integración IA con shadcn</h1>
        <p className="text-muted-foreground">
          Demostración de todos los componentes de IA trabajando juntos
        </p>
        <div className="flex items-center justify-center space-x-2">
          <Badge variant={preferences.enabled ? 'default' : 'secondary'}>
            IA {preferences.enabled ? 'Activada' : 'Desactivada'}
          </Badge>
          <Badge variant="outline">
            Tema: {preferences.theme}
          </Badge>
          <Badge variant="outline">
            Posición Chat: {position}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form - Stream A Integration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Crear Objetivo</span>
                {/* Stream B: Contextual Help */}
                <ContextualHelp context="objective-form" fieldName="objective-create">
                  <HelpTrigger context="objective-form" className="ml-2" />
                </ContextualHelp>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Objective input with AI tooltip */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="objective">Título del Objetivo</Label>
                  <AITooltip
                    content={{
                      type: 'simple',
                      content: 'Un buen objetivo debe ser claro, inspirador y alcanzable.',
                      category: 'help',
                      confidence: 0.9
                    }}
                  >
                    <HelpTrigger context="objectives-title" />
                  </AITooltip>
                </div>
                <Textarea
                  id="objective"
                  placeholder="Describe tu objetivo principal..."
                  value={formData.objective}
                  onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              {/* Key Result input with contextual help */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="keyResult">Key Result</Label>
                  <ContextualHelp context="key-results" fieldName="key-results">
                    <HelpTrigger context="key-results" />
                  </ContextualHelp>
                </div>
                <Textarea
                  id="keyResult"
                  placeholder="Define un resultado clave medible..."
                  value={formData.keyResult}
                  onChange={(e) => setFormData(prev => ({ ...prev, keyResult: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              {/* Department selector */}
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="engineering">Ingeniería</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Ventas</option>
                  <option value="hr">Recursos Humanos</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => getSuggestions()} disabled={loadingSuggestions}>
                  {loadingSuggestions ? 'Generando...' : 'Obtener Sugerencias IA'}
                </Button>
                <Button variant="outline" onClick={toggle}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {isOpen ? 'Cerrar' : 'Abrir'} Chat IA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions Panel - Stream C */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Sugerencias IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSuggestions ? (
                <LoadingState type="suggestions" />
              ) : (
                <SuggestionList
                  suggestions={suggestions}
                  onApply={handleApplySuggestion}
                  onDismiss={dismissSuggestion}
                  onFeedback={provideFeedback}
                  compact={true}
                  maxItems={3}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sugerencias Detalladas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.slice(0, 2).map((suggestion) => (
              <AISuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApplySuggestion}
                onDismiss={dismissSuggestion}
                onFeedback={provideFeedback}
                compact={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tooltip Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Ejemplos de Tooltips IA</h2>
        <div className="flex flex-wrap gap-4">
          <AITooltip
            content={{
              type: 'simple',
              content: 'Tooltip simple con información básica.',
              category: 'info'
            }}
          >
            <Button variant="outline">Tooltip Simple</Button>
          </AITooltip>

          <AITooltip
            content={{
              type: 'rich',
              title: 'Tooltip Rico',
              content: 'Este tooltip tiene más funcionalidades como ejemplos y acciones.',
              confidence: 0.85,
              category: 'suggestion',
              examples: ['Ejemplo 1', 'Ejemplo 2'],
              actions: [
                {
                  label: 'Acción de prueba',
                  action: () => alert('¡Acción ejecutada!'),
                  variant: 'default'
                }
              ]
            }}
            interactive={true}
          >
            <Button variant="outline">Tooltip Rico</Button>
          </AITooltip>

          <AITooltip
            content={{
              type: 'rich',
              title: 'Advertencia',
              content: 'Este es un ejemplo de tooltip de advertencia.',
              confidence: 0.95,
              category: 'warning'
            }}
          >
            <Button variant="destructive">Tooltip Advertencia</Button>
          </AITooltip>
        </div>
      </div>

      {/* Floating AI Chat - Stream A */}
      <FloatingAIChat
        isOpen={isOpen}
        onToggle={toggle}
        position={position}
        theme={preferences.theme}
        initialContext={{
          page: 'demo',
          section: 'integration-test',
          department: formData.department
        }}
      />
    </div>
  )
}

export default AIIntegrationDemo