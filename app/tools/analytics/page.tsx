import { getUserOrRedirect } from '@/lib/stack-auth';
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
import {
  getOKRDashboardStats,
  getDepartmentProgress,
  getTopPerformers,
  getUpcomingDeadlines,
  getCompletionTrends,
} from '@/lib/services/analytics-service';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let dashboardStats = {
    totalObjectives: 0,
    completedObjectives: 0,
    activeInitiatives: 0,
    overallProgress: 0,
    riskObjectives: 0
  };
  let departmentProgress = [];
  let topPerformers = [];
  let upcomingDeadlines = [];
  let completionTrends = [];

  try {
    // Fetch all analytics data from database
    [dashboardStats, departmentProgress, topPerformers, upcomingDeadlines, completionTrends] =
      await Promise.all([
        getOKRDashboardStats(user.id),
        getDepartmentProgress(user.id),
        getTopPerformers(user.id, 5),
        getUpcomingDeadlines(user.id, 30),
        getCompletionTrends(user.id, 6),
      ]);
  } catch (error) {
    console.error('Error loading analytics:', error);
    // Use empty state on error
  }

  // Calculate completion rate for each department and determine trend
  const departmentsWithTrend = departmentProgress.map((dept) => {
    const targetRate = 75; // Target completion rate
    const trend = dept.completionRate >= targetRate ? 'up' : dept.completionRate >= targetRate * 0.8 ? 'neutral' : 'down';
    return { ...dept, trend, targetRate };
  });

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
            <div className="text-2xl font-bold">{dashboardStats.totalObjectives}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.completedObjectives} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.overallProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Promedio OKR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Iniciativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.activeInitiatives}</div>
            <p className="text-xs text-muted-foreground">
              Activas ahora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.completedActivities}</div>
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
              {dashboardStats.totalObjectives > 0
                ? Math.round((dashboardStats.completedObjectives / dashboardStats.totalObjectives) * 100)
                : 0}%
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
            <div className="text-2xl font-bold">{departmentProgress.length}</div>
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
            {departmentsWithTrend.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de departamentos todavía</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departmentsWithTrend.map((dept) => (
                  <div key={dept.departmentName} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{dept.departmentName}</span>
                        {getTrendIcon(dept.trend)}
                      </div>
                      <span className={getTrendColor(dept.trend)}>
                        {dept.completionRate}% / {dept.targetRate}%
                      </span>
                    </div>
                    <Progress value={dept.completionRate} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completados: {dept.completedObjectives} de {dept.totalObjectives}</span>
                      <span>Meta: {dept.targetRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Colaboradores con mejor rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de rendimiento todavía</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div key={performer.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{performer.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {performer.activeCount} activas
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {performer.completedCount} completadas
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencias mensuales */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>
              Evolución de objetivos, iniciativas y actividades completados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completionTrends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de tendencias todavía</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="text-sm font-medium text-muted-foreground">Mes</div>
                  <div className="text-sm font-medium text-muted-foreground">Objetivos</div>
                  <div className="text-sm font-medium text-muted-foreground">Iniciativas</div>
                  <div className="text-sm font-medium text-muted-foreground">Actividades</div>
                </div>
                {completionTrends.map((trend) => (
                  <div key={trend.month} className="grid grid-cols-4 gap-4 text-center">
                    <div className="font-medium">{trend.month}</div>
                    <div>{trend.completedObjectives}</div>
                    <div>{trend.completedInitiatives}</div>
                    <div>{trend.completedActivities}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos vencimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
            <CardDescription>
              Objetivos e iniciativas con fechas límite cercanas (30 días)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay vencimientos próximos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type === 'objective' && 'Objetivo'}
                          {item.type === 'initiative' && 'Iniciativa'}
                          {item.type === 'activity' && 'Actividad'}
                          {item.assigneeName && ` • ${item.assigneeName}`}
                        </p>
                      </div>
                      <Badge variant={item.daysRemaining <= 7 ? "destructive" : "secondary"}>
                        {item.daysRemaining} día{item.daysRemaining !== 1 && 's'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          item.priority === 'high' ? 'text-red-600 border-red-600' :
                          item.priority === 'medium' ? 'text-yellow-600 border-yellow-600' :
                          'text-gray-600 border-gray-600'
                        }
                      >
                        {item.priority === 'high' && 'Alta'}
                        {item.priority === 'medium' && 'Media'}
                        {item.priority === 'low' && 'Baja'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Vence: {item.dueDate.toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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