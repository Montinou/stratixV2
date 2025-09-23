"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "./status-badge"
import { ProgressBar } from "./progress-bar"
import type { Initiative } from "@/lib/types/okr"
import { Calendar, User, Target, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface InitiativeCardProps {
  initiative: Initiative
  onEdit?: (initiative: Initiative) => void
  onDelete?: (initiative: Initiative) => void
  onViewDetails?: (initiative: Initiative) => void
}

export function InitiativeCard({ initiative, onEdit, onDelete, onViewDetails }: InitiativeCardProps) {
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

  const daysRemaining = getDaysRemaining(initiative.end_date)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-2">{initiative.title}</CardTitle>
            {initiative.description && (
              <CardDescription className="line-clamp-2">{initiative.description}</CardDescription>
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
                <DropdownMenuItem onClick={() => onViewDetails(initiative)}>Ver Detalles</DropdownMenuItem>
              )}
              {onEdit && <DropdownMenuItem onClick={() => onEdit(initiative)}>Editar</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(initiative)} className="text-destructive">
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
          <StatusBadge status={initiative.status} />
          <span className="text-sm font-medium">{initiative.progress}%</span>
        </div>

        <ProgressBar progress={initiative.progress} showLabel={false} />

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{initiative.owner?.full_name || "Sin asignar"}</span>
          </div>

          {initiative.objective && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="line-clamp-1">{initiative.objective.title}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(initiative.start_date)} - {formatDate(initiative.end_date)}
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
