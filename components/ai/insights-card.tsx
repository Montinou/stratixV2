"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, RefreshCw, Sparkles, TrendingUp } from "lucide-react"
import { useState } from "react"

interface AnalyticsInsight {
  metric: string
  value: number | string
  trend?: "up" | "down" | "stable"
  recommendation?: string
}

interface InsightsCardProps {
  title: string
  insights: string | AnalyticsInsight[]
  type: "daily" | "objective" | "team"
  onRefresh?: () => void
  loading?: boolean
  analyticsData?: {
    totalObjectives?: number
    totalInitiatives?: number
    totalActivities?: number
    averageProgress?: number
    completionRate?: number
    onTrackPercentage?: number
  } | null
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

  const formatInsights = (content: string | AnalyticsInsight[]) => {
    // Handle structured analytics insights
    if (Array.isArray(content)) {
      return content.map((insight, index) => (
        <div key={index} className="mb-3 p-3 bg-accent/20 rounded-lg border border-accent">
          <div className="flex items-center justify-between mb-2">
            <strong className="text-primary">{insight.metric}</strong>
            {insight.trend && (
              <TrendingUp 
                className={`h-4 w-4 ${
                  insight.trend === 'up' ? 'text-green-500' : 
                  insight.trend === 'down' ? 'text-red-500 rotate-180' : 
                  'text-yellow-500'
                }`} 
              />
            )}
          </div>
          <div className="text-lg font-semibold text-foreground mb-1">
            {typeof insight.value === 'number' && insight.metric.includes('Progreso') ? 
              `${insight.value}%` : insight.value}
          </div>
          {insight.recommendation && (
            <p className="text-sm text-muted-foreground">{insight.recommendation}</p>
          )}
        </div>
      ))
    }

    // Handle string insights (existing functionality)
    const text = content as string
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

  const generateAnalyticsInsights = (): AnalyticsInsight[] => {
    if (!analyticsData) return []
    
    const insights: AnalyticsInsight[] = []
    
    if (analyticsData.averageProgress !== undefined) {
      insights.push({
        metric: "Progreso Promedio",
        value: analyticsData.averageProgress,
        trend: analyticsData.averageProgress >= 70 ? "up" : analyticsData.averageProgress >= 40 ? "stable" : "down",
        recommendation: analyticsData.averageProgress < 50 ? 
          "Considera revisar las estrategias actuales para acelerar el progreso." :
          "Mantén el buen ritmo de trabajo actual."
      })
    }
    
    if (analyticsData.totalObjectives !== undefined) {
      insights.push({
        metric: "Objetivos Activos",
        value: analyticsData.totalObjectives,
        trend: "stable",
        recommendation: analyticsData.totalObjectives > 5 ? 
          "Considera priorizar objetivos para mantener el enfoque." :
          "Buen balance de objetivos para mantener el enfoque."
      })
    }
    
    if (analyticsData.completionRate !== undefined) {
      insights.push({
        metric: "Tasa de Finalización",
        value: `${analyticsData.completionRate}%`,
        trend: analyticsData.completionRate >= 80 ? "up" : analyticsData.completionRate >= 60 ? "stable" : "down",
        recommendation: analyticsData.completionRate < 70 ? 
          "Analiza los objetivos rezagados para identificar obstáculos." :
          "Excelente tasa de finalización, continúa con esta dinámica."
      })
    }
    
    return insights
  }

  // Determine which insights to display
  const actualInsights = Array.isArray(insights) ? insights : 
    (analyticsData && type !== "daily" ? generateAnalyticsInsights() : insights)

  // Handle truncation for string insights only
  const shouldTruncate = typeof actualInsights === 'string' && actualInsights.length > 200
  const truncatedInsights = shouldTruncate ? actualInsights.substring(0, 200) + "..." : actualInsights
  const displayInsights = (isExpanded || Array.isArray(actualInsights)) ? actualInsights : truncatedInsights

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
          <div className="space-y-2">
            <div className="text-sm text-foreground">{formatInsights(displayInsights)}</div>

            {shouldTruncate && (
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
