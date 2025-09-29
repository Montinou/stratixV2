'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InsightCardProps {
  insight: {
    id: string;
    title: string;
    content: string;
    category: string;
    entityType?: string;
    entityId?: string;
    confidence?: number;
    isRead: boolean;
    isActionable: boolean;
    generatedAt: Date;
    expiresAt?: Date;
    user?: {
      name: string;
      avatar?: string;
    };
  };
  onMarkAsRead?: (id: string) => void;
  onView?: (id: string) => void;
  onAction?: (id: string) => void;
}

const categoryIcons = {
  'performance': TrendingUp,
  'risk': AlertTriangle,
  'opportunity': Lightbulb,
  'achievement': CheckCircle,
  'default': Star
};

const categoryColors = {
  'performance': 'bg-blue-100 text-blue-800',
  'risk': 'bg-red-100 text-red-800',
  'opportunity': 'bg-green-100 text-green-800',
  'achievement': 'bg-purple-100 text-purple-800',
  'default': 'bg-gray-100 text-gray-800'
};

export function InsightCard({ insight, onMarkAsRead, onView, onAction }: InsightCardProps) {
  const IconComponent = categoryIcons[insight.category as keyof typeof categoryIcons] || categoryIcons.default;
  const categoryColor = categoryColors[insight.category as keyof typeof categoryColors] || categoryColors.default;

  const isExpired = insight.expiresAt && insight.expiresAt < new Date();
  const isNearExpiry = insight.expiresAt && insight.expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return (
    <Card className={`hover:shadow-md transition-shadow ${!insight.isRead ? 'border-blue-200 bg-blue-50/50' : ''} ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              <IconComponent className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg line-clamp-2">{insight.title}</CardTitle>
                {!insight.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={categoryColor}>
                  {insight.category}
                </Badge>
                {insight.isActionable && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Accionable
                  </Badge>
                )}
                {insight.confidence && (
                  <Badge variant="outline">
                    {Math.round(insight.confidence)}% confianza
                  </Badge>
                )}
                {isNearExpiry && !isExpired && (
                  <Badge variant="destructive">
                    Expira pronto
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="secondary">
                    Expirado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content */}
        <div className="text-sm text-muted-foreground line-clamp-3">
          {insight.content}
        </div>

        {/* User Info */}
        {insight.user && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={insight.user.avatar} alt={insight.user.name} />
              <AvatarFallback className="text-xs">
                {insight.user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              Para {insight.user.name}
            </span>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(insight.generatedAt, {
              addSuffix: true,
              locale: es
            })}
          </span>
          {insight.expiresAt && !isExpired && (
            <span>
              Expira {formatDistanceToNow(insight.expiresAt, {
                addSuffix: true,
                locale: es
              })}
            </span>
          )}
        </div>

        {/* Entity Link */}
        {insight.entityType && insight.entityId && (
          <div className="text-xs text-muted-foreground">
            Relacionado con: {insight.entityType}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!insight.isRead && onMarkAsRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(insight.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Marcar como leído
              </Button>
            )}
            {insight.isRead && onMarkAsRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(insight.id)}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Marcar como no leído
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(insight.id)}
              >
                Ver Detalles
              </Button>
            )}
            {insight.isActionable && onAction && !isExpired && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onAction(insight.id)}
              >
                Tomar Acción
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}