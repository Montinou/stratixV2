'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InitiativeCardProps {
  initiative: {
    id: string;
    title: string;
    description?: string;
    status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    progressPercentage: number;
    budget?: number;
    startDate: Date;
    endDate: Date;
    objectiveTitle: string;
    assignedTo?: {
      name: string;
      avatar?: string;
    };
    activitiesCount: number;
  };
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
}

const statusLabels = {
  planning: 'Planificación',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

const statusColors = {
  planning: 'bg-gray-100 text-gray-800',
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

export function InitiativeCard({ initiative, onEdit, onView }: InitiativeCardProps) {
  const isOverdue = initiative.endDate < new Date() && initiative.status !== 'completed';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{initiative.title}</CardTitle>
            {initiative.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {initiative.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Objetivo: {initiative.objectiveTitle}
            </p>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={statusColors[initiative.status]}>
              {statusLabels[initiative.status]}
            </Badge>
            <Badge className={priorityColors[initiative.priority]}>
              {priorityLabels[initiative.priority]}
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
              {initiative.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={initiative.progressPercentage} className="h-2" />
        </div>

        {/* Budget */}
        {initiative.budget && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Presupuesto: {formatCurrency(initiative.budget)}
            </span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(initiative.startDate, 'dd MMM', { locale: es })} - {' '}
            {format(initiative.endDate, 'dd MMM yyyy', { locale: es })}
          </span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Vencida
            </Badge>
          )}
        </div>

        {/* Assigned User */}
        {initiative.assignedTo && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{initiative.assignedTo.name}</span>
          </div>
        )}

        {/* Activities Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {initiative.activitiesCount} actividad{initiative.activitiesCount !== 1 ? 'es' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(initiative.id)}>
                Ver Detalles
              </Button>
            )}
            {onEdit && (
              <Button variant="default" size="sm" onClick={() => onEdit(initiative.id)}>
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}