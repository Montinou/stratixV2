'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, Target, TrendingUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ObjectiveCardProps {
  objective: {
    id: string;
    title: string;
    description?: string;
    areaId: string | null;
    areaName?: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    progressPercentage: number;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    startDate: Date;
    endDate: Date;
    assignedTo?: {
      name: string;
      avatar?: string;
    };
    initiativesCount: number;
  };
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
}

const statusLabels = {
  draft: 'Borrador',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

export function ObjectiveCard({ objective, onEdit, onView }: ObjectiveCardProps) {
  const isOverdue = objective.endDate < new Date() && objective.status !== 'completed';

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{objective.title}</CardTitle>
            {objective.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {objective.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={statusColors[objective.status]}>
              {statusLabels[objective.status]}
            </Badge>
            <Badge className={priorityColors[objective.priority]}>
              {priorityLabels[objective.priority]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progreso</span>
            <span className="text-sm text-muted-foreground">
              {objective.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={objective.progressPercentage} className="h-2" />
        </div>

        {/* Target Value */}
        {objective.targetValue && (
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {objective.currentValue?.toFixed(1) || 0} / {objective.targetValue.toFixed(1)}
              {objective.unit && ` ${objective.unit}`}
            </span>
          </div>
        )}

        {/* Area & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>{objective.areaName || 'Sin área'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(objective.startDate, 'dd MMM', { locale: es })} - {' '}
              {format(objective.endDate, 'dd MMM yyyy', { locale: es })}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Vencido
              </Badge>
            )}
          </div>
        </div>

        {/* Assigned User */}
        {objective.assignedTo && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{objective.assignedTo.name}</span>
          </div>
        )}

        {/* Initiatives Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {objective.initiativesCount} iniciativa{objective.initiativesCount !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(objective.id)}>
                Ver Detalles
              </Button>
            )}
            {onEdit && (
              <Button variant="default" size="sm" onClick={() => onEdit(objective.id)}>
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}