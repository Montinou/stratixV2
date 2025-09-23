"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Lightbulb, Target, Activity, TrendingUp, AlertTriangle, Clock } from "lucide-react"
import type { UserRole } from "@/lib/types/okr"

interface SuggestionPanelProps {
  title: string
  description: string
  department: string
  userRole: UserRole
  onSelectInitiative?: (initiative: string) => void
  onSelectActivity?: (activity: string) => void
}

interface AIResponse {
  initiatives: string[]
  activities: string[]
  keyMetrics: string[]
  timeline: string
  risks: string[]
}

export function SuggestionPanel({
  title,
  description,
  department,
  userRole,
  onSelectInitiative,
  onSelectActivity,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSuggestions = async () => {
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          department,
          companyContext: `Departamento: ${department}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate suggestions")
      }

      const result = await response.json()
      setSuggestions(result)
    } catch (err) {
      setError("No se pudieron generar sugerencias. Inténtalo de nuevo.")
      console.error("Error generating suggestions:", err)
    } finally {
      setLoading(false)
    }
  }

  // Only show for corporate users
  if (userRole !== "corporativo") {
    return null
  }

  return (
    <Card className="mt-6 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Asistente IA para OKRs
        </CardTitle>
        <CardDescription>
          Obtén sugerencias inteligentes para iniciativas, actividades y métricas basadas en tu objetivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!suggestions ? (
          <div className="text-center py-4">
            <Button onClick={generateSuggestions} disabled={loading || !title.trim()} className="w-full">
              {loading ? "Generando sugerencias..." : "Generar Sugerencias IA"}
            </Button>
            {!title.trim() && (
              <p className="text-sm text-muted-foreground mt-2">Ingresa un título para generar sugerencias</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Initiatives */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                Iniciativas Sugeridas
              </h4>
              <div className="space-y-2">
                {suggestions.initiatives.map((initiative, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-sm flex-1">{initiative}</span>
                    {onSelectInitiative && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectInitiative(initiative)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        Usar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Activities */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <Activity className="h-4 w-4 text-green-500" />
                Actividades Recomendadas
              </h4>
              <div className="grid gap-2">
                {suggestions.activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="text-sm flex-1">{activity}</span>
                    {onSelectActivity && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectActivity(activity)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        Usar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Métricas Clave
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.keyMetrics.map((metric, index) => (
                  <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                    {metric}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Cronograma Sugerido
              </h4>
              <p className="text-sm bg-orange-50 p-3 rounded-lg">{suggestions.timeline}</p>
            </div>

            <Separator />

            {/* Risks */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Riesgos y Mitigación
              </h4>
              <div className="space-y-2">
                {suggestions.risks.map((risk, index) => (
                  <div key={index} className="text-sm bg-red-50 p-3 rounded-lg">
                    {risk}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={() => setSuggestions(null)} className="w-full">
                Generar Nuevas Sugerencias
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button variant="outline" onClick={generateSuggestions}>
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
