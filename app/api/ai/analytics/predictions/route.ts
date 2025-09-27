import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"

// Predictive Analytics API endpoint
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "6months"
    const metric = searchParams.get("metric") || "all"

    // Simulate AI-powered predictive analytics
    const predictions = {
      performance: {
        current: 78,
        predicted: [
          { period: "Q3 2025", value: 82, confidence: 92 },
          { period: "Q4 2025", value: 85, confidence: 88 },
          { period: "Q1 2026", value: 88, confidence: 82 },
        ],
        factors: [
          { name: "Team Collaboration", impact: 15, trend: "up" },
          { name: "Process Optimization", impact: 12, trend: "up" },
          { name: "Resource Allocation", impact: 8, trend: "stable" },
        ]
      },
      completion_rate: {
        current: 74,
        predicted: [
          { period: "Next Month", value: 78, confidence: 94 },
          { period: "Next Quarter", value: 82, confidence: 89 },
          { period: "Next Half", value: 85, confidence: 84 },
        ],
        factors: [
          { name: "Milestone Tracking", impact: 18, trend: "up" },
          { name: "Team Motivation", impact: 14, trend: "up" },
          { name: "Workload Distribution", impact: 10, trend: "stable" },
        ]
      },
      team_efficiency: {
        current: 82,
        predicted: [
          { period: "2 Weeks", value: 78, confidence: 78 },
          { period: "1 Month", value: 80, confidence: 72 },
          { period: "3 Months", value: 84, confidence: 68 },
        ],
        factors: [
          { name: "Workload Increase", impact: -12, trend: "down" },
          { name: "Tool Adoption", impact: 8, trend: "up" },
          { name: "Training Programs", impact: 6, trend: "up" },
        ]
      },
      innovation_index: {
        current: 65,
        predicted: [
          { period: "1 Month", value: 68, confidence: 85 },
          { period: "3 Months", value: 72, confidence: 80 },
          { period: "6 Months", value: 75, confidence: 75 },
        ],
        factors: [
          { name: "R&D Investment", impact: 20, trend: "up" },
          { name: "Cross-team Collaboration", impact: 15, trend: "up" },
          { name: "External Partnerships", impact: 10, trend: "stable" },
        ]
      }
    }

    // Filter by metric if specified
    const filteredPredictions = metric === "all"
      ? predictions
      : { [metric]: predictions[metric as keyof typeof predictions] }

    return NextResponse.json({
      predictions: filteredPredictions,
      metadata: {
        timeRange,
        metric,
        generatedAt: new Date(),
        modelVersion: "v2.1.3",
        algorithmUsed: "ensemble_forecasting"
      }
    })

  } catch (error) {
    console.error("Error generating predictions:", error)
    return NextResponse.json(
      { error: "Failed to generate predictions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { dataPoints, metric, timeHorizon } = body

    // Simulate AI model training and prediction generation
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate custom predictions based on provided data
    const customPrediction = {
      metric,
      timeHorizon,
      baselineValue: dataPoints[dataPoints.length - 1]?.value || 0,
      predictions: generateCustomPredictions(dataPoints, timeHorizon),
      confidence: calculateConfidence(dataPoints),
      insights: generatePredictionInsights(dataPoints, metric),
      generatedAt: new Date()
    }

    return NextResponse.json({ prediction: customPrediction })

  } catch (error) {
    console.error("Error generating custom prediction:", error)
    return NextResponse.json(
      { error: "Failed to generate custom prediction" },
      { status: 500 }
    )
  }
}

// Helper functions for custom predictions
function generateCustomPredictions(dataPoints: any[], timeHorizon: string) {
  const lastValue = dataPoints[dataPoints.length - 1]?.value || 0
  const trend = calculateTrend(dataPoints)
  const periods = timeHorizon === "short" ? 4 : timeHorizon === "medium" ? 8 : 12

  const predictions = []
  for (let i = 1; i <= periods; i++) {
    const predictedValue = Math.max(0, Math.min(100,
      lastValue + (trend * i) + (Math.random() - 0.5) * 5
    ))
    predictions.push({
      period: `Period ${i}`,
      value: Math.round(predictedValue * 100) / 100,
      confidence: Math.max(60, 95 - (i * 3)) // Decreasing confidence over time
    })
  }

  return predictions
}

function calculateTrend(dataPoints: any[]) {
  if (dataPoints.length < 2) return 0

  const recent = dataPoints.slice(-3)
  const older = dataPoints.slice(-6, -3)

  const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length
  const olderAvg = older.length > 0 ? older.reduce((sum, p) => sum + p.value, 0) / older.length : recentAvg

  return (recentAvg - olderAvg) / Math.max(1, older.length)
}

function calculateConfidence(dataPoints: any[]) {
  // Simple confidence calculation based on data consistency
  if (dataPoints.length < 3) return 60

  const values = dataPoints.map(p => p.value)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const standardDeviation = Math.sqrt(variance)

  // Lower variance = higher confidence
  return Math.min(95, Math.max(60, 95 - (standardDeviation * 2)))
}

function generatePredictionInsights(dataPoints: any[], metric: string) {
  const trend = calculateTrend(dataPoints)
  const isImproving = trend > 0
  const changeRate = Math.abs(trend)

  const insights = []

  if (isImproving) {
    insights.push(`La tendencia de ${metric} muestra una mejora sostenida con una tasa de crecimiento del ${changeRate.toFixed(1)}% por período.`)
  } else {
    insights.push(`Se observa una tendencia descendente en ${metric} que requiere atención inmediata.`)
  }

  if (changeRate > 5) {
    insights.push("La volatilidad es alta, lo que sugiere factores externos significativos.")
  } else if (changeRate < 1) {
    insights.push("La métrica muestra estabilidad, lo que es positivo para la predictibilidad.")
  }

  return insights
}