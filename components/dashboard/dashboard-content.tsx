"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { Target } from "lucide-react"
import Link from "next/link"
import type { Objective, Initiative, Activity as ActivityType, Profile } from "@/lib/database/services"
import { getObjectives } from "@/lib/actions/objectives"
import { getInitiatives } from "@/lib/actions/initiatives"
import { getActivities } from "@/lib/actions/activities"

interface DashboardContentProps {
  profile: Profile
}

export function DashboardContent({ profile }: DashboardContentProps) {
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    objectives: 0,
    initiatives: 0,
    activities: 0,
    averageProgress: 0,
  })
  const [recentObjectives, setRecentObjectives] = useState<Objective[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<(Objective | Initiative | ActivityType)[]>([])

  const progressOverviewData = [
    { name: "Completados", value: 25, color: "hsl(var(--chart-1))" },
    { name: "En Progreso", value: 45, color: "hsl(var(--chart-2))" },
    { name: "No Iniciados", value: 20, color: "hsl(var(--chart-3))" },
    { name: "Pausados", value: 10, color: "hsl(var(--chart-4))" },
  ]

  const progressTrendData = [
    { month: "Ene", objectives: 65, initiatives: 70, activities: 75 },
    { month: "Feb", objectives: 68, initiatives: 72, activities: 78 },
    { month: "Mar", objectives: 70, initiatives: 75, activities: 80 },
    { month: "Abr", objectives: 72, initiatives: 78, activities: 82 },
    { month: "May", objectives: 75, initiatives: 80, activities: 85 },
    { month: "Jun", objectives: 78, initiatives: 82, activities: 87 },
  ]

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)

    try {
      const [objectivesResult, initiativesResult, activitiesResult] = await Promise.all([
        getObjectives(),
        getInitiatives(),
        getActivities(),
      ])

      const objectives = objectivesResult.data || []
      const initiatives = initiativesResult.data || []
      const activities = activitiesResult.data || []

      const allItems = [...objectives, ...initiatives, ...activities]
      const averageProgress = allItems.length
        ? Math.round(allItems.reduce((sum, item) => sum + (item.progress || 0), 0) / allItems.length)
        : 0

      setStats({
        objectives: objectives.length,
        initiatives: initiatives.length,
        activities: activities.length,
        averageProgress,
      })

      setRecentObjectives(objectives.slice(0, 3))
      setUpcomingDeadlines(objectives.slice(0, 3))
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido de vuelta, {profile?.full_name}. Aquí tienes un resumen de tus OKRs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/objectives">
                <Target className="mr-2 h-4 w-4" />
                Nuevo Objetivo
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
