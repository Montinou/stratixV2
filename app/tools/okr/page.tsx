import { stackServerApp } from '@/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Rocket, Activity, TrendingUp, Users, Clock } from 'lucide-react';

export default async function OKRDashboard() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener datos reales de la base de datos
  const stats = {
    totalObjectives: 12,
    activeInitiatives: 24,
    completedActivities: 156,
    overallProgress: 78,
    teamMembers: 8,
    daysToDeadline: 45,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard OKR
          </h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, {user.displayName || user.primaryEmail}
          </p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalObjectives}</div>
            <p className="text-xs text-muted-foreground">
              Total activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Iniciativas</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInitiatives}</div>
            <p className="text-xs text-muted-foreground">
              En progreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedActivities}</div>
            <p className="text-xs text-muted-foreground">
              Completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallProgress}%</div>
            <p className="text-xs text-muted-foreground">
              General
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Miembros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.daysToDeadline}</div>
            <p className="text-xs text-muted-foreground">
              Días restantes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones principales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Objetivos recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Objetivos Recientes</CardTitle>
            <CardDescription>
              Últimos objetivos creados o actualizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Conectando con la base de datos...
              </p>
              {/* TODO: Implementar lista de objetivos */}
            </div>
          </CardContent>
        </Card>

        {/* Actividades pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Actividades Pendientes</CardTitle>
            <CardDescription>
              Tareas que requieren tu atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Conectando con la base de datos...
              </p>
              {/* TODO: Implementar lista de actividades */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de progreso */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progreso por Departamento</CardTitle>
            <CardDescription>
              Comparativo de avance entre departamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Gráfico de progreso - Próximamente
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
            <CardDescription>
              Evolución del progreso en los últimos meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Gráfico de tendencias - Próximamente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}