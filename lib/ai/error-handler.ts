/**
 * AI Error Handler - Comprehensive error handling for AI Gateway operations
 * Follows the existing error handling patterns from database-errors.ts
 */

export enum AIErrorCode {
  // Authentication errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',

  // Model and provider errors
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  MODEL_OVERLOADED = 'MODEL_OVERLOADED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',

  // Request errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PROMPT = 'INVALID_PROMPT',
  PROMPT_TOO_LONG = 'PROMPT_TOO_LONG',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',

  // Response errors
  RESPONSE_TIMEOUT = 'RESPONSE_TIMEOUT',
  RESPONSE_TOO_LARGE = 'RESPONSE_TOO_LARGE',
  MALFORMED_RESPONSE = 'MALFORMED_RESPONSE',
  CONTENT_FILTERED = 'CONTENT_FILTERED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_ENVIRONMENT_VARIABLE = 'MISSING_ENVIRONMENT_VARIABLE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',

  // Application errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AIErrorContext {
  operation: string
  model?: string
  provider?: string
  prompt?: string
  userId?: string
  retryCount?: number
  timestamp: Date
  metadata?: Record<string, any>
}

export class AIError extends Error {
  public readonly code: AIErrorCode
  public readonly context: AIErrorContext
  public readonly isRetryable: boolean
  public readonly originalError?: Error
  public readonly retryAfter?: number

  constructor(
    code: AIErrorCode,
    message: string,
    context: AIErrorContext,
    isRetryable: boolean = false,
    originalError?: Error,
    retryAfter?: number
  ) {
    super(message)
    this.name = 'AIError'
    this.code = code
    this.context = context
    this.isRetryable = isRetryable
    this.originalError = originalError
    this.retryAfter = retryAfter

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError)
    }

    // Log the error (following existing pattern)
    this.logError()
  }

  private logError(): void {
    const logData = {
      operation: {
        operation: this.context.operation,
        model: this.context.model,
        provider: this.context.provider,
        timestamp: this.context.timestamp
      },
      level: 'ERROR' as const,
      error: this,
      metadata: {
        errorCode: this.code,
        isRetryable: this.isRetryable,
        retryCount: this.context.retryCount,
        retryAfter: this.retryAfter,
        userId: this.context.userId,
        ...this.context.metadata
      }
    }

    console.error('[AI Error]', logData)
  }
}

export class AIErrorMapper {
  private static readonly httpStatusCodeMap: Record<number, AIErrorCode> = {
    // 4xx Client errors
    400: AIErrorCode.INVALID_REQUEST,
    401: AIErrorCode.AUTHENTICATION_FAILED,
    403: AIErrorCode.AUTHORIZATION_DENIED,
    413: AIErrorCode.PROMPT_TOO_LONG,
    422: AIErrorCode.INVALID_PARAMETERS,
    429: AIErrorCode.RATE_LIMIT_EXCEEDED,

    // 5xx Server errors
    500: AIErrorCode.PROVIDER_ERROR,
    502: AIErrorCode.GATEWAY_TIMEOUT,
    503: AIErrorCode.SERVICE_UNAVAILABLE,
    504: AIErrorCode.RESPONSE_TIMEOUT,
  }

  private static readonly errorMessageMap: Record<string, AIErrorCode> = {
    // Authentication patterns
    'invalid api key': AIErrorCode.INVALID_API_KEY,
    'unauthorized': AIErrorCode.AUTHENTICATION_FAILED,
    'forbidden': AIErrorCode.AUTHORIZATION_DENIED,

    // Rate limiting patterns
    'rate limit': AIErrorCode.RATE_LIMIT_EXCEEDED,
    'quota exceeded': AIErrorCode.QUOTA_EXCEEDED,
    'too many requests': AIErrorCode.RATE_LIMIT_EXCEEDED,

    // Model/Provider patterns
    'model not found': AIErrorCode.MODEL_NOT_AVAILABLE,
    'model unavailable': AIErrorCode.MODEL_NOT_AVAILABLE,
    'provider unavailable': AIErrorCode.PROVIDER_UNAVAILABLE,
    'service overloaded': AIErrorCode.MODEL_OVERLOADED,

    // Content patterns
    'content filtered': AIErrorCode.CONTENT_FILTERED,
    'inappropriate content': AIErrorCode.CONTENT_FILTERED,

    // Network patterns
    'timeout': AIErrorCode.RESPONSE_TIMEOUT,
    'network error': AIErrorCode.NETWORK_ERROR,
    'connection failed': AIErrorCode.NETWORK_ERROR,
    'econnrefused': AIErrorCode.NETWORK_ERROR,
    'enotfound': AIErrorCode.NETWORK_ERROR,
  }

