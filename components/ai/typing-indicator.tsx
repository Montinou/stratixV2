'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'

interface TypingIndicatorProps {
  isVisible: boolean
  message?: string
  className?: string
  showAvatar?: boolean
  avatarLabel?: string
}

export function TypingIndicator({
  isVisible,
  message = "IA está escribiendo...",
  className,
  showAvatar = true,
  avatarLabel = "IA"
}: TypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[85%] space-x-3">
        {showAvatar && (
          <Avatar className="h-8 w-8 shrink-0 mt-1">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              {avatarLabel}
            </AvatarFallback>
          </Avatar>
        )}

        <Card className="p-3 bg-muted/80 text-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            {/* Animated dots */}
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '1000ms' }}
              />
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '150ms', animationDuration: '1000ms' }}
              />
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '300ms', animationDuration: '1000ms' }}
              />
            </div>

            {/* Optional message */}
            {message && (
              <span className="text-xs text-muted-foreground ml-2">
                {message}
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

interface PulsingTypingIndicatorProps {
  isVisible: boolean
  className?: string
}

export function PulsingTypingIndicator({
  isVisible,
  className
}: PulsingTypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className={cn('flex items-center space-x-2 p-2', className)}>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      <span className="text-xs text-muted-foreground animate-pulse">
        Escribiendo...
      </span>
    </div>
  )
}

interface ProgressTypingIndicatorProps {
  isVisible: boolean
  progress?: number // 0-100
  message?: string
  className?: string
}

export function ProgressTypingIndicator({
  isVisible,
  progress = 0,
  message = "Generando respuesta...",
  className
}: ProgressTypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className={cn('flex items-center space-x-3 p-3 bg-muted/50 rounded-lg', className)}>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">{message}</span>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1">
          <div
            className="bg-primary h-1 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface StreamingTypingIndicatorProps {
  isVisible: boolean
  currentText?: string
  className?: string
  showAvatar?: boolean
}

export function StreamingTypingIndicator({
  isVisible,
  currentText = "",
  className,
  showAvatar = true
}: StreamingTypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[85%] space-x-3">
        {showAvatar && (
          <Avatar className="h-8 w-8 shrink-0 mt-1">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              IA
            </AvatarFallback>
          </Avatar>
        )}

        <Card className="p-3 bg-muted/80 text-foreground shadow-sm">
          <div className="text-sm leading-relaxed">
            {currentText}
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          </div>
        </Card>
      </div>
    </div>
  )
}

// Compound component with all variants
export const TypingIndicators = {
  Default: TypingIndicator,
  Pulsing: PulsingTypingIndicator,
  Progress: ProgressTypingIndicator,
  Streaming: StreamingTypingIndicator
}

export type {
  TypingIndicatorProps,
  PulsingTypingIndicatorProps,
  ProgressTypingIndicatorProps,
  StreamingTypingIndicatorProps
}