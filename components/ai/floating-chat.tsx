'use client'

import * as React from 'react'
import { MessageCircle, X, Minimize2, Settings, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatMessage } from './chat-message'
import { ConversationUI } from './conversation-ui'

interface FloatingChatProps {
  isOpen: boolean
  onToggle: () => void
  position?: 'bottom-right' | 'bottom-left'
  theme?: 'light' | 'dark' | 'auto'
  unreadCount?: number
  className?: string
}

interface ChatState {
  isMinimized: boolean
  showSettings: boolean
  messages: ChatMessage[]
  currentConversationId?: string
  isTyping: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  attachments?: ChatAttachment[]
}

interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'document' | 'text'
  url: string
  size: number
}

export function FloatingChat({
  isOpen,
  onToggle,
  position = 'bottom-right',
  theme = 'auto',
  unreadCount = 0,
  className
}: FloatingChatProps) {
  const [chatState, setChatState] = React.useState<ChatState>({
    isMinimized: false,
    showSettings: false,
    messages: [],
    isTyping: false
  })

  // Position classes based on position prop
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  // Theme classes
  const themeClasses = React.useMemo(() => {
    if (theme === 'auto') {
      return 'bg-background border-border text-foreground'
    }
    return theme === 'dark'
      ? 'bg-slate-900 border-slate-800 text-slate-100'
      : 'bg-white border-slate-200 text-slate-900'
  }, [theme])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault()
        onToggle()
      }
      if (event.key === 'Escape' && isOpen) {
        onToggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle])

  const toggleMinimize = () => {
    setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))
  }

  const toggleSettings = () => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }))
  }

  const handleNewMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }))

    // Simulate AI response (will be replaced with actual AI API call)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Entiendo tu consulta: "${content}". Estoy aquí para ayudarte con tus OKRs y objetivos estratégicos.`,
        timestamp: new Date(),
        isStreaming: false
      }

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isTyping: false
      }))
    }, 2000)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        size="lg"
        className={cn(
          'fixed z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-all duration-200',
          positionClasses[position],
          'bg-primary text-primary-foreground hover:bg-primary/90',
          className
        )}
        aria-label="Abrir chat de IA"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        'fixed z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out',
        positionClasses[position],
        themeClasses,
        chatState.isMinimized ? 'h-14 w-80' : 'h-[600px] w-96',
        'max-h-[80vh] max-w-[calc(100vw-2rem)]',
        'sm:w-96 sm:max-w-none',
        className
      )}
    >
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-semibold">
            Asistente IA
          </CardTitle>
          {chatState.isTyping && (
            <Badge variant="secondary" className="text-xs">
              Escribiendo...
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSettings}
            className="h-8 w-8"
            aria-label="Configuración del chat"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMinimize}
            className="h-8 w-8"
            aria-label={chatState.isMinimized ? "Expandir chat" : "Minimizar chat"}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            aria-label="Cerrar chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!chatState.isMinimized && (
        <>
          {/* Chat Content */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ConversationUI
              messages={chatState.messages}
              isTyping={chatState.isTyping}
              onNewMessage={handleNewMessage}
              showSettings={chatState.showSettings}
              conversationId={chatState.currentConversationId}
            />
          </CardContent>

          {/* Quick Actions Footer */}
          <CardFooter className="p-2 border-t bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  OKRs
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Objetivos
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Ctrl+K para abrir
              </div>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

export type { FloatingChatProps, ChatMessage, ChatAttachment }