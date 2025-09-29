import { stackServerApp } from '@/stack/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Target,
  Settings
} from 'lucide-react';

export default async function InsightsPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener insights reales de la base de datos
  const insights = {
    daily: [
      {
        id: '1',
        title: 'Objetivo en Riesgo Detectado',
        content: 'El objetivo "Aumentar satisfacción del cliente" muestra progreso lento. Considera revisar las iniciativas asociadas.',
        category: 'performance',
        confidence: 85,
        isActionable: true,
        isRead: false,
        entityType: 'objective',
        generatedAt: '2024-02-15T09:00:00Z',
      },
      {
        id: '2',
        title: 'Oportunidad de Optimización',
        content: 'Tu equipo de desarrollo ha completado actividades un 20% más rápido este mes. Considera aumentar la capacidad.',
        category: 'recommendations',
        confidence: 92,
        isActionable: true,
        isRead: false,
        entityType: 'general',
        generatedAt: '2024-02-15T10:30:00Z',
      },
      {
        id: '3',
        title: 'Tendencia Positiva Identificada',
        content: 'Las iniciativas de marketing muestran una tendencia ascendente sostenida en los últimos 30 días.',
        category: 'trends',
        confidence: 78,
        isActionable: false,
        isRead: true,
        entityType: 'initiative',
        generatedAt: '2024-02-14T16:45:00Z',
      },
    ],
    conversations: [
      {
        id: '1',
        title: 'Análisis de Progreso Q1',
        lastMessage: 'Basándome en los datos actuales, recomiendo priorizar las iniciativas de tecnología...',
        messageCount: 12,
        lastMessageAt: '2024-02-15T11:20:00Z',
        mood: 'positive',
      },
      {
        id: '2',
        title: 'Estrategia de Recursos Humanos',
        lastMessage: '¿Te gustaría que analice el impacto de contratar 2 desarrolladores adicionales?',
        messageCount: 8,
        lastMessageAt: '2024-02-14T14:15:00Z',
        mood: 'neutral',
      },
      {
        id: '3',
        title: 'Optimización de Procesos',
        lastMessage: 'He identificado 3 cuellos de botella principales en tus procesos actuales...',
        messageCount: 15,
        lastMessageAt: '2024-02-13T09:30:00Z',
        mood: 'neutral',
      },
    ],
    recommendations: [
      {
        title: 'Revisar Asignación de Recursos',
        description: 'Algunos miembros del equipo están sobrecargados mientras otros tienen capacidad disponible',
        priority: 'high',
        impact: 'Mejora del 15% en velocidad de entrega',
      },
      {
        title: 'Automatizar Reportes Semanales',
        description: 'Se puede reducir 4 horas/semana automatizando la generación de reportes de progreso',
        priority: 'medium',
        impact: 'Ahorro de 16 horas/mes por persona',
      },
      {
        title: 'Implementar Reuniones de Sincronización',
        description: 'Equipos interdependientes no están coordinando eficientemente',
        priority: 'medium',
        impact: 'Reducción del 25% en bloqueos',
      },
    ]
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <TrendingUp className="h-4 w-4" />;
      case 'recommendations':
        return <Lightbulb className="h-4 w-4" />;
      case 'trends':
        return <Target className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance':
        return 'bg-blue-100 text-blue-800';
      case 'recommendations':
        return 'bg-green-100 text-green-800';
      case 'trends':
        return 'bg-purple-100 text-purple-800';
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

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'frustrated':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            IA Insights
          </h1>
          <p className="text-muted-foreground">
            Insights inteligentes y recomendaciones personalizadas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar IA
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            Nueva Conversación
          </Button>
        </div>
      </div>

      {/* Resumen de insights */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights Hoy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.daily.filter(i => new Date(i.generatedAt).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Nuevos insights generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accionables</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.daily.filter(i => i.isActionable && !i.isRead).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.conversations.length}</div>
            <p className="text-xs text-muted-foreground">
              Conversaciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recomendaciones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              Mejoras sugeridas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Insights diarios */}
        <Card>
          <CardHeader>
            <CardTitle>Insights Recientes</CardTitle>
            <CardDescription>
              Análisis y patrones detectados automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.daily.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg ${
                    !insight.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(insight.category)}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getCategoryColor(insight.category)}>
                        {insight.category}
                      </Badge>
                      {insight.isActionable && (
                        <Badge variant="outline">Accionable</Badge>
                      )}
                      {!insight.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {insight.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confianza: {insight.confidence}%</span>
                    <span>{formatDate(insight.generatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversaciones recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones IA</CardTitle>
            <CardDescription>
              Historial de conversaciones con el asistente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getMoodIcon(conversation.mood)}
                      <h4 className="font-medium">{conversation.title}</h4>
                    </div>
                    <Badge variant="outline">
                      {conversation.messageCount} mensajes
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Última actividad</span>
                    <span>{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones Estratégicas</CardTitle>
          <CardDescription>
            Sugerencias basadas en análisis de patrones y rendimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{recommendation.title}</h4>
                  <Badge className={getPriorityColor(recommendation.priority)}>
                    {recommendation.priority === 'high' ? 'Alta' :
                     recommendation.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {recommendation.description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>💡 Impacto esperado: {recommendation.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estado de integración */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema IA</CardTitle>
          <CardDescription>
            Información sobre el estado de los servicios de inteligencia artificial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>AI Gateway: Operativo</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Análisis de Patrones: Activo</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Base de Conocimiento: Actualizando</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Generación de Insights: Activa</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}