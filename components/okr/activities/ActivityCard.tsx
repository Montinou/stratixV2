'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityCardProps {
  activity: {
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    estimatedHours?: number;
    actualHours?: number;
    dueDate?: Date;
    completedAt?: Date;
    initiativeTitle: string;
    assignedTo?: {
      name: string;
      avatar?: string;
    };
  };
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const statusLabels = {
  todo: 'Por Hacer',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
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

export function ActivityCard({ activity, onEdit, onView, onComplete }: ActivityCardProps) {
  const isOverdue = activity.dueDate && activity.dueDate < new Date() && activity.status !== 'completed';

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{activity.title}</CardTitle>
            {activity.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {activity.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Iniciativa: {activity.initiativeTitle}
            </p>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={statusColors[activity.status]}>
              {statusLabels[activity.status]}
            </Badge>
            <Badge className={priorityColors[activity.priority]}>
              {priorityLabels[activity.priority]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hours tracking */}
        {(activity.estimatedHours || activity.actualHours) && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {activity.actualHours ? (
                <>
                  {activity.actualHours}h trabajadas
                  {activity.estimatedHours && ` de ${activity.estimatedHours}h estimadas`}
                </>
              ) : (
                `${activity.estimatedHours}h estimadas`
              )}
            </span>
          </div>
        )}

        {/* Due Date */}
        {activity.dueDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Vence: {format(activity.dueDate, 'dd MMM yyyy', { locale: es })}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
          </div>
        )}

        {/* Completed Date */}
        {activity.completedAt && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Completada: {format(activity.completedAt, 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        )}

        {/* Assigned User */}
        {activity.assignedTo && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{activity.assignedTo.name}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex gap-2">
            {activity.status !== 'completed' && onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onComplete(activity.id)}
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Completar
              </Button>
            )}
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(activity.id)}>
                Ver Detalles
              </Button>
            )}
            {onEdit && (
              <Button variant="default" size="sm" onClick={() => onEdit(activity.id)}>
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}