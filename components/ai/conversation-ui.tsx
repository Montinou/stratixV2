'use client'

import * as React from 'react'
import { Send, Paperclip, Smile, RotateCcw, Search, Filter, Download, Share, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChatMessage } from './chat-message'
import { TypingIndicator } from './typing-indicator'
import { FileUpload, type FileUploadItem } from './file-upload'
import { ChatSettings, type ChatSettings as ChatSettingsType, DEFAULT_SETTINGS } from './chat-settings'
import { toast } from 'sonner'

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

interface ConversationUIProps {
  messages: ChatMessage[]
  isTyping?: boolean
  onNewMessage: (content: string, attachments?: File[]) => void
  onMessageReaction?: (messageId: string, reaction: string) => void
  onMessageEdit?: (messageId: string, newContent: string) => void
  onMessageDelete?: (messageId: string) => void
  showSettings?: boolean
  conversationId?: string
  placeholder?: string
  maxLength?: number
  allowAttachments?: boolean
  enableMarkdown?: boolean
  className?: string
}

// Use the ChatSettings type from the settings component

export function ConversationUI({
  messages = [],
  isTyping = false,
  onNewMessage,
  onMessageReaction,
  onMessageEdit,
  onMessageDelete,
  showSettings = false,
  conversationId,
  placeholder = 'Escribe tu mensaje...',
  maxLength = 2000,
  allowAttachments = true,
  enableMarkdown = true,
  className
}: ConversationUIProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [isComposing, setIsComposing] = React.useState(false)
  const [attachments, setAttachments] = React.useState<FileUploadItem[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFileUpload, setShowFileUpload] = React.useState(false)
  const [settings, setSettings] = React.useState<ChatSettingsType>(DEFAULT_SETTINGS)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (settings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, settings.autoScroll])

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Filter messages based on search query
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages
    return messages.filter(message =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [messages, searchQuery])

  const handleSendMessage = () => {
    if (!inputValue.trim() && attachments.length === 0) return

    if (inputValue.length > maxLength) {
      toast.error(`El mensaje es demasiado largo. Máximo ${maxLength} caracteres.`)
      return
    }

    // Convert FileUploadItems to Files for the API
    const fileAttachments = attachments
      .filter(item => item.status === 'completed')
      .map(item => item.file)

    onNewMessage(inputValue.trim(), fileAttachments)
    setInputValue('')
    setAttachments([])
    setIsComposing(false)
    setShowFileUpload(false)

    // Focus back to textarea
    textareaRef.current?.focus()
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleFilesSelected = (newFiles: FileUploadItem[]) => {
    setAttachments(prev => [...prev, ...newFiles])
  }

  const handleFileRemove = (fileId: string) => {
    setAttachments(prev => prev.filter(item => item.id !== fileId))
  }

  const clearConversation = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar toda la conversación?')) {
      toast.success('Conversación borrada')
      // This would typically call a prop function to clear messages
    }
  }

  const exportConversation = () => {
    const exportData = {
      conversationId,
      timestamp: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversacion-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Conversación exportada')
  }

  const handleNewConversation = () => {
    if (messages.length > 0 && window.confirm('¿Quieres empezar una nueva conversación? Se perderá la actual.')) {
      setInputValue('')
      setAttachments([])
      toast.success('Nueva conversación iniciada')
      // This would typically call a prop function to start new conversation
    }
  }

  const suggestionQuestions = [
    '¿Cómo puedo mejorar mis OKRs?',
    'Analiza mis objetivos actuales',
    'Sugiere métricas para mi equipo',
    '¿Qué es un buen Key Result?'
  ]

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b bg-muted/30 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
          <ChatSettings
            settings={settings}
            onSettingsChange={setSettings}
            className="border-0 shadow-none bg-transparent max-w-none"
          />
        </div>
      )}

      {/* Conversation Header with Controls */}
      {!showSettings && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-40 sm:max-w-none">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs w-full"
              />
            </div>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {filteredMessages.length} de {messages.length}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Filter className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewConversation}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nueva conversación
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportConversation}>
                <Download className="h-4 w-4 mr-2" />
                Exportar chat
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share className="h-4 w-4 mr-2" />
                Compartir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearConversation} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Borrar conversación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {filteredMessages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-muted-foreground text-sm mb-4">
                ¡Hola! Soy tu asistente de IA para OKRs.
                <br />
                ¿En qué puedo ayudarte hoy?
              </div>

              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {suggestionQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue(question)}
                    className="text-xs h-8 justify-start"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={message.isStreaming}
                showActions={true}
                showAvatar={true}
                onReaction={onMessageReaction}
                onCopy={(content) => toast.success('Copiado al portapapeles')}
                onEdit={onMessageEdit}
                onDelete={onMessageDelete}
              />
            ))
          )}

          <TypingIndicator
            isVisible={isTyping}
            message="IA está escribiendo..."
            showAvatar={true}
          />

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* File Upload Area */}
      {showFileUpload && allowAttachments && (
        <div className="p-4 border-t bg-muted/30">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            uploadedFiles={attachments}
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024} // 10MB
          />
        </div>
      )}

      {/* Attachments Preview (compact) */}
      {attachments.length > 0 && !showFileUpload && (
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {attachments.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center space-x-1 bg-background rounded px-2 py-1 text-xs">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-16">{item.file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0"
                    onClick={() => handleFileRemove(item.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              {attachments.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowFileUpload(true)}
                >
                  +{attachments.length - 3} más
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              {showFileUpload ? 'Ocultar' : 'Ver todo'}
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Message Input */}
      <div className="p-3 space-y-2">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setIsComposing(e.target.value.length > 0)
              }}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="min-h-[40px] max-h-32 resize-none pr-16 sm:pr-20 text-sm"
              disabled={isTyping}
              maxLength={maxLength}
            />

            <div className="absolute bottom-2 right-2 flex items-center space-x-1">
              {allowAttachments && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  disabled={isTyping}
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hidden sm:inline-flex"
                disabled={isTyping}
              >
                <Smile className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && attachments.length === 0) || isTyping}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {isComposing && `${inputValue.length}/${maxLength}`}
          </span>
          <span className="hidden sm:block">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </span>
          <span className="sm:hidden">
            Enter para enviar
          </span>
        </div>
      </div>
    </div>
  )
}

export type { ConversationUIProps, ChatMessage, ChatAttachment, ConversationSettings }