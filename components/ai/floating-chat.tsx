'use client'

import * as React from 'react'
import { MessageCircle, X, Minimize2, Settings, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ConversationUI } from './conversation-ui'
import { useChatAI } from '@/lib/hooks/use-chat'
import { useAuth } from '@/lib/hooks/use-auth'
import type { ChatContext } from '@/lib/hooks/use-chat'

interface FloatingChatProps {
  isOpen: boolean
  onToggle: () => void
  position?: 'bottom-right' | 'bottom-left'
  theme?: 'light' | 'dark' | 'auto'
  unreadCount?: number
  initialContext?: ChatContext
  className?: string
}

interface ChatState {
  isMinimized: boolean
  showSettings: boolean
  currentConversationId?: string
}

export function FloatingChat({
  isOpen,
  onToggle,
  position = 'bottom-right',
  theme = 'auto',
  unreadCount = 0,
  initialContext,
  className
}: FloatingChatProps) {
  const { user, profile, isAuthenticated, loading } = useAuth()
  const [chatState, setChatState] = React.useState<ChatState>({
    isMinimized: false,
    showSettings: false,
    currentConversationId: `${user?.id || 'anonymous'}-${crypto.randomUUID()}`
  })

  // Enhanced context with user profile data
  const enhancedContext: ChatContext = React.useMemo(() => ({
    ...initialContext,
    department: profile?.department,
    role: profile?.roleType,
    companySize: 'empresa' // Default, could be derived from company data
  }), [initialContext, profile])

  // Use the real chat AI hook
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    addReaction,
    editMessage,
    deleteMessage,
    clearConversation
  } = useChatAI({
    conversationId: chatState.currentConversationId,
    initialContext: enhancedContext,
    onError: (error) => {
      console.error('Chat error:', error)
      // You could show a toast notification here
    }
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

  const handleNewMessage = (content: string, attachments?: File[]) => {
    if (!isAuthenticated) {
      console.warn('User not authenticated, cannot send message')
      return
    }
    sendMessage(content, attachments)
  }

  // Render trigger button when closed
  const triggerButton = (
    <Button
      size="lg"
      className={cn(
        'fixed z-50 rounded-full shadow-lg hover:scale-105 transition-all duration-200',
        // Responsive sizing
        'h-12 w-12 sm:h-14 sm:w-14',
        positionClasses[position],
        'bg-primary text-primary-foreground hover:bg-primary/90',
        // Better mobile positioning
        'bottom-4 right-4 sm:bottom-4 sm:right-4',
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

  // Use state to track mobile/desktop for proper rendering
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isOpen) {
    return (
      <>{isMobile ? (
        <Sheet open={isOpen} onOpenChange={onToggle}>
          <SheetTrigger asChild>
            {triggerButton}
          </SheetTrigger>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={onToggle}>
          <DialogTrigger asChild>
            {triggerButton}
          </DialogTrigger>
        </Dialog>
      )}</>
    )
  }

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex flex-row items-center justify-between space-y-0 p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">
            {profile?.fullName ? `Asistente IA - ${profile.fullName.split(' ')[0]}` : 'Asistente IA'}
          </h3>
          {(isLoading || isStreaming) && (
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
      </div>

      {!chatState.isMinimized && (
        <>
          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Inicia sesión para usar el asistente de IA
                </p>
                <Button
                  onClick={() => window.location.href = '/auth/login'}
                  size="sm"
                >
                  Iniciar Sesión
                </Button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">
                  Cargando...
                </div>
              </div>
            ) : (
              <ConversationUI
                messages={messages}
                isTyping={isLoading || isStreaming}
                onNewMessage={handleNewMessage}
                onMessageReaction={addReaction}
                onMessageEdit={editMessage}
                onMessageDelete={deleteMessage}
                showSettings={chatState.showSettings}
                conversationId={chatState.currentConversationId}
              />
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-2 border-t bg-muted/30">
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
                {isAuthenticated ? 'Ctrl+K para abrir' : 'Inicia sesión para chatear'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>{isMobile ? (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className={cn(
            'h-[85vh] max-h-[85vh]',
            themeClasses
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chat IA</SheetTitle>
          </SheetHeader>
          {chatContent}
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={isOpen} onOpenChange={onToggle}>
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
        <DialogContent
          className={cn(
            'flex flex-col shadow-2xl transition-all duration-300 ease-in-out p-0',
            themeClasses,
            // Desktop sizing
            chatState.isMinimized
              ? 'h-14 w-80'
              : 'h-[600px] w-96',
            'max-h-[90vh] max-w-[calc(100vw-0.5rem)]'
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chat IA</DialogTitle>
          </DialogHeader>
          {chatContent}
        </DialogContent>
      </Dialog>
    )
}

export type { FloatingChatProps }