  public static mapError(
    error: Error,
    context: AIErrorContext
  ): AIError {
    // Handle AI Gateway specific errors
    if (this.isAIGatewayError(error)) {
      return this.mapAIGatewayError(error, context)
    }

    // Handle HTTP errors
    if (this.isHTTPError(error)) {
      return this.mapHTTPError(error, context)
    }

    // Handle configuration errors
    if (this.isConfigurationError(error)) {
      return new AIError(
        AIErrorCode.CONFIGURATION_ERROR,
        `Configuration error: ${error.message}`,
        context,
        false,
        error
      )
    }

    // Handle network errors
    if (this.isNetworkError(error)) {
      return new AIError(
        AIErrorCode.NETWORK_ERROR,
        `Network error: ${error.message}`,
        context,
        true,
        error
      )
    }

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      return new AIError(
        AIErrorCode.RESPONSE_TIMEOUT,
        `Operation timeout: ${error.message}`,
        context,
        true,
        error
      )
    }

    // Map by error message patterns
    const messageCode = this.mapByMessage(error.message)
    if (messageCode) {
      const isRetryable = this.isRetryableError(messageCode)
      return new AIError(
        messageCode,
        error.message,
        context,
        isRetryable,
        error
      )
    }

    // Default to unknown error
    return new AIError(
      AIErrorCode.UNKNOWN_ERROR,
      `Unknown AI error: ${error.message}`,
      context,
      false,
      error
    )
  }

  private static isAIGatewayError(error: Error): boolean {
    return error.name === 'AIGatewayError' ||
           error.message.includes('AI Gateway') ||
           error.message.includes('Vercel AI')
  }

  private static mapAIGatewayError(error: Error, context: AIErrorContext): AIError {
    // Extract specific AI Gateway error information
    const message = error.message.toLowerCase()

    if (message.includes('api key')) {
      return new AIError(
        AIErrorCode.INVALID_API_KEY,
        'Invalid AI Gateway API key',
        context,
        false,
        error
      )
    }

    if (message.includes('model not found') || message.includes('model unavailable')) {
      return new AIError(
        AIErrorCode.MODEL_NOT_AVAILABLE,
        `Model ${context.model} is not available`,
        context,
        true,
        error
      )
    }

    return new AIError(
      AIErrorCode.PROVIDER_ERROR,
      `AI Gateway error: ${error.message}`,
      context,
      true,
      error
    )
  }

  private static isHTTPError(error: Error): boolean {
    return 'status' in error ||
           'statusCode' in error ||
           error.message.includes('HTTP')
  }

  private static mapHTTPError(error: Error, context: AIErrorContext): AIError {
    const status = (error as any).status || (error as any).statusCode
    const code = this.httpStatusCodeMap[status] || AIErrorCode.UNKNOWN_ERROR
    const isRetryable = this.isRetryableError(code)

    let retryAfter: number | undefined
    if (code === AIErrorCode.RATE_LIMIT_EXCEEDED) {
      // Try to extract retry-after header
      const retryAfterHeader = (error as any).headers?.['retry-after']
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10)
      }
    }

    return new AIError(
      code,
      `HTTP ${status}: ${error.message}`,
      context,
      isRetryable,
      error,
      retryAfter
    )
  }

  private static isConfigurationError(error: Error): boolean {
    const configKeywords = [
      'environment variable',
      'configuration',
      'config',
      'missing key',
      'invalid key'
    ]

    return configKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    )
  }

  private static isNetworkError(error: Error): boolean {
    const networkKeywords = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'network error',
      'connection failed'
    ]

    return networkKeywords.some(keyword =>
      error.message.includes(keyword)
    )
  }

  private static isTimeoutError(error: Error): boolean {
    const timeoutKeywords = [
      'timeout',
      'ETIMEDOUT',
      'request timeout',
      'response timeout'
    ]

    return timeoutKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    )
  }

  private static mapByMessage(message: string): AIErrorCode | null {
    const lowerMessage = message.toLowerCase()

    for (const [pattern, code] of Object.entries(this.errorMessageMap)) {
      if (lowerMessage.includes(pattern)) {
        return code
      }
    }

    return null
  }

  private static isRetryableError(code: AIErrorCode): boolean {
    const retryableCodes = new Set([
      AIErrorCode.RATE_LIMIT_EXCEEDED,
      AIErrorCode.MODEL_OVERLOADED,
      AIErrorCode.PROVIDER_UNAVAILABLE,
      AIErrorCode.RESPONSE_TIMEOUT,
      AIErrorCode.NETWORK_ERROR,
      AIErrorCode.CONNECTION_TIMEOUT,
      AIErrorCode.SERVICE_UNAVAILABLE,
      AIErrorCode.GATEWAY_TIMEOUT,
    ])

    return retryableCodes.has(code)
  }
}

export class AIErrorHandler {
  private static readonly maxRetries = 3
  private static readonly baseRetryDelay = 1000 // 1 second

  public static async handleError<T>(
    error: Error,
    context: AIErrorContext,
    retryFn?: () => Promise<T>
  ): Promise<never | T> {
    const aiError = AIErrorMapper.mapError(error, context)

    // If error is not retryable or no retry function provided, throw immediately
    if (!aiError.isRetryable || !retryFn) {
      throw aiError
    }

    // If we've exceeded max retries, throw the error
    const retryCount = context.retryCount || 0
    if (retryCount >= this.maxRetries) {
      throw new AIError(
        aiError.code,
        `Max retries (${this.maxRetries}) exceeded: ${aiError.message}`,
        { ...context, retryCount },
        false,
        aiError
      )
    }

    // Calculate retry delay with exponential backoff
    const delay = Math.min(
      this.baseRetryDelay * Math.pow(2, retryCount),
      aiError.retryAfter ? aiError.retryAfter * 1000 : 30000 // Max 30 seconds
    )

    console.log(`[AI Retry] Attempt ${retryCount + 1}/${this.maxRetries} after ${delay}ms for operation: ${context.operation}`)

    // Wait before retrying
    await this.sleep(delay)

    // Retry with incremented count
    try {
      return await retryFn()
    } catch (retryError) {
      return this.handleError(
        retryError as Error,
        { ...context, retryCount: retryCount + 1 },
        retryFn
      )
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public static createContext(
    operation: string,
    model?: string,
    provider?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): AIErrorContext {
    return {
      operation,
      model,
      provider,
      userId,
      timestamp: new Date(),
      metadata
    }
  }

  public static isRetryableError(error: Error): boolean {
    if (error instanceof AIError) {
      return error.isRetryable
    }

    // Check for common retryable error patterns
    return AIErrorMapper.mapError(
      error,
      { operation: 'error_check', timestamp: new Date() }
    ).isRetryable
  }

  /**
   * Get user-friendly error message
   */
  public static getUserMessage(error: AIError): string {
    switch (error.code) {
      case AIErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait a moment before trying again.'
      case AIErrorCode.QUOTA_EXCEEDED:
        return 'Usage quota exceeded. Please contact support to increase your limits.'
      case AIErrorCode.MODEL_NOT_AVAILABLE:
        return 'The AI service is temporarily unavailable. Please try again later.'
      case AIErrorCode.CONTENT_FILTERED:
        return 'Your request contains inappropriate content. Please modify your input.'
      case AIErrorCode.PROMPT_TOO_LONG:
        return 'Your input is too long. Please shorten it and try again.'
      case AIErrorCode.SERVICE_UNAVAILABLE:
        return 'AI service is temporarily unavailable. Please try again later.'
      case AIErrorCode.AUTHENTICATION_FAILED:
        return 'Authentication failed. Please check your credentials.'
      default:
        return 'Something went wrong with the AI service. Please try again later.'
    }
  }
}

// Utility function to wrap AI operations with error handling
export function withErrorHandling<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  model?: string,
  provider?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const context = AIErrorHandler.createContext(
        operation,
        model,
        provider,
        undefined,
        { args: args.length }
      )

      return AIErrorHandler.handleError(
        error as Error,
        context,
        () => fn(...args)
      )
    }
  }
}