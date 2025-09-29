import { stackServerApp } from '@/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Rocket, Calendar, User, DollarSign, Target } from 'lucide-react';

export default async function InitiativesPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener iniciativas reales de la base de datos
  const initiatives = [
    {
      id: '1',
      title: 'Implementar chatbot de atención al cliente',
      description: 'Desarrollar y desplegar un chatbot para mejorar la atención al cliente 24/7',
      status: 'in_progress',
      priority: 'high',
      progress: 65,
      budget: 50000,
      startDate: '2024-01-15',
      endDate: '2024-04-15',
      assignedTo: 'Carlos López',
      objectiveTitle: 'Aumentar la satisfacción del cliente',
      department: 'Tecnología',
    },
    {
      id: '2',
      title: 'Automatizar proceso de facturación',
      description: 'Crear sistema automatizado para reducir tiempos de facturación',
      status: 'planning',
      priority: 'medium',
      progress: 15,
      budget: 30000,
      startDate: '2024-02-01',
      endDate: '2024-05-30',
      assignedTo: 'Laura Martínez',
      objectiveTitle: 'Reducir tiempo de respuesta',
      department: 'Finanzas',
    },
    {
      id: '3',
      title: 'Campaña de marketing digital',
      description: 'Lanzar campaña integral para aumentar reconocimiento de marca',
      status: 'in_progress',
      priority: 'high',
      progress: 80,
      budget: 75000,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      assignedTo: 'Pedro Sánchez',
      objectiveTitle: 'Lanzar nueva funcionalidad',
      department: 'Marketing',
    },
    {
      id: '4',
      title: 'Migración a la nube',
      description: 'Migrar infraestructura actual a servicios en la nube',
      status: 'completed',
      priority: 'high',
      progress: 100,
      budget: 120000,
      startDate: '2023-10-01',
      endDate: '2024-01-31',
      assignedTo: 'Ana García',
      objectiveTitle: 'Modernizar infraestructura',
      department: 'IT',
    },
  ];

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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
            <div className="text-2xl font-bold">{initiatives.length}</div>
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
            <div className="text-2xl font-bold">
              {initiatives.filter(init => init.status === 'in_progress').length}
            </div>
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
              {formatCurrency(initiatives.reduce((acc, init) => acc + init.budget, 0))}
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
              {Math.round(initiatives.reduce((acc, init) => acc + init.progress, 0) / initiatives.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              De todas las iniciativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de iniciativas */}
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
                    <span>{initiative.progress}%</span>
                  </div>
                  <Progress value={initiative.progress} className="h-2" />
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Presupuesto: {formatCurrency(initiative.budget)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Responsable: {initiative.assignedTo}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Inicio: {new Date(initiative.startDate).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Fin: {new Date(initiative.endDate).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                {/* Departamento */}
                <div className="flex justify-end">
                  <Badge variant="outline">{initiative.department}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {initiatives.length === 0 && (
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