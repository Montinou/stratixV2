import { type NextRequest, NextResponse } from "next/server";
import { onboardingSecurityMiddleware, generateSecurityHeaders, logSecurityEvent } from "./onboarding-security";
import { sanitizeInput } from "./onboarding-security";
import { RateLimitUtils } from "@/lib/redis/rate-limiter";
import { z } from "zod";

// Middleware configuration types
export interface MiddlewareConfig {
  requireAuth: boolean;
  rateLimitType?: 'ai' | 'session' | 'organization' | 'standard';
  rateLimitOperation?: string;
  validateInput?: boolean;
  sanitizeInput?: boolean;
  logRequests?: boolean;
  customRateLimit?: { limit: number; window: number };
}

export interface MiddlewareResult {
  success: boolean;
  response?: NextResponse;
  context?: {
    user_id: string;
    sanitized_data?: any;
    rate_limit_info?: {
      remaining: number;
      resetTime: number;
    };
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Main onboarding middleware factory
 */
export function createOnboardingMiddleware(config: MiddlewareConfig = { requireAuth: true }) {
  return async function middleware(
    request: NextRequest,
    endpoint: string,
    validationSchema?: z.ZodSchema
  ): Promise<MiddlewareResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let context: any = {};

    try {
      // 1. Security validation
      const securityResult = await onboardingSecurityMiddleware(
        request,
        endpoint,
        config.rateLimitType === 'ai' ? 'AI_ENDPOINTS' :
        config.rateLimitType === 'session' ? 'SESSION_MANAGEMENT' :
        config.rateLimitType === 'organization' ? 'ORGANIZATION_OPS' :
        'ONBOARDING_STANDARD'
      );

      if (!securityResult.isValid) {
        logSecurityEvent('ACCESS_DENIED', securityResult.context);

        return {
          success: false,
          response: new NextResponse(
            JSON.stringify({
              error: 'Acceso denegado',
              details: securityResult.errors
            }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                ...generateSecurityHeaders()
              }
            }
          ),
          errors: securityResult.errors,
          warnings: securityResult.warnings
        };
      }

      context.user_id = securityResult.context.user_id;
      warnings.push(...securityResult.warnings);

      // 2. Additional rate limiting for specific operations
      if (config.rateLimitType && config.rateLimitOperation) {
        const rateLimitCheck = await checkSpecificRateLimit(
          securityResult.context.user_id,
          config.rateLimitType,
          config.rateLimitOperation,
          config.customRateLimit
        );

        if (!rateLimitCheck.allowed) {
          logSecurityEvent('RATE_LIMIT_EXCEEDED', securityResult.context, {
            operation: config.rateLimitOperation,
            type: config.rateLimitType
          });

          return {
            success: false,
            response: new NextResponse(
              JSON.stringify({
                error: 'Límite de solicitudes excedido',
                details: [`Operación ${config.rateLimitOperation} limitada`],
                retry_after: Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString(),
                  'X-RateLimit-Limit': '20',
                  'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
                  'X-RateLimit-Reset': rateLimitCheck.resetTime.toString(),
                  ...generateSecurityHeaders()
                }
              }
            ),
            errors: ['Rate limit exceeded']
          };
        }

        context.rate_limit_info = {
          remaining: rateLimitCheck.remaining,
          resetTime: rateLimitCheck.resetTime
        };
      }

      // 3. Input validation and sanitization
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          let processedBody = body;

          // Sanitize input if requested
          if (config.sanitizeInput) {
            const sanitizeResult = sanitizeInput(body, {
              allowHTML: false,
              maxLength: 10000,
              allowSpecialChars: false
            });

            processedBody = sanitizeResult.sanitized;
            warnings.push(...sanitizeResult.warnings);

            if (sanitizeResult.suspicious) {
              logSecurityEvent('SUSPICIOUS_ACTIVITY', securityResult.context, {
                endpoint,
                original_data: body,
                sanitized_data: processedBody
              });
              warnings.push('Actividad sospechosa detectada y sanitizada');
            }
          }

          // Validate input schema if provided
          if (validationSchema) {
            const validationResult = validationSchema.safeParse(processedBody);

            if (!validationResult.success) {
              const validationErrors = validationResult.error.errors.map(
                error => `${error.path.join('.')}: ${error.message}`
              );

              return {
                success: false,
                response: new NextResponse(
                  JSON.stringify({
                    error: 'Datos de entrada inválidos',
                    details: validationErrors
                  }),
                  {
                    status: 400,
                    headers: {
                      'Content-Type': 'application/json',
                      ...generateSecurityHeaders()
                    }
                  }
                ),
                errors: validationErrors
              };
            }

            processedBody = validationResult.data;
          }

          context.sanitized_data = processedBody;

        } catch (parseError) {
          return {
            success: false,
            response: new NextResponse(
              JSON.stringify({
                error: 'Formato de datos inválido',
                details: ['JSON malformado']
              }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...generateSecurityHeaders()
                }
              }
            ),
            errors: ['Invalid JSON format']
          };
        }
      }

      // 4. Log successful request if requested
      if (config.logRequests) {
        console.log(`Onboarding Request: ${request.method} ${endpoint}`, {
          user_id: context.user_id,
          ip: securityResult.context.ip_address,
          user_agent: securityResult.context.user_agent,
          processing_time: Date.now() - startTime,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      }

      return {
        success: true,
        context,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('Middleware error:', error);

      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Error interno del servidor',
            details: ['Error de procesamiento de middleware']
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...generateSecurityHeaders()
            }
          }
        ),
        errors: ['Internal middleware error']
      };
    }
  };
}

/**
 * Check specific rate limits for operations
 */
async function checkSpecificRateLimit(
  userId: string,
  type: 'ai' | 'session' | 'organization',
  operation: string,
  customLimit?: { limit: number; window: number }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  switch (type) {
    case 'ai':
      return RateLimitUtils.checkAIUsageLimit(userId, operation as any);
    case 'session':
      return RateLimitUtils.checkSessionLimit(userId, operation as any);
    case 'organization':
      return RateLimitUtils.checkOrganizationLimit(userId, operation as any);
    default:
      throw new Error(`Unknown rate limit type: ${type}`);
  }
}

/**
 * Preset middleware configurations for common scenarios
 */
export const MiddlewarePresets = {
  // Standard onboarding endpoints
  ONBOARDING_STANDARD: {
    requireAuth: true,
    rateLimitType: 'standard' as const,
    validateInput: true,
    sanitizeInput: true,
    logRequests: true
  },

  // AI-powered endpoints
  AI_ENDPOINTS: {
    requireAuth: true,
    rateLimitType: 'ai' as const,
    validateInput: true,
    sanitizeInput: true,
    logRequests: true
  },

  // Session management
  SESSION_MANAGEMENT: {
    requireAuth: true,
    rateLimitType: 'session' as const,
    validateInput: true,
    sanitizeInput: false,
    logRequests: true
  },

  // Organization operations
  ORGANIZATION_OPS: {
    requireAuth: true,
    rateLimitType: 'organization' as const,
    validateInput: true,
    sanitizeInput: true,
    logRequests: true
  },

  // Read-only endpoints (less restrictive)
  READ_ONLY: {
    requireAuth: true,
    validateInput: false,
    sanitizeInput: false,
    logRequests: false,
    customRateLimit: { limit: 100, window: 60 * 60 * 1000 } // 100 per hour
  }
};

/**
 * Helper function to create response with security headers
 */
export function createSecureResponse(
  data: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return new NextResponse(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...generateSecurityHeaders(additionalHeaders)
      }
    }
  );
}

/**
 * Error response factory
 */
export function createErrorResponse(
  error: string,
  details?: string[],
  status: number = 400,
  additionalData?: Record<string, any>
): NextResponse {
  return createSecureResponse(
    {
      error,
      details,
      timestamp: new Date().toISOString(),
      ...additionalData
    },
    status
  );
}

/**
 * Success response factory
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  additionalHeaders?: Record<string, string>
): NextResponse {
  return createSecureResponse(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    },
    200,
    additionalHeaders
  );
}

/**
 * Middleware wrapper for API routes
 */
export function withOnboardingMiddleware(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  config: MiddlewareConfig = { requireAuth: true },
  validationSchema?: z.ZodSchema
) {
  return async function wrappedHandler(request: NextRequest): Promise<NextResponse> {
    const endpoint = new URL(request.url).pathname;
    const middleware = createOnboardingMiddleware(config);

    const middlewareResult = await middleware(request, endpoint, validationSchema);

    if (!middlewareResult.success) {
      return middlewareResult.response!;
    }

    try {
      // If input was sanitized, modify the request
      if (middlewareResult.context?.sanitized_data) {
        // Create a new request with sanitized data
        const modifiedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(middlewareResult.context.sanitized_data)
        });

        return await handler(modifiedRequest, middlewareResult.context);
      }

      return await handler(request, middlewareResult.context);

    } catch (error) {
      console.error('Handler error:', error);

      return createErrorResponse(
        'Error interno del servidor',
        ['Error al procesar la solicitud'],
        500
      );
    }
  };
}

export default createOnboardingMiddleware;