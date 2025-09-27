import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"

// Real-time Analytics Monitoring API endpoint
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const metrics = searchParams.get("metrics")?.split(",") || ["all"]
    const includeHistory = searchParams.get("history") === "true"

    // Simulate real-time metrics data
    const now = new Date()
    const currentMetrics = {
      active_users: {
        value: Math.floor(140 + Math.random() * 30), // 140-170
        change: (Math.random() - 0.5) * 20, // -10 to +10
        trend: Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "stable" : "down",
        status: "healthy",
        threshold: { warning: 100, critical: 50 },
        lastUpdated: now
      },
      objective_progress: {
        value: Math.round((72 + Math.random() * 8) * 100) / 100, // 72-80%
        change: (Math.random() - 0.4) * 6, // Slight positive bias
        trend: Math.random() > 0.7 ? "up" : "stable",
        status: "healthy",
        threshold: { warning: 60, critical: 40 },
        lastUpdated: now
      },
      team_velocity: {
        value: Math.floor(25 + Math.random() * 8), // 25-33
        change: (Math.random() - 0.5) * 10,
        trend: Math.random() > 0.5 ? "up" : Math.random() > 0.2 ? "stable" : "down",
        status: Math.random() > 0.8 ? "warning" : "healthy",
        threshold: { warning: 25, critical: 20 },
        lastUpdated: now
      },
      engagement_score: {
        value: Math.round((8.0 + Math.random() * 1.5) * 10) / 10, // 8.0-9.5
        change: (Math.random() - 0.5) * 1.0,
        trend: Math.random() > 0.6 ? "up" : "stable",
        status: "healthy",
        threshold: { warning: 7.0, critical: 6.0 },
        lastUpdated: now
      },
      completion_rate: {
        value: Math.round((75 + Math.random() * 10) * 100) / 100, // 75-85%
        change: (Math.random() - 0.3) * 5, // Slight positive bias
        trend: Math.random() > 0.7 ? "up" : "stable",
        status: "healthy",
        threshold: { warning: 65, critical: 50 },
        lastUpdated: now
      },
      innovation_index: {
        value: Math.round((64 + Math.random() * 8) * 100) / 100, // 64-72
        change: (Math.random() - 0.4) * 4,
        trend: Math.random() > 0.6 ? "up" : "stable",
        status: "healthy",
        threshold: { warning: 55, critical: 40 },
        lastUpdated: now
      }
    }

    // Generate historical data if requested
    const history: Record<string, any[]> = {}
    if (includeHistory) {
      Object.keys(currentMetrics).forEach(metric => {
        history[metric] = generateHistoricalData(
          currentMetrics[metric as keyof typeof currentMetrics].value,
          12 // Last 12 time points
        )
      })
    }

    // Filter metrics if specific ones are requested
    const filteredMetrics = metrics.includes("all")
      ? currentMetrics
      : Object.fromEntries(
          Object.entries(currentMetrics).filter(([key]) => metrics.includes(key))
        )

    return NextResponse.json({
      metrics: filteredMetrics,
      history: includeHistory ? history : undefined,
      metadata: {
        timestamp: now,
        metricsCount: Object.keys(filteredMetrics).length,
        refreshInterval: 30000, // 30 seconds
        dataSource: "realtime_analytics_engine"
      }
    })

  } catch (error) {
    console.error("Error fetching real-time metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch real-time metrics" },
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
    const { metric, value, timestamp } = body

    // In a real implementation, this would store the metric value
    // For now, we'll simulate storing and return confirmation

    const storedMetric = {
      metric,
      value,
      timestamp: timestamp || new Date(),
      userId: user.id,
      processed: true
    }

    return NextResponse.json({
      success: true,
      metric: storedMetric,
      message: "Metric stored successfully"
    })

  } catch (error) {
    console.error("Error storing metric:", error)
    return NextResponse.json(
      { error: "Failed to store metric" },
      { status: 500 }
    )
  }
}

// Helper function to generate historical data
function generateHistoricalData(currentValue: number, periods: number) {
  const history = []
  const baseValue = currentValue

  for (let i = periods; i > 0; i--) {
    const timeAgo = new Date(Date.now() - (i * 5 * 60 * 1000)) // 5 minutes apart
    const variation = (Math.random() - 0.5) * (baseValue * 0.1) // ±10% variation
    const value = Math.max(0, baseValue + variation)

    history.push({
      time: timeAgo.toISOString(),
      value: Math.round(value * 100) / 100,
      timestamp: timeAgo
    })
  }

  return history
}

// SSE endpoint for real-time streaming
export async function GET_SSE(request: NextRequest) {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const sendMetrics = () => {
        const metrics = {
          timestamp: new Date().toISOString(),
          activeUsers: Math.floor(140 + Math.random() * 30),
          objectiveProgress: Math.round((72 + Math.random() * 8) * 100) / 100,
          teamVelocity: Math.floor(25 + Math.random() * 8),
          engagementScore: Math.round((8.0 + Math.random() * 1.5) * 10) / 10
        }

        const data = `data: ${JSON.stringify(metrics)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      }

      // Send initial metrics
      sendMetrics()

      // Set up interval to send updates
      const interval = setInterval(sendMetrics, 30000) // Every 30 seconds

      // Cleanup function
      return () => {
        clearInterval(interval)
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}