"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Profile as DatabaseProfile, Objective as DatabaseObjective } from "@/lib/database/types"
import { useState, useEffect } from "react"
import { Users, Target, TrendingUp, Award, Building2 } from "lucide-react"

interface TeamMember extends DatabaseProfile {
  objectives?: DatabaseObjective[]
  averageProgress?: number
}

interface TeamStats {
  totalMembers: number
  totalObjectives: number
  averageProgress: number
  topPerformer: TeamMember | null
}

/**
 * Calculate team statistics from team member data
 * @param teamMembers Array of team members with objectives and progress data
 * @returns Calculated team statistics
 */
function calculateTeamStats(teamMembers: TeamMember[]): TeamStats {
  // Input validation
  if (!Array.isArray(teamMembers)) {
    throw new Error('Team members must be an array')
  }

  if (teamMembers.length === 0) {
    return {
      totalMembers: 0,
      totalObjectives: 0,
      averageProgress: 0,
      topPerformer: null,
    }
  }

  try {
    // Calculate total members
    const totalMembers = teamMembers.length

    // Calculate total objectives across all team members with validation
    const totalObjectives = teamMembers.reduce((sum, member) => {
      if (!member || typeof member !== 'object') {
        return sum // Skip invalid members
      }
      const objectivesCount = Array.isArray(member.objectives) ? member.objectives.length : 0
      return sum + Math.max(0, objectivesCount) // Ensure non-negative
    }, 0)

    // Calculate average progress across all team members with validation
    const validMembers = teamMembers.filter(member => 
      member && 
      typeof member === 'object' && 
      typeof member.averageProgress === 'number' && 
      !isNaN(member.averageProgress)
    )

    const averageProgress = validMembers.length > 0
      ? Math.round(
          validMembers.reduce((sum, member) => {
            const memberProgress = Math.max(0, Math.min(100, member.averageProgress || 0)) // Clamp between 0-100
            return sum + memberProgress
          }, 0) / validMembers.length,
        )
      : 0

    // Find top performer (member with highest average progress)
    const topPerformer = validMembers.reduce<TeamMember | null>((top, member) => {
      const memberProgress = typeof member.averageProgress === 'number' ? member.averageProgress : 0
      const topProgress = top && typeof top.averageProgress === 'number' ? top.averageProgress : 0
      
      return memberProgress > topProgress ? member : top
    }, null)

    return {
      totalMembers,
      totalObjectives,
      averageProgress,
      topPerformer,
    }
  } catch (error) {
    throw new Error(`Failed to calculate team statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export default function TeamPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalMembers: 0,
    totalObjectives: 0,
    averageProgress: 0,
    topPerformer: null,
  })

  const fetchTeamData = async () => {
    if (!profile) return

    setLoading(true)

    try {
      // Check role access first
      if (profile.role === "empleado") {
        setLoading(false)
        return
      }

      // Build query parameters for profiles API based on role
      const profilesUrl = new URL('/api/profiles', window.location.origin)
      
      if (profile.role === "gerente") {
        // Gerentes ven su equipo (subordinados directos)
        // Note: API needs to be updated to support manager_id filter
        profilesUrl.searchParams.set('department', profile.department || '')
        profilesUrl.searchParams.set('roleType', 'empleado') // Gerentes manage empleados
      } else if (profile.role === "corporativo") {
        // Corporativo ve todos los usuarios (except themselves)
        // No additional filters needed - will exclude self server-side
      }

      // Fetch team members via profiles API
      const profilesResponse = await fetch(profilesUrl.toString())
      const profilesResult = await profilesResponse.json()

      if (!profilesResponse.ok || !profilesResult.success) {
        throw new Error(profilesResult.error || 'Failed to fetch team members')
      }

      const members = profilesResult.data || []

      // Filter out self for corporativo role (client-side as backup)
      const filteredMembers = profile.role === "corporativo" 
        ? members.filter((member: any) => member.userId !== profile.id)
        : members

      // Fetch objectives for each team member using objectives API
      const membersWithObjectives = await Promise.all(
        filteredMembers.map(async (member: any) => {
          try {
            const objectivesUrl = new URL('/api/objectives', window.location.origin)
            objectivesUrl.searchParams.set('userId', profile.id) // Current user context
            objectivesUrl.searchParams.set('userRole', profile.role)
            objectivesUrl.searchParams.set('userDepartment', profile.department || '')
            objectivesUrl.searchParams.set('ownerId', member.userId) // Filter objectives by owner

            const objectivesResponse = await fetch(objectivesUrl.toString())
            const objectivesResult = await objectivesResponse.json()

            let objectives = []
            if (objectivesResponse.ok && objectivesResult.data) {
              // Filter objectives by this specific member
              objectives = objectivesResult.data.filter((obj: any) => obj.ownerId === member.userId)
            }

            const averageProgress = objectives.length
              ? Math.round(objectives.reduce((sum: number, obj: any) => sum + (obj.progress || 0), 0) / objectives.length)
              : 0

            return {
              ...member,
              objectives,
              averageProgress,
            }
          } catch (error) {
            console.error(`Error fetching objectives for member ${member.userId}:`, error)
            return {
              ...member,
              objectives: [],
              averageProgress: 0,
            }
          }
        }),
      )

      setTeamMembers(membersWithObjectives)

      // Calculate team stats using the extracted function with error handling
      try {
        const calculatedStats = calculateTeamStats(membersWithObjectives)
        setTeamStats(calculatedStats)
      } catch (statsError) {
        console.error("Error calculating team statistics:", statsError)
        // Set default stats on calculation error
        setTeamStats({
          totalMembers: membersWithObjectives.length,
          totalObjectives: 0,
          averageProgress: 0,
          topPerformer: null,
        })
      }
    } catch (error) {
      console.error("Error fetching team data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [profile])

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "corporativo":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "gerente":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "empleado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "corporativo":
        return "Corporativo"
      case "gerente":
        return "Gerente"
      case "empleado":
        return "Empleado"
      default:
        return role
    }
  }

  if (profile?.role === "empleado") {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
              <p className="text-muted-foreground text-center">
                Esta sección está disponible solo para gerentes y usuarios corporativos.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Gestión de Equipo
            </h1>
            <p className="text-muted-foreground">
              {profile?.role === "corporativo"
                ? "Supervisa el rendimiento de toda la organización"
                : `Gestiona tu equipo del departamento ${profile?.department}`}
            </p>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros del Equipo</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {profile?.role === "corporativo" ? "Total organización" : "Reportan a ti"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Objetivos Activos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalObjectives}</div>
              <p className="text-xs text-muted-foreground">Objetivos del equipo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.averageProgress}%</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.averageProgress >= 70 ? "Excelente rendimiento" : "Necesita atención"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.topPerformer?.averageProgress || 0}%</div>
              <p className="text-xs text-muted-foreground truncate">{teamStats.topPerformer?.fullName || "N/A"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Miembros del Equipo</CardTitle>
            <CardDescription>Rendimiento individual y progreso de objetivos</CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay miembros del equipo</h3>
                <p className="text-muted-foreground">
                  {profile?.role === "gerente"
                    ? "Aún no tienes empleados asignados a tu equipo."
                    : "No hay usuarios registrados en el sistema."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">{member.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{member.fullName}</h4>
                          <Badge className={getRoleBadgeColor(member.roleType)}>{getRoleLabel(member.roleType)}</Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {member.department && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {member.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2 min-w-[200px]">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progreso promedio:</span>
                        <span className="font-medium">{member.averageProgress}%</span>
                      </div>
                      <Progress value={member.averageProgress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {member.objectives?.length || 0} objetivos activos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance Insights */}
        {teamMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Insights del Equipo</CardTitle>
              <CardDescription>Análisis automático del rendimiento del equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-primary">Fortalezas del Equipo</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {teamStats.averageProgress >= 70
                          ? "El equipo mantiene un excelente progreso promedio"
                          : "Hay oportunidades de mejora en el progreso general"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {teamStats.totalObjectives > teamStats.totalMembers * 2
                          ? "El equipo está altamente comprometido con múltiples objetivos"
                          : "El equipo mantiene un enfoque balanceado en sus objetivos"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-primary">Recomendaciones</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Considera reuniones regulares de seguimiento para mantener el momentum
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Reconoce públicamente los logros del top performer para motivar al equipo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
