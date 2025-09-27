'use client'

import * as React from 'react'
import { Copy, Edit3, Heart, ThumbsUp, ThumbsDown, MoreHorizontal, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  attachments?: ChatAttachment[]
  reactions?: MessageReaction[]
}

interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'document' | 'text'
  url: string
  size: number
}

interface MessageReaction {
  type: 'like' | 'dislike' | 'heart'
  count: number
  userReacted: boolean
}

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
  showActions?: boolean
  showAvatar?: boolean
  onReaction?: (messageId: string, reaction: string) => void
  onCopy?: (content: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  className?: string
}

export function ChatMessage({
  message,
  isStreaming = false,
  showActions = true,
  showAvatar = true,
  onReaction,
  onCopy,
  onEdit,
  onDelete,
  className
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [streamedContent, setStreamedContent] = React.useState('')
  const [currentIndex, setCurrentIndex] = React.useState(0)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // Optimized streaming effect for assistant messages
  React.useEffect(() => {
    if (isStreaming && isAssistant && message.content) {
      setStreamedContent('')
      setCurrentIndex(0)

      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next <= message.content.length) {
            setStreamedContent(message.content.slice(0, next))
            return next
          }
          return prev
        })
      }, 30)

      return () => clearInterval(interval)
    } else {
      setStreamedContent(message.content)
      setCurrentIndex(message.content.length)
    }
  }, [isStreaming, isAssistant, message.content])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success('Mensaje copiado al portapapeles')
    onCopy?.(message.content)
  }

  const handleReaction = (reactionType: string) => {
    onReaction?.(message.id, reactionType)
    toast.success(`Reacción ${reactionType} añadida`)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const renderAttachments = React.useMemo(() => {
    if (!message.attachments?.length) return null

    return (
      <div className="mt-3 space-y-2">
        {message.attachments.map((attachment) => (
          <Card key={attachment.id} className="border-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div className="shrink-0">
                  {attachment.type === 'image' ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }, [message.attachments])

  const renderReactions = React.useMemo(() => {
    if (!message.reactions?.length) return null

    return (
      <div className="flex items-center gap-1 mt-3">
        {message.reactions.map((reaction) => (
          <Button
            key={reaction.type}
            variant={reaction.userReacted ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs rounded-full"
            onClick={() => handleReaction(reaction.type)}
          >
            {reaction.type === 'like' && <ThumbsUp className="h-3 w-3 mr-1" />}
            {reaction.type === 'dislike' && <ThumbsDown className="h-3 w-3 mr-1" />}
            {reaction.type === 'heart' && <Heart className="h-3 w-3 mr-1" />}
            {reaction.count > 0 && reaction.count}
          </Button>
        ))}
      </div>
    )
  }, [message.reactions, handleReaction])

  return (
    <div
      className={cn(
        'group flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'flex space-x-3',
          // Responsive max width - smaller on mobile
          'max-w-[90%] sm:max-w-[85%]',
          isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
        )}
      >
        {showAvatar && (
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 mt-1">
            <AvatarFallback className={cn(
              'text-xs font-medium',
              isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {isUser ? 'TU' : 'IA'}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
          <Card
            className={cn(
              'shadow-sm border transition-all duration-200',
              isUser
                ? 'bg-primary text-primary-foreground border-primary/20'
                : 'bg-card text-card-foreground border-border',
              isStreaming && 'animate-pulse'
            )}
          >
            <CardContent className="p-3">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamedContent}
                {isStreaming && currentIndex < message.content.length && (
                  <span className="animate-pulse ml-1 text-muted-foreground">▋</span>
                )}
              </div>

              {renderAttachments}
              {renderReactions}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-1 w-full">
            <div className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}>
              <time dateTime={message.timestamp.toISOString()}>
                {formatTime(message.timestamp)}
              </time>
              {isStreaming && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  Escribiendo...
                </Badge>
              )}
            </div>

            {showActions && isHovered && (
              <div className={cn(
                'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                isUser ? 'flex-row-reverse' : 'flex-row'
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted/50"
                  onClick={handleCopy}
                  aria-label="Copiar mensaje"
                >
                  <Copy className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted/50 hidden sm:inline-flex"
                  onClick={() => handleReaction('like')}
                  aria-label="Me gusta"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted/50"
                      aria-label="Más opciones"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isUser ? "end" : "start"} className="w-48">
                    <DropdownMenuItem onClick={() => handleReaction('like')} className="gap-2">
                      <ThumbsUp className="h-4 w-4" />
                      Me gusta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReaction('heart')} className="gap-2">
                      <Heart className="h-4 w-4" />
                      Me encanta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReaction('dislike')} className="gap-2">
                      <ThumbsDown className="h-4 w-4" />
                      No me gusta
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isUser && onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(message.id)} className="gap-2">
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(message.id)}
                        className="text-destructive gap-2"
                      >
                        Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { ChatMessage, ChatAttachment, MessageReaction, ChatMessageProps }