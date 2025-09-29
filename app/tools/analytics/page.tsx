import { stackServerApp } from '@/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Clock,
  Users,
  Download,
  Filter
} from 'lucide-react';

export default async function AnalyticsPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener datos reales de la base de datos
  const analytics = {
    overview: {
      totalObjectives: 12,
      completedObjectives: 4,
      activeInitiatives: 24,
      completedActivities: 156,
      overallProgress: 68,
      previousMonthProgress: 52,
    },
    departmentProgress: [
      { department: 'Ventas', progress: 85, target: 90, trend: 'up' },
      { department: 'Marketing', progress: 72, target: 80, trend: 'up' },
      { department: 'Desarrollo', progress: 45, target: 70, trend: 'down' },
      { department: 'Operaciones', progress: 90, target: 85, trend: 'up' },
      { department: 'Finanzas', progress: 60, target: 75, trend: 'neutral' },
    ],
    monthlyTrends: [
      { month: 'Oct', objectives: 8, initiatives: 18, activities: 95 },
      { month: 'Nov', objectives: 10, initiatives: 21, activities: 124 },
      { month: 'Dic', objectives: 11, initiatives: 23, activities: 142 },
      { month: 'Ene', objectives: 12, initiatives: 24, activities: 156 },
    ],
    topPerformers: [
      { name: 'María García', completed: 12, department: 'Ventas' },
      { name: 'Carlos López', completed: 10, department: 'IT' },
      { name: 'Ana Torres', completed: 8, department: 'Marketing' },
      { name: 'Luis Herrera', completed: 7, department: 'Operaciones' },
    ],
    upcomingDeadlines: [
      { title: 'Lanzar nueva funcionalidad', daysLeft: 15, progress: 78 },
      { title: 'Completar migración', daysLeft: 23, progress: 45 },
      { title: 'Campaña Q1', daysLeft: 31, progress: 90 },
      { title: 'Certificación ISO', daysLeft: 45, progress: 34 },
    ]
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Análisis detallado del progreso y rendimiento de OKRs
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalObjectives}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.completedObjectives} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.overallProgress}%</div>
            <p className="text-xs text-green-600">
              +{analytics.overview.overallProgress - analytics.overview.previousMonthProgress}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Iniciativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeInitiatives}</div>
            <p className="text-xs text-muted-foreground">
              Activas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.completedActivities}</div>
            <p className="text-xs text-muted-foreground">
              Completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((analytics.overview.completedObjectives / analytics.overview.totalObjectives) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivos logrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.departmentProgress.length}</div>
            <p className="text-xs text-muted-foreground">
              Departamentos activos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progreso por departamento */}
        <Card>
          <CardHeader>
            <CardTitle>Progreso por Departamento</CardTitle>
            <CardDescription>
              Rendimiento de cada departamento vs objetivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.departmentProgress.map((dept) => (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{dept.department}</span>
                      {getTrendIcon(dept.trend)}
                    </div>
                    <span className={getTrendColor(dept.trend)}>
                      {dept.progress}% / {dept.target}%
                    </span>
                  </div>
                  <Progress value={dept.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Actual: {dept.progress}%</span>
                    <span>Meta: {dept.target}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Colaboradores con mejor rendimiento este mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">{performer.department}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {performer.completed} completadas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencias mensuales */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>
              Evolución de objetivos, iniciativas y actividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="text-sm font-medium text-muted-foreground">Mes</div>
                <div className="text-sm font-medium text-muted-foreground">Objetivos</div>
                <div className="text-sm font-medium text-muted-foreground">Iniciativas</div>
                <div className="text-sm font-medium text-muted-foreground">Actividades</div>
              </div>
              {analytics.monthlyTrends.map((trend) => (
                <div key={trend.month} className="grid grid-cols-4 gap-4 text-center">
                  <div className="font-medium">{trend.month}</div>
                  <div>{trend.objectives}</div>
                  <div>{trend.initiatives}</div>
                  <div>{trend.activities}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximos vencimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
            <CardDescription>
              Objetivos e iniciativas con fechas límite cercanas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.upcomingDeadlines.map((item) => (
                <div key={item.title} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.title}</span>
                    <Badge variant={item.daysLeft <= 20 ? "destructive" : "secondary"}>
                      {item.daysLeft} días
                    </Badge>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progreso: {item.progress}%</span>
                    <span>Vence en {item.daysLeft} días</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de gráficos */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado</CardTitle>
          <CardDescription>
            Visualización avanzada de métricas y tendencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Gráficos interactivos - Próximamente</p>
              <p className="text-sm">Integración con Recharts en desarrollo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}