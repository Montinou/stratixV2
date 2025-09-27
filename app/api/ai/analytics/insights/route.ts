import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { generateAnalyticsInsights } from "@/lib/ai/insights-generator"
import type { AnalyticsRequest } from "@/lib/ai/analytics-engine"

// AI Analytics Insights API endpoint following AI Gateway patterns
export async function GET(request: NextRequest) {
  try {
    // Check authentication following NEON_STACK_AUTH_SETUP patterns
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRangeParam = searchParams.get("timeRange") || "6months"
    const category = searchParams.get("category") || "all"
    const analysisType = (searchParams.get("analysisType") as any) || "performance"
    const teamId = searchParams.get("teamId") || undefined
    const includeRecommendations = searchParams.get("includeRecommendations") === "true"
    const benchmarkAgainst = (searchParams.get("benchmarkAgainst") as any) || "company"

    // Parse time range
    const timeRange = parseTimeRange(timeRangeParam)

    // Build analytics request
    const analyticsRequest: AnalyticsRequest = {
      timeRange,
      analysisType,
      teamId,
      includeRecommendations,
      benchmarkAgainst
    }

    // Generate insights using the comprehensive analytics engine
    const result = await generateAnalyticsInsights(analyticsRequest, user.id)

    // Filter insights by category if specified
    const filteredInsights = category === "all"
      ? result.insights
      : result.insights.filter(insight => insight.category === category)

    return NextResponse.json({
      ...result,
      insights: filteredInsights,
      metadata: {
        ...result.metadata,
        timeRange: timeRangeParam,
        category,
        filteredInsights: filteredInsights.length,
        userId: user.id
      }
    })

  } catch (error) {
    console.error("Error generating AI insights:", error)
    return NextResponse.json(
      {
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication following NEON_STACK_AUTH_SETUP patterns
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      okrIds,
      teamId,
      timeRange: timeRangeRequest,
      analysisType = 'comprehensive',
      includeRecommendations = true,
      benchmarkAgainst = 'company'
    } = body

    // Parse time range from request
    const timeRange = timeRangeRequest ? {
      start: new Date(timeRangeRequest.start),
      end: new Date(timeRangeRequest.end)
    } : parseTimeRange('6months')

    // Build comprehensive analytics request
    const analyticsRequest: AnalyticsRequest = {
      okrIds,
      teamId,
      timeRange,
      analysisType,
      includeRecommendations,
      benchmarkAgainst
    }

    // Generate comprehensive insights using the analytics engine
    const result = await generateAnalyticsInsights(analyticsRequest, user.id)

    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        request: analyticsRequest,
        userId: user.id,
        generated_at: new Date()
      }
    })

  } catch (error) {
    console.error("Error generating comprehensive insights:", error)

    // Return structured error response
    return NextResponse.json(
      {
        error: "Failed to generate comprehensive insights",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to parse time range from string parameter
 */
function parseTimeRange(timeRangeParam: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start: Date

  switch (timeRangeParam) {
    case '1month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case '3months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6months':
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case '1year':
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    case 'ytd': // Year to date
      start = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      // For custom ranges, default to 6 months (should be provided in request body)
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
  }

  return { start, end }
}