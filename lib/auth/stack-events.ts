import type { User } from "@stackframe/stack"
import type { StackClientApp } from "@stackframe/stack"
import type { 
  StackAuthEvent, 
  StackAuthEventPayload, 
  StackEventHandler, 
  StackEventHandlers,
  AuthIntegrationConfig,
  DEFAULT_AUTH_CONFIG
} from "@/lib/types/auth-integration"
import { AuthIntegrationError } from "@/lib/types/auth-integration"

/**
 * Stack Authentication Event Handler
 * 
 * Manages Stack Auth events and coordinates with profile lifecycle management.
 * This is the primary interface between Stack Auth state changes and the application.
 */

export class StackAuthEventManager {
  private eventHandlers: Map<StackAuthEvent, StackEventHandler[]> = new Map()
  private config: AuthIntegrationConfig
  private isListening = false
  private unsubscribeFunction: (() => void) | null = null

  constructor(config: AuthIntegrationConfig = DEFAULT_AUTH_CONFIG) {
    this.config = config
    this.initializeEventHandlers()
  }

  private initializeEventHandlers() {
    // Initialize empty handler arrays for each event type
    this.eventHandlers.set("signIn", [])
    this.eventHandlers.set("signOut", [])
    this.eventHandlers.set("userUpdate", [])
  }

  /**
   * Register event handler for specific Stack auth events
   */
  public on(event: StackAuthEvent, handler: StackEventHandler): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
  }

  /**
   * Unregister event handler
   */
  public off(event: StackAuthEvent, handler: StackEventHandler): void {
    const handlers = this.eventHandlers.get(event) || []
    const filteredHandlers = handlers.filter(h => h !== handler)
    this.eventHandlers.set(event, filteredHandlers)
  }

  /**
   * Register multiple event handlers at once
   */
  public registerHandlers(handlers: StackEventHandlers): void {
    if (handlers.onSignIn) {
      this.on("signIn", handlers.onSignIn)
    }
    if (handlers.onSignOut) {
      this.on("signOut", handlers.onSignOut)
    }
    if (handlers.onUserUpdate) {
      this.on("userUpdate", handlers.onUserUpdate)
    }
  }

  /**
   * Start listening to Stack Auth state changes
   */
  public startListening(stackClient: StackClientApp): void {
    if (this.isListening) {
      console.warn('StackAuthEventManager is already listening')
      return
    }

    try {
      // Set up Stack Auth state change listener
      this.unsubscribeFunction = stackClient.onUserChange(async (user: User | null) => {
        await this.handleUserChange(user)
      })

      this.isListening = true
      console.log('StackAuthEventManager started listening to auth events')
    } catch (error) {
      throw new AuthIntegrationError(
        'Failed to start listening to Stack auth events',
        'STACK_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Stop listening to Stack Auth state changes
   */
  public stopListening(): void {
    if (!this.isListening) {
      return
    }

    if (this.unsubscribeFunction) {
      this.unsubscribeFunction()
      this.unsubscribeFunction = null
    }

    this.isListening = false
    console.log('StackAuthEventManager stopped listening to auth events')
  }

  /**
   * Handle Stack Auth user state changes
   */
  private async handleUserChange(user: User | null): Promise<void> {
    try {
      // Determine the event type based on user state
      const eventType: StackAuthEvent = user ? "signIn" : "signOut"
      
      const payload: StackAuthEventPayload = {
        type: eventType,
        user,
        timestamp: new Date()
      }

      console.log(`Stack auth event: ${eventType}`, { 
        userId: user?.id || null,
        email: user?.primaryEmail || null 
      })

      // Execute all registered handlers for this event type
      await this.executeHandlers(eventType, payload)

    } catch (error) {
      console.error('Error handling Stack auth state change:', error)
      
      // Don't throw here to prevent breaking the auth flow
      // Instead, log the error and continue
      if (error instanceof AuthIntegrationError) {
        throw error
      } else {
        throw new AuthIntegrationError(
          'Failed to handle auth state change',
          'SYNC_ERROR',
          error instanceof Error ? error : undefined
        )
      }
    }
  }

  /**
   * Execute all handlers for a specific event type
   */
  private async executeHandlers(eventType: StackAuthEvent, payload: StackAuthEventPayload): Promise<void> {
    const handlers = this.eventHandlers.get(eventType) || []
    
    if (handlers.length === 0) {
      console.log(`No handlers registered for ${eventType} event`)
      return
    }

    // Execute handlers with retry logic
    for (const handler of handlers) {
      await this.executeHandlerWithRetry(handler, payload)
    }
  }

  /**
   * Execute a single handler with retry logic
   */
  private async executeHandlerWithRetry(
    handler: StackEventHandler, 
    payload: StackAuthEventPayload
  ): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await handler(payload)
        return // Success, no retry needed
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        console.warn(`Handler execution failed (attempt ${attempt}/${this.config.retryAttempts}):`, lastError)

        if (attempt < this.config.retryAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs))
        }
      }
    }

    // All retries failed
    throw new AuthIntegrationError(
      `Handler execution failed after ${this.config.retryAttempts} attempts`,
      'SYNC_ERROR',
      lastError || undefined
    )
  }

  /**
   * Manually trigger an event (useful for testing)
   */
  public async triggerEvent(eventType: StackAuthEvent, user: User | null): Promise<void> {
    const payload: StackAuthEventPayload = {
      type: eventType,
      user,
      timestamp: new Date()
    }

    await this.executeHandlers(eventType, payload)
  }

  /**
   * Get current configuration
   */
  public getConfig(): AuthIntegrationConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AuthIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Check if currently listening to events
   */
  public isCurrentlyListening(): boolean {
    return this.isListening
  }

  /**
   * Get number of registered handlers for each event type
   */
  public getHandlerCounts(): Record<StackAuthEvent, number> {
    return {
      signIn: this.eventHandlers.get("signIn")?.length || 0,
      signOut: this.eventHandlers.get("signOut")?.length || 0,
      userUpdate: this.eventHandlers.get("userUpdate")?.length || 0,
    }
  }

  /**
   * Clear all event handlers
   */
  public clearAllHandlers(): void {
    this.eventHandlers.clear()
    this.initializeEventHandlers()
  }

  /**
   * Cleanup - stop listening and clear handlers
   */
  public cleanup(): void {
    this.stopListening()
    this.clearAllHandlers()
  }
}

// Singleton instance for global use
let globalEventManager: StackAuthEventManager | null = null

/**
 * Get or create the global Stack Auth event manager instance
 */
export function getStackAuthEventManager(config?: AuthIntegrationConfig): StackAuthEventManager {
  if (!globalEventManager) {
    globalEventManager = new StackAuthEventManager(config)
  }
  return globalEventManager
}

/**
 * Initialize Stack Auth event handling with default configuration
 */
export function initializeStackAuth(
  stackClient: StackClientApp,
  config?: AuthIntegrationConfig
): StackAuthEventManager {
  const eventManager = getStackAuthEventManager(config)
  eventManager.startListening(stackClient)
  return eventManager
}

/**
 * Cleanup global Stack Auth event handling
 */
export function cleanupStackAuth(): void {
  if (globalEventManager) {
    globalEventManager.cleanup()
    globalEventManager = null
  }
}