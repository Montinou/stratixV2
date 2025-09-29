import { stackServerApp } from '@/stack/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Calendar, User, TrendingUp } from 'lucide-react';

export default async function ObjectivesPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener objetivos reales de la base de datos
  const objectives = [
    {
      id: '1',
      title: 'Aumentar la satisfacción del cliente',
      description: 'Mejorar la experiencia del cliente a través de diversos canales',
      department: 'Ventas',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      targetValue: 90,
      currentValue: 67.5,
      unit: '%',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      assignedTo: 'María García',
    },
    {
      id: '2',
      title: 'Reducir tiempo de respuesta',
      description: 'Optimizar procesos para mejorar tiempos de respuesta',
      department: 'Operaciones',
      status: 'in_progress',
      priority: 'medium',
      progress: 45,
      targetValue: 24,
      currentValue: 36,
      unit: 'horas',
      startDate: '2024-01-15',
      endDate: '2024-04-15',
      assignedTo: 'Juan Pérez',
    },
    {
      id: '3',
      title: 'Lanzar nueva funcionalidad',
      description: 'Desarrollar e implementar nueva funcionalidad del producto',
      department: 'Desarrollo',
      status: 'draft',
      priority: 'high',
      progress: 10,
      targetValue: 1,
      currentValue: 0,
      unit: 'lanzamiento',
      startDate: '2024-02-01',
      endDate: '2024-06-30',
      assignedTo: 'Ana Rodríguez',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
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
        return 'Completado';
      case 'in_progress':
        return 'En Progreso';
      case 'draft':
        return 'Borrador';
      case 'cancelled':
        return 'Cancelado';
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Objetivos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los objetivos estratégicos de tu organización
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Objetivo
        </Button>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{objectives.length}</div>
            <p className="text-xs text-muted-foreground">
              Objetivos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {objectives.filter(obj => obj.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Actualmente trabajando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(objectives.reduce((acc, obj) => acc + obj.progress, 0) / objectives.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              De todos los objetivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridad</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {objectives.filter(obj => obj.priority === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de objetivos */}
      <div className="space-y-4">
        {objectives.map((objective) => (
          <Card key={objective.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{objective.title}</CardTitle>
                  <CardDescription>{objective.description}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Badge className={getStatusColor(objective.status)}>
                    {getStatusLabel(objective.status)}
                  </Badge>
                  <Badge className={getPriorityColor(objective.priority)}>
                    {getPriorityLabel(objective.priority)}
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
                    <span>{objective.progress}%</span>
                  </div>
                  <Progress value={objective.progress} className="h-2" />
                </div>

                {/* Métricas */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{objective.currentValue}/{objective.targetValue} {objective.unit}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{objective.assignedTo}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(objective.endDate).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  <Badge variant="outline">{objective.department}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {objectives.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay objetivos</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primer objetivo estratégico
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Objetivo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}