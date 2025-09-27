import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { ratelimit } from "@/lib/redis/rate-limiter";
import DOMPurify from 'isomorphic-dompurify';

// Rate limiting configurations for different endpoint types
export const RATE_LIMITS = {
  // Standard onboarding endpoints
  ONBOARDING_STANDARD: {
    limit: 50,
    window: 60 * 60 * 1000, // 1 hour
    message: 'Demasiadas solicitudes de onboarding. Intenta de nuevo en una hora.'
  },
  // AI-powered endpoints (more restrictive)
  AI_ENDPOINTS: {
    limit: 20,
    window: 60 * 60 * 1000, // 1 hour
    message: 'Límite de solicitudes de IA excedido. Intenta de nuevo en una hora.'
  },
  // Session management (most restrictive)
  SESSION_MANAGEMENT: {
    limit: 10,
    window: 60 * 60 * 1000, // 1 hour
    message: 'Demasiadas operaciones de sesión. Intenta de nuevo en una hora.'
  },
  // Organization operations
  ORGANIZATION_OPS: {
    limit: 30,
    window: 60 * 60 * 1000, // 1 hour
    message: 'Límite de operaciones organizacionales excedido. Intenta de nuevo en una hora.'
  }
};

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
};

// IP whitelist (for development/staging)
const ALLOWED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Add production IPs as needed
]);

// Suspicious patterns to detect potential attacks
const SUSPICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /eval\s*\(/gi,
  /document\.cookie/gi,
  /alert\s*\(/gi,
];

export interface SecurityContext {
  user_id: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  timestamp: number;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  context: SecurityContext;
}

/**
 * Main security middleware for onboarding endpoints
 */
export async function onboardingSecurityMiddleware(
  request: NextRequest,
  endpoint: string,
  rateLimitType: keyof typeof RATE_LIMITS = 'ONBOARDING_STANDARD'
): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get client information
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Create security context
  const context: SecurityContext = {
    user_id: '',
    ip_address: ip,
    user_agent: userAgent,
    endpoint,
    timestamp: Date.now()
  };

  try {
    // 1. Authentication check
    const user = await stackServerApp.getUser();
    if (!user) {
      errors.push('Autenticación requerida');
      return { isValid: false, errors, warnings, context };
    }

    context.user_id = user.id;

    // 2. Rate limiting check
    const rateLimitResult = await checkRateLimit(user.id, endpoint, rateLimitType);
    if (!rateLimitResult.success) {
      errors.push(RATE_LIMITS[rateLimitType].message);
      return { isValid: false, errors, warnings, context };
    }

    // 3. IP validation (for high-security environments)
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_IP_WHITELIST === 'true') {
      if (!isIPAllowed(ip)) {
        errors.push('Acceso no autorizado desde esta dirección IP');
        return { isValid: false, errors, warnings, context };
      }
    }

    // 4. User agent validation
    if (!isUserAgentValid(userAgent)) {
      warnings.push('Navegador o cliente no reconocido');
    }

    // 5. Request size validation
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 1024 * 1024) { // 1MB limit
      errors.push('Tamaño de solicitud demasiado grande');
      return { isValid: false, errors, warnings, context };
    }

    // 6. CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfResult = await validateCSRF(request);
      if (!csrfResult.isValid) {
        warnings.push('Token CSRF no válido o faltante');
      }
    }

    return { isValid: true, errors, warnings, context };

  } catch (error) {
    console.error('Error in security middleware:', error);
    errors.push('Error de validación de seguridad');
    return { isValid: false, errors, warnings, context };
  }
}

/**
 * Validate and sanitize input data
 */
export function sanitizeInput(
  data: any,
  options: {
    allowHTML?: boolean;
    maxLength?: number;
    allowSpecialChars?: boolean;
  } = {}
): {
  sanitized: any;
  warnings: string[];
  suspicious: boolean;
} {
  const warnings: string[] = [];
  let suspicious = false;

  if (typeof data === 'string') {
    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(data)) {
        suspicious = true;
        warnings.push('Contenido potencialmente malicioso detectado');
        break;
      }
    }

    // Sanitize HTML if not allowed
    if (!options.allowHTML) {
      const sanitized = DOMPurify.sanitize(data, { ALLOWED_TAGS: [] });
      if (sanitized !== data) {
        warnings.push('Contenido HTML removido');
      }
      data = sanitized;
    }

    // Check length
    if (options.maxLength && data.length > options.maxLength) {
      data = data.substring(0, options.maxLength);
      warnings.push(`Contenido truncado a ${options.maxLength} caracteres`);
    }

    // Remove special characters if not allowed
    if (!options.allowSpecialChars) {
      const cleaned = data.replace(/[^\w\s\-_.@áéíóúüñÁÉÍÓÚÜÑ]/g, '');
      if (cleaned !== data) {
        warnings.push('Caracteres especiales removidos');
        data = cleaned;
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    const result: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const sanitizedValue = sanitizeInput(value, options);
      result[key] = sanitizedValue.sanitized;
      warnings.push(...sanitizedValue.warnings);
      if (sanitizedValue.suspicious) {
        suspicious = true;
      }
    }

    data = result;
  }

  return { sanitized: data, warnings, suspicious };
}

/**
 * Rate limiting check
 */
async function checkRateLimit(
  userId: string,
  endpoint: string,
  rateLimitType: keyof typeof RATE_LIMITS
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const config = RATE_LIMITS[rateLimitType];
  const key = `rate_limit:${rateLimitType}:${userId}:${endpoint}`;

  try {
    if (ratelimit) {
      const result = await ratelimit.limit(key, config.limit, config.window);
      return {
        success: result.success,
        remaining: result.remaining,
        resetTime: result.reset
      };
    } else {
      // Fallback to memory-based rate limiting
      return memoryRateLimit(key, config.limit, config.window);
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request if rate limiting fails
    return { success: true, remaining: config.limit, resetTime: Date.now() + config.window };
  }
}

/**
 * Memory-based rate limiting fallback
 */
const memoryLimits = new Map<string, { count: number; resetTime: number }>();

function memoryRateLimit(
  key: string,
  limit: number,
  window: number
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = memoryLimits.get(key);

  if (!record || now > record.resetTime) {
    memoryLimits.set(key, { count: 1, resetTime: now + window });
    return { success: true, remaining: limit - 1, resetTime: now + window };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: limit - record.count, resetTime: record.resetTime };
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const connecting = request.headers.get('cf-connecting-ip');

  if (connecting) return connecting;
  if (real) return real;
  if (forwarded) return forwarded.split(',')[0].trim();

  return request.ip || '127.0.0.1';
}

/**
 * Check if IP is allowed
 */
function isIPAllowed(ip: string): boolean {
  return ALLOWED_IPS.has(ip) || process.env.NODE_ENV !== 'production';
}

/**
 * Validate user agent
 */
function isUserAgentValid(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 10) return false;

  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * CSRF validation
 */
async function validateCSRF(request: NextRequest): Promise<{ isValid: boolean; token?: string }> {
  const token = request.headers.get('x-csrf-token') ||
                request.headers.get('csrf-token');

  if (!token) {
    return { isValid: false };
  }

  // In a production environment, you would validate the token against
  // a stored value or use a cryptographic verification
  // For now, we'll just check that it exists and has reasonable length
  if (token.length < 10 || token.length > 100) {
    return { isValid: false, token };
  }

  return { isValid: true, token };
}

/**
 * Generate security headers for response
 */
export function generateSecurityHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    ...additionalHeaders,
    'X-Request-ID': crypto.randomUUID(),
    'X-Timestamp': new Date().toISOString()
  };
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'ACCESS_DENIED' | 'CSRF_FAILURE',
  context: SecurityContext,
  details?: Record<string, any>
): void {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    context,
    details,
    severity: getSeverity(event)
  };

  console.warn('Security Event:', JSON.stringify(logEntry));

  // In production, you would send this to a security monitoring service
  // like Datadog, Sentry, or a custom security dashboard
}

function getSeverity(event: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (event) {
    case 'AUTH_FAILURE':
    case 'ACCESS_DENIED':
      return 'HIGH';
    case 'RATE_LIMIT_EXCEEDED':
      return 'MEDIUM';
    case 'SUSPICIOUS_ACTIVITY':
      return 'HIGH';
    case 'CSRF_FAILURE':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

/**
 * Validate session ownership
 */
export async function validateSessionOwnership(
  sessionId: string,
  userId: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // This would typically query the database to verify ownership
    // For now, we'll use a simple check
    if (!sessionId || !userId) {
      return { isValid: false, error: 'ID de sesión o usuario faltante' };
    }

    if (!sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return { isValid: false, error: 'Formato de ID de sesión inválido' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Session ownership validation error:', error);
    return { isValid: false, error: 'Error validando propiedad de sesión' };
  }
}

/**
 * Validate organization membership
 */
export async function validateOrganizationAccess(
  organizationId: string,
  userId: string,
  requiredRole?: string[]
): Promise<{ isValid: boolean; userRole?: string; error?: string }> {
  try {
    // This would typically query the database to verify membership
    // For now, we'll use a simple check
    if (!organizationId || !userId) {
      return { isValid: false, error: 'ID de organización o usuario faltante' };
    }

    if (!organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return { isValid: false, error: 'Formato de ID de organización inválido' };
    }

    // Placeholder role check
    const userRole = 'member'; // This would come from database

    if (requiredRole && !requiredRole.includes(userRole)) {
      return { isValid: false, userRole, error: 'Permisos insuficientes' };
    }

    return { isValid: true, userRole };
  } catch (error) {
    console.error('Organization access validation error:', error);
    return { isValid: false, error: 'Error validando acceso a organización' };
  }
}