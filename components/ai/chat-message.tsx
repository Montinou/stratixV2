'use client'

import * as React from 'react'
import { Copy, Edit3, Heart, ThumbsUp, ThumbsDown, MoreHorizontal, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

  // Simulated streaming effect for assistant messages
  React.useEffect(() => {
    if (isStreaming && isAssistant && message.content) {
      setStreamedContent('')
      setCurrentIndex(0)

      const streamContent = () => {
        if (currentIndex < message.content.length) {
          setStreamedContent(prev => prev + message.content[currentIndex])
          setCurrentIndex(prev => prev + 1)
        }
      }

      const interval = setInterval(streamContent, 30) // 30ms per character
      return () => clearInterval(interval)
    } else {
      setStreamedContent(message.content)
    }
  }, [isStreaming, isAssistant, message.content, currentIndex])

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

  const renderAttachments = () => {
    if (!message.attachments?.length) return null

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment) => (
          <Card key={attachment.id} className="p-2 bg-muted/50">
            <div className="flex items-center space-x-2">
              {attachment.type === 'image' ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const renderReactions = () => {
    if (!message.reactions?.length) return null

    return (
      <div className="flex items-center space-x-1 mt-2">
        {message.reactions.map((reaction) => (
          <Button
            key={reaction.type}
            variant={reaction.userReacted ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
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
  }

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
          'flex max-w-[85%] space-x-3',
          isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
        )}
      >
        {showAvatar && (
          <Avatar className="h-8 w-8 shrink-0 mt-1">
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
              'p-3 shadow-sm',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/80 text-foreground',
              isStreaming && 'animate-pulse'
            )}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {isStreaming ? streamedContent : message.content}
              {isStreaming && currentIndex < message.content.length && (
                <span className="animate-pulse">|</span>
              )}
            </div>

            {renderAttachments()}
            {renderReactions()}
          </Card>

          <div className="flex items-center justify-between mt-1 w-full">
            <div className={cn(
              'flex items-center space-x-1 text-xs text-muted-foreground',
              isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            )}>
              <span>{formatTime(message.timestamp)}</span>
              {isStreaming && (
                <Badge variant="secondary" className="text-xs">
                  Escribiendo...
                </Badge>
              )}
            </div>

            {showActions && isHovered && (
              <div className={cn(
                'flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity',
                isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                  aria-label="Copiar mensaje"
                >
                  <Copy className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
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
                      className="h-6 w-6"
                      aria-label="Más opciones"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isUser ? "end" : "start"}>
                    <DropdownMenuItem onClick={() => handleReaction('heart')}>
                      <Heart className="h-4 w-4 mr-2" />
                      Me encanta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReaction('dislike')}>
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      No me gusta
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isUser && onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(message.id)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(message.id)}
                        className="text-destructive"
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