"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, RefreshCw, Sparkles, TrendingUp } from "lucide-react"
import { useState } from "react"

interface InsightsCardProps {
  title: string
  insights: string
  type: "daily" | "objective" | "team"
  onRefresh?: () => void
  loading?: boolean
  analyticsData?: {
    totalObjectives?: number
    averageProgress?: number
    completionRate?: number
    onTrackPercentage?: number
  }
}

export function InsightsCard({ title, insights, type, onRefresh, loading, analyticsData }: InsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getIcon = () => {
    switch (type) {
      case "daily":
        return <Sparkles className="h-5 w-5" />
      case "objective":
        return <TrendingUp className="h-5 w-5" />
      case "team":
        return <Lightbulb className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
    }
  }

  const getBadgeText = () => {
    switch (type) {
      case "daily":
        return "Insights Diarios"
      case "objective":
        return "Recomendaciones"
      case "team":
        return "Análisis de Equipo"
      default:
        return "IA"
    }
  }

  const formatInsights = (text: string) => {
    // Split by numbered lists and bullet points for better formatting
    const paragraphs = text.split("\n").filter((p) => p.trim())

    return paragraphs.map((paragraph, index) => {
      if (paragraph.match(/^\d+\./)) {
        return (
          <div key={index} className="mb-2">
            <strong className="text-primary">{paragraph.split(".")[0]}.</strong>
            <span className="ml-1">{paragraph.split(".").slice(1).join(".")}</span>
          </div>
        )
      } else if (paragraph.startsWith("•") || paragraph.startsWith("-")) {
        return (
          <div key={index} className="mb-1 ml-4">
            <span className="text-primary mr-2">•</span>
            {paragraph.replace(/^[•-]\s*/, "")}
          </div>
        )
      } else {
        return (
          <p key={index} className="mb-3 leading-relaxed">
            {paragraph}
          </p>
        )
      }
    })
  }

  const truncatedInsights = insights.length > 200 ? insights.substring(0, 200) + "..." : insights
  const displayInsights = isExpanded ? insights : truncatedInsights

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">{getIcon()}</div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getBadgeText()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  IA Generada
                </Badge>
              </div>
            </div>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Generando insights...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Analytics Summary */}
            {analyticsData && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-accent/30 rounded-lg border">
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">
                    {analyticsData.averageProgress || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Progreso Promedio</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">
                    {analyticsData.onTrackPercentage || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">En Progreso</p>
                </div>
              </div>
            )}

            <div className="text-sm text-foreground">{formatInsights(displayInsights)}</div>

            {insights.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary hover:text-primary/80 p-0 h-auto font-normal"
              >
                {isExpanded ? "Ver menos" : "Ver más"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
