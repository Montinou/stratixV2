'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Users, Clock } from 'lucide-react';

interface DepartmentMetric {
  department: string;
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  onTimeCompletion: number;
  teamMembers: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface DepartmentMetricsProps {
  metrics: DepartmentMetric[];
}

export function DepartmentMetrics({ metrics }: DepartmentMetricsProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <TrendingUp className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {metrics.map((metric) => (
          <Card key={metric.department} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{metric.department}</CardTitle>
                  <CardDescription>
                    {metric.teamMembers} miembros del equipo
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                    {metric.trendPercentage > 0 ? '+' : ''}{metric.trendPercentage}%
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Overview */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progreso Promedio</span>
                  <span className="text-sm text-muted-foreground">
                    {metric.averageProgress.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={metric.averageProgress}
                  className="h-3"
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Objectives */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {metric.completedObjectives}/{metric.totalObjectives}
                    </p>
                    <p className="text-xs text-blue-600">Objetivos</p>
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      {metric.teamMembers}
                    </p>
                    <p className="text-xs text-purple-600">Miembros</p>
                  </div>
                </div>

                {/* On-time Completion */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {metric.onTimeCompletion.toFixed(1)}%
                    </p>
                    <p className="text-xs text-green-600">A Tiempo</p>
                  </div>
                </div>
              </div>

              {/* Performance Badge */}
              <div className="flex justify-end">
                {metric.averageProgress >= 80 ? (
                  <Badge className="bg-green-100 text-green-800">
                    Excelente Rendimiento
                  </Badge>
                ) : metric.averageProgress >= 60 ? (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Buen Rendimiento
                  </Badge>
                ) : metric.averageProgress >= 40 ? (
                  <Badge className="bg-orange-100 text-orange-800">
                    Necesita Mejora
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    Requiere Atención
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Resumen General</CardTitle>
          <CardDescription>
            Métricas consolidadas de todos los departamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {metrics.reduce((sum, m) => sum + m.totalObjectives, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Objetivos Totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {metrics.reduce((sum, m) => sum + m.completedObjectives, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {(metrics.reduce((sum, m) => sum + m.averageProgress, 0) / metrics.length).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Progreso Promedio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {metrics.reduce((sum, m) => sum + m.teamMembers, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Miembros Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}