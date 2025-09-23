"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "./status-badge"
import { ProgressBar } from "./progress-bar"
import type { Activity } from "@/lib/types/okr"
import { Calendar, User, CheckSquare, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ActivityCardProps {
  activity: Activity
  onEdit?: (activity: Activity) => void
  onDelete?: (activity: Activity) => void
  onViewDetails?: (activity: Activity) => void
}

export function ActivityCard({ activity, onEdit, onDelete, onViewDetails }: ActivityCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getDaysRemaining = (endDate: string) => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining(activity.end_date)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-2">{activity.title}</CardTitle>
            {activity.description && <CardDescription className="line-clamp-2">{activity.description}</CardDescription>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(activity)}>Ver Detalles</DropdownMenuItem>
              )}
              {onEdit && <DropdownMenuItem onClick={() => onEdit(activity)}>Editar</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(activity)} className="text-destructive">
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Progress */}
        <div className="flex items-center justify-between">
          <StatusBadge status={activity.status} />
          <span className="text-sm font-medium">{activity.progress}%</span>
        </div>

        <ProgressBar progress={activity.progress} showLabel={false} />

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{activity.owner?.full_name || "Sin asignar"}</span>
          </div>

          {activity.initiative && (
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="line-clamp-1">{activity.initiative.title}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
            </span>
          </div>

          {daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span>Días restantes:</span>
              <Badge variant={daysRemaining <= 7 ? "destructive" : daysRemaining <= 30 ? "secondary" : "outline"}>
                {daysRemaining} días
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
