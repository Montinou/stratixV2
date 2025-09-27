'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import type { Message, CreateMessage } from 'ai'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  attachments?: ChatAttachment[]
  reactions?: MessageReaction[]
}

export interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'document' | 'text'
  url: string
  size: number
}

export interface MessageReaction {
  type: 'like' | 'dislike' | 'heart'
  count: number
  userReacted: boolean
}

export interface ChatContext {
  department?: string
  role?: string
  companySize?: 'startup' | 'pyme' | 'empresa' | 'corporacion'
}

export interface UseChatOptions {
  conversationId?: string
  initialContext?: ChatContext
  onError?: (error: Error) => void
  onFinish?: (message: Message) => void
}

export interface UseChatResult {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  input: string
  setInput: (input: string) => void
  handleSubmit: (e?: React.FormEvent) => void
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  regenerateLastMessage: () => void
  clearConversation: () => void
  addReaction: (messageId: string, reaction: string) => void
  removeReaction: (messageId: string, reaction: string) => void
  editMessage: (messageId: string, newContent: string) => void
  deleteMessage: (messageId: string) => void
  retryMessage: (messageId: string) => void
}

export function useChatAI(options: UseChatOptions = {}): UseChatResult {
  const { conversationId, initialContext, onError, onFinish } = options

  // State for message reactions and metadata
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({})
  const [messageAttachments, setMessageAttachments] = useState<Record<string, ChatAttachment[]>>({})
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([])

  // Use Vercel AI SDK's useChat hook
  const {
    messages: aiMessages,
    input,
    setInput,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages
  } = useChat({
    api: '/api/ai/chat',
    body: {
      conversationId,
      context: initialContext
    },
    onError: (error) => {
      console.error('Chat error:', error)
      onError?.(error)
    },
    onFinish: (message) => {
      onFinish?.(message)
    }
  })

  // Convert AI SDK messages to our ChatMessage format
  const messages: ChatMessage[] = aiMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.createdAt || new Date(),
    isStreaming: false, // Will be updated in real-time
    attachments: messageAttachments[msg.id] || [],
    reactions: messageReactions[msg.id] || []
  }))

  // Check if currently streaming (last message is assistant and still loading)
  const isStreaming = isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant'

  // Update streaming status for last message
  if (isStreaming && messages.length > 0) {
    messages[messages.length - 1].isStreaming = true
  }

  // Handle file uploads
  const uploadAttachments = async (files: File[]): Promise<ChatAttachment[]> => {
    // TODO: Implement file upload to Supabase Storage
    // For now, create mock attachments
    return files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      url: URL.createObjectURL(file), // Temporary URL
      size: file.size
    }))
  }

  // Send message with attachments
  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    try {
      let uploadedAttachments: ChatAttachment[] = []

      // Upload attachments if provided
      if (attachments && attachments.length > 0) {
        uploadedAttachments = await uploadAttachments(attachments)
      }

      // Create user message
      const userMessage: CreateMessage = {
        role: 'user',
        content: content
      }

      // Store attachments for the message (will be associated after message is created)
      if (uploadedAttachments.length > 0) {
        setPendingAttachments(uploadedAttachments.map(att => new File([], att.name)))
      }

      // Send message using AI SDK
      await append(userMessage)

      // Clear pending attachments
      setPendingAttachments([])

    } catch (error) {
      console.error('Error sending message:', error)
      onError?.(error as Error)
    }
  }, [append, onError])

  // Enhanced submit handler
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim() && pendingAttachments.length === 0) return

    sendMessage(input, pendingAttachments)
    setInput('')
    setPendingAttachments([])
  }, [input, pendingAttachments, sendMessage, setInput])

  // Regenerate last message
  const regenerateLastMessage = useCallback(() => {
    if (messages.length > 0) {
      const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user')
      if (lastUserMessageIndex >= 0) {
        // Remove messages from last user message onwards and regenerate
        const newMessages = messages.slice(0, lastUserMessageIndex + 1)
        setMessages(newMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.timestamp
        })))
        reload()
      }
    }
  }, [messages, setMessages, reload])

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([])
    setMessageReactions({})
    setMessageAttachments({})
    setPendingAttachments([])
  }, [setMessages])

  // Add reaction to message
  const addReaction = useCallback((messageId: string, reactionType: string) => {
    setMessageReactions(prev => {
      const messageReactions = prev[messageId] || []
      const existingReaction = messageReactions.find(r => r.type === reactionType)

      if (existingReaction) {
        // Toggle reaction
        return {
          ...prev,
          [messageId]: messageReactions.map(r =>
            r.type === reactionType
              ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
              : r
          ).filter(r => r.count > 0)
        }
      } else {
        // Add new reaction
        return {
          ...prev,
          [messageId]: [...messageReactions, { type: reactionType as any, count: 1, userReacted: true }]
        }
      }
    })
  }, [])

  // Remove reaction from message
  const removeReaction = useCallback((messageId: string, reactionType: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || []).map(r =>
        r.type === reactionType && r.userReacted
          ? { ...r, count: r.count - 1, userReacted: false }
          : r
      ).filter(r => r.count > 0)
    }))
  }, [])

  // Edit message (only for user messages)
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex >= 0 && messages[messageIndex].role === 'user') {
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent
      }

      // Update AI SDK messages
      setMessages(updatedMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.timestamp
      })))
    }
  }, [messages, setMessages])

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    const updatedMessages = messages.filter(m => m.id !== messageId)
    setMessages(updatedMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.timestamp
    })))

    // Clean up reactions and attachments
    setMessageReactions(prev => {
      const { [messageId]: _, ...rest } = prev
      return rest
    })
    setMessageAttachments(prev => {
      const { [messageId]: _, ...rest } = prev
      return rest
    })
  }, [messages, setMessages])

  // Retry message
  const retryMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex >= 0) {
      // Remove from this message onwards and regenerate
      const newMessages = messages.slice(0, messageIndex)
      setMessages(newMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.timestamp
      })))
      reload()
    }
  }, [messages, setMessages, reload])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    input,
    setInput,
    handleSubmit,
    sendMessage,
    regenerateLastMessage,
    clearConversation,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    retryMessage
  }
}