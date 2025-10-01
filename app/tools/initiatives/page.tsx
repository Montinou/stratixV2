import { getUserOrRedirect } from '@/lib/stack-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Rocket, Calendar, User, DollarSign, Target } from 'lucide-react';
import { getInitiativesForPage, getInitiativeStats } from '@/lib/services/initiatives-service';

export const dynamic = 'force-dynamic';

export default async function InitiativesPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let initiatives = [];
  let stats = {
    total: 0,
    active: 0,
    totalBudget: 0,
    averageProgress: 0
  };

  try {
    // Fetch data using the safe user object
    [initiatives, stats] = await Promise.all([
      getInitiativesForPage(user.id),
      getInitiativeStats(user.id),
    ]);
  } catch (error) {
    console.error('Error loading initiatives data:', error);
    // Use empty state on error
    initiatives = [];
    stats = {
      total: 0,
      active: 0,
      totalBudget: 0,
      averageProgress: 0
    };
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
        return 'En Progreso';
      case 'planning':
        return 'Planificación';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return priority;
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number(amount));
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Iniciativas
          </h1>
          <p className="text-muted-foreground">
            Gestiona las iniciativas estratégicas para alcanzar tus objetivos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Iniciativa
        </Button>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Iniciativas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              En ejecución
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR'
              }).format(stats.totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              Inversión total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.averageProgress)}%
            </div>
            <p className="text-xs text-muted-foreground">
              De todas las iniciativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de iniciativas */}
      {initiatives.length > 0 ? (
        <div className="space-y-4">
          {initiatives.map((initiative) => (
            <Card key={initiative.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{initiative.title}</CardTitle>
                    <CardDescription>{initiative.description}</CardDescription>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>Objetivo: {initiative.objectiveTitle}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(initiative.status)}>
                      {getStatusLabel(initiative.status)}
                    </Badge>
                    <Badge className={getPriorityColor(initiative.priority)}>
                      {getPriorityLabel(initiative.priority)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progreso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span>{initiative.progressPercentage ? Math.round(Number(initiative.progressPercentage)) : 0}%</span>
                    </div>
                    <Progress value={initiative.progressPercentage ? Number(initiative.progressPercentage) : 0} className="h-2" />
                  </div>

                  {/* Información adicional */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Presupuesto: {formatCurrency(initiative.budget)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Responsable: {initiative.assignedToName || 'Sin asignar'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Inicio: {formatDate(initiative.startDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Fin: {formatDate(initiative.endDate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay iniciativas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primera iniciativa estratégica
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Iniciativa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
