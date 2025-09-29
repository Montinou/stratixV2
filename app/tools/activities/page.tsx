import { stackServerApp } from '@/stack/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Activity, Calendar, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default async function ActivitiesPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener actividades reales de la base de datos
  const activities = [
    {
      id: '1',
      title: 'Diseñar interfaz del chatbot',
      description: 'Crear mockups y wireframes para la interfaz de usuario del chatbot',
      status: 'completed',
      priority: 'high',
      estimatedHours: 16,
      actualHours: 14,
      dueDate: '2024-02-15',
      completedAt: '2024-02-14',
      assignedTo: 'María González',
      initiativeTitle: 'Implementar chatbot de atención al cliente',
      department: 'Diseño',
    },
    {
      id: '2',
      title: 'Configurar servidor de producción',
      description: 'Preparar y configurar el entorno de producción para el nuevo sistema',
      status: 'in_progress',
      priority: 'high',
      estimatedHours: 24,
      actualHours: 18,
      dueDate: '2024-02-20',
      completedAt: null,
      assignedTo: 'Carlos Ruiz',
      initiativeTitle: 'Migración a la nube',
      department: 'IT',
    },
    {
      id: '3',
      title: 'Crear contenido para redes sociales',
      description: 'Desarrollar contenido visual y textual para la campaña en redes sociales',
      status: 'todo',
      priority: 'medium',
      estimatedHours: 12,
      actualHours: 0,
      dueDate: '2024-02-25',
      completedAt: null,
      assignedTo: 'Ana Torres',
      initiativeTitle: 'Campaña de marketing digital',
      department: 'Marketing',
    },
    {
      id: '4',
      title: 'Realizar pruebas de integración',
      description: 'Ejecutar batería de pruebas para validar la integración entre sistemas',
      status: 'in_progress',
      priority: 'high',
      estimatedHours: 20,
      actualHours: 12,
      dueDate: '2024-02-18',
      completedAt: null,
      assignedTo: 'Luis Herrera',
      initiativeTitle: 'Automatizar proceso de facturación',
      department: 'QA',
    },
    {
      id: '5',
      title: 'Documentar API endpoints',
      description: 'Crear documentación técnica completa para todos los endpoints de la API',
      status: 'todo',
      priority: 'low',
      estimatedHours: 8,
      actualHours: 0,
      dueDate: '2024-03-01',
      completedAt: null,
      assignedTo: 'Pedro Jiménez',
      initiativeTitle: 'Implementar chatbot de atención al cliente',
      department: 'Desarrollo',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'todo':
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
        return 'Completada';
      case 'in_progress':
        return 'En Progreso';
      case 'todo':
        return 'Pendiente';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'todo':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Actividades
          </h1>
          <p className="text-muted-foreground">
            Gestiona las tareas específicas de tus iniciativas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Actividad
        </Button>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">
              Actividades registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(act => act.status === 'todo').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Por iniciar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(act => act.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              En ejecución
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(act => act.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Finalizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(act => isOverdue(act.dueDate, act.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de actividades */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <Card
            key={activity.id}
            className={`hover:shadow-md transition-shadow cursor-pointer ${
              isOverdue(activity.dueDate, activity.status) ? 'border-red-200' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Checkbox
                    checked={activity.status === 'completed'}
                    className="mt-1"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(activity.status)}
                      <CardTitle className={`text-lg ${
                        activity.status === 'completed' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {activity.title}
                      </CardTitle>
                      {isOverdue(activity.dueDate, activity.status) && (
                        <Badge variant="destructive" className="text-xs">
                          Vencida
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{activity.description}</CardDescription>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span>Iniciativa: {activity.initiativeTitle}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge className={getStatusColor(activity.status)}>
                    {getStatusLabel(activity.status)}
                  </Badge>
                  <Badge className={getPriorityColor(activity.priority)}>
                    {getPriorityLabel(activity.priority)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Asignado: {activity.assignedTo}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Vence: {new Date(activity.dueDate).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Estimado: {activity.estimatedHours}h</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Real: {activity.actualHours}h</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Badge variant="outline">{activity.department}</Badge>
                {activity.completedAt && (
                  <span className="text-xs text-muted-foreground">
                    Completada: {new Date(activity.completedAt).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activities.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay actividades</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primera actividad
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Actividad
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}