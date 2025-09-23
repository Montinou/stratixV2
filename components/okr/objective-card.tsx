"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "./status-badge"
import { ProgressBar } from "./progress-bar"
import type { Objective } from "@/lib/types/okr"
import { Calendar, User, Building2, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ObjectiveCardProps {
  objective: Objective
  onEdit?: (objective: Objective) => void
  onDelete?: (objective: Objective) => void
  onViewDetails?: (objective: Objective) => void
}

export function ObjectiveCard({ objective, onEdit, onDelete, onViewDetails }: ObjectiveCardProps) {
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

  const daysRemaining = getDaysRemaining(objective.end_date)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-2">{objective.title}</CardTitle>
            {objective.description && (
              <CardDescription className="line-clamp-2">{objective.description}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(objective)}>Ver Detalles</DropdownMenuItem>
              )}
              {onEdit && <DropdownMenuItem onClick={() => onEdit(objective)}>Editar</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(objective)} className="text-destructive">
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
          <StatusBadge status={objective.status} />
          <span className="text-sm font-medium">{objective.progress}%</span>
        </div>

        <ProgressBar progress={objective.progress} showLabel={false} />

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{objective.owner?.full_name || "Sin asignar"}</span>
          </div>

          {objective.department && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{objective.department}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(objective.start_date)} - {formatDate(objective.end_date)}
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
