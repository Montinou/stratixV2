'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Clock, Users } from 'lucide-react';

interface MetricsCardsProps {
  totalObjectives: number;
  activeInitiatives: number;
  overdueActivities: number;
  teamMembers: number;
  averageProgress: number;
}

export function MetricsCards({
  totalObjectives,
  activeInitiatives,
  overdueActivities,
  teamMembers,
  averageProgress
}: MetricsCardsProps) {
  const metrics = [
    {
      title: 'Objetivos Totales',
      value: totalObjectives.toString(),
      description: 'Objetivos activos en el trimestre',
      icon: Target,
      color: 'text-blue-600'
    },
    {
      title: 'Progreso Promedio',
      value: `${averageProgress.toFixed(1)}%`,
      description: 'Progreso general de objetivos',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Iniciativas Activas',
      value: activeInitiatives.toString(),
      description: 'Iniciativas en progreso',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Miembros del Equipo',
      value: teamMembers.toString(),
      description: 'Personas involucradas',
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}