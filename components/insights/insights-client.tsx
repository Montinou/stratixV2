'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Settings,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Insight {
  id: string;
  title: string;
  content: string;
  category: string;
  confidence: number;
  isActionable: boolean;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  generatedAt: string;
}

interface Conversation {
  id: string;
  title: string | null;
  lastMessage: string;
  messageCount: number;
  lastMessageAt: string | null;
  mood: string | null;
}

interface InsightsData {
  stats: {
    dailyInsights: number;
    actionableInsights: number;
    activeConversations: number;
  };
  insights: Insight[];
  conversations: Conversation[];
}

export function InsightsClient() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/insights');

      if (!response.ok) {
        throw new Error('Error al cargar insights');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error('Error al cargar insights');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      setGenerating(true);
      toast.info('Generando insights...');

      const response = await fetch('/api/insights/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar insights');
      }

      const result = await response.json();
      toast.success(
        `${result.result.insightsGenerated} insights generados exitosamente`
      );

      // Recargar insights
      await fetchInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al generar insights'
      );
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar insight');
      }

      // Actualizar estado local
      if (data) {
        setData({
          ...data,
          insights: data.insights.map((i) =>
            i.id === insightId ? { ...i, isRead: true } : i
          ),
          stats: {
            ...data.stats,
            actionableInsights: Math.max(0, data.stats.actionableInsights - 1),
          },
        });
      }

      toast.success('Insight marcado como leído');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Error al actualizar insight');
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'recommendations':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'trends':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getMoodIcon = (mood: string | null) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudieron cargar los insights</p>
        <Button onClick={fetchInsights} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IA Insights</h1>
          <p className="text-muted-foreground">
            Insights inteligentes y recomendaciones personalizadas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchInsights} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={generateInsights} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generar Insights
          </Button>
        </div>
      </div>

      {/* Resumen de insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights Hoy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.dailyInsights}</div>
            <p className="text-xs text-muted-foreground">Nuevos insights generados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accionables</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.actionableInsights}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.activeConversations}</div>
            <p className="text-xs text-muted-foreground">Conversaciones activas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Insights recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Insights Recientes</CardTitle>
            <CardDescription>
              Análisis y patrones detectados automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.insights.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay insights disponibles. Genera algunos usando el botón "Generar Insights"
                </p>
              ) : (
                data.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      !insight.isRead ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
                    }`}
                    onClick={() => !insight.isRead && markAsRead(insight.id)}
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversaciones recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones IA</CardTitle>
            <CardDescription>Historial de conversaciones con el asistente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.conversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay conversaciones disponibles
                </p>
              ) : (
                data.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getMoodIcon(conversation.mood)}
                        <h4 className="font-medium">
                          {conversation.title || 'Conversación sin título'}
                        </h4>
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
                      <span>
                        {conversation.lastMessageAt
                          ? formatDate(conversation.lastMessageAt)
                          : 'Sin actividad'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
