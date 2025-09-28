import { get } from '@vercel/edge-config';
import { ONBOARDING_STEPS, type OnboardingStepInfo } from '@/lib/config/onboarding-config';

/**
 * Vercel Edge Config for static data distribution
 * Used for distributing onboarding configuration across edge locations
 * with automatic cache invalidation and fallback mechanisms
 */

export interface EdgeConfigData {
  onboarding_steps: Record<number, OnboardingStepInfo>;
  feature_flags: Record<string, boolean>;
  system_messages: Record<string, string>;
  rate_limits: Record<string, number>;
  ai_prompts: Record<string, string>;
}

export interface CacheMetrics {
  hit: number;
  miss: number;
  error: number;
  lastUpdate: number;
}

// In-memory cache for fallback and metrics
const localCache = new Map<string, any>();
const cacheMetrics: CacheMetrics = {
  hit: 0,
  miss: 0,
  error: 0,
  lastUpdate: Date.now()
};

/**
 * Get onboarding steps from Edge Config with fallback
 */
export async function getOnboardingStepsFromEdge(): Promise<Record<number, OnboardingStepInfo>> {
  try {
    const steps = await get<Record<number, OnboardingStepInfo>>('onboarding_steps');

    if (steps) {
      cacheMetrics.hit++;
      localCache.set('onboarding_steps', steps);
      return steps;
    } else {
      cacheMetrics.miss++;
      // Fallback to local configuration
      console.warn('Edge Config: onboarding_steps not found, using local fallback');
      return ONBOARDING_STEPS;
    }
  } catch (error) {
    cacheMetrics.error++;
    console.error('Edge Config error for onboarding_steps:', error);

    // Try local cache first
    const cached = localCache.get('onboarding_steps');
    if (cached) {
      console.info('Using cached onboarding_steps from local cache');
      return cached;
    }

    // Final fallback to static configuration
    console.warn('Using static fallback for onboarding_steps');
    return ONBOARDING_STEPS;
  }
}

/**
 * Get feature flags from Edge Config
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const flags = await get<Record<string, boolean>>('feature_flags');

    if (flags) {
      cacheMetrics.hit++;
      localCache.set('feature_flags', flags);
      return flags;
    } else {
      cacheMetrics.miss++;
      // Default feature flags
      const defaultFlags = {
        ai_assistance: true,
        analytics_tracking: true,
        redis_caching: true,
        session_persistence: true,
        advanced_metrics: false,
        beta_features: false
      };
      return defaultFlags;
    }
  } catch (error) {
    cacheMetrics.error++;
    console.error('Edge Config error for feature_flags:', error);

    const cached = localCache.get('feature_flags');
    if (cached) return cached;

    // Return safe defaults
    return {
      ai_assistance: true,
      analytics_tracking: true,
      redis_caching: true,
      session_persistence: true,
      advanced_metrics: false,
      beta_features: false
    };
  }
}

/**
 * Get system messages from Edge Config
 */
export async function getSystemMessages(): Promise<Record<string, string>> {
  try {
    const messages = await get<Record<string, string>>('system_messages');

    if (messages) {
      cacheMetrics.hit++;
      localCache.set('system_messages', messages);
      return messages;
    } else {
      cacheMetrics.miss++;
      // Default system messages
      const defaultMessages = {
        welcome: 'Bienvenido a StratixV2. Vamos a configurar tu perfil paso a paso.',
        error_generic: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
        success_step_complete: 'Paso completado exitosamente.',
        onboarding_complete: '¡Felicitaciones! Has completado la configuración inicial.',
        session_expired: 'Tu sesión ha expirado. Por favor, inicia el proceso nuevamente.'
      };
      return defaultMessages;
    }
  } catch (error) {
    cacheMetrics.error++;
    console.error('Edge Config error for system_messages:', error);

    const cached = localCache.get('system_messages');
    if (cached) return cached;

    return {
      welcome: 'Bienvenido a StratixV2. Vamos a configurar tu perfil paso a paso.',
      error_generic: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
      success_step_complete: 'Paso completado exitosamente.',
      onboarding_complete: '¡Felicitaciones! Has completado la configuración inicial.',
      session_expired: 'Tu sesión ha expirado. Por favor, inicia el proceso nuevamente.'
    };
  }
}

/**
 * Get rate limits from Edge Config
 */
export async function getRateLimits(): Promise<Record<string, number>> {
  try {
    const limits = await get<Record<string, number>>('rate_limits');

    if (limits) {
      cacheMetrics.hit++;
      localCache.set('rate_limits', limits);
      return limits;
    } else {
      cacheMetrics.miss++;
      // Default rate limits
      const defaultLimits = {
        onboarding_requests_per_minute: 10,
        ai_requests_per_minute: 5,
        session_creates_per_hour: 20,
        api_requests_per_minute: 100
      };
      return defaultLimits;
    }
  } catch (error) {
    cacheMetrics.error++;
    console.error('Edge Config error for rate_limits:', error);

    const cached = localCache.get('rate_limits');
    if (cached) return cached;

    return {
      onboarding_requests_per_minute: 10,
      ai_requests_per_minute: 5,
      session_creates_per_hour: 20,
      api_requests_per_minute: 100
    };
  }
}

/**
 * Get AI prompts from Edge Config
 */
export async function getAIPrompts(): Promise<Record<string, string>> {
  try {
    const prompts = await get<Record<string, string>>('ai_prompts');

    if (prompts) {
      cacheMetrics.hit++;
      localCache.set('ai_prompts', prompts);
      return prompts;
    } else {
      cacheMetrics.miss++;
      // Default AI prompts
      const defaultPrompts = {
        personalize_step: 'Basándote en la información del usuario: {userData}, personaliza las siguientes sugerencias para el paso {stepNumber}',
        validate_input: 'Valida si la siguiente información es coherente y completa: {userInput}',
        generate_suggestions: 'Genera 3 sugerencias específicas para mejorar los OKRs basándote en: {context}',
        onboarding_summary: 'Crea un resumen personalizado del onboarding completado por el usuario: {allSteps}'
      };
      return defaultPrompts;
    }
  } catch (error) {
    cacheMetrics.error++;
    console.error('Edge Config error for ai_prompts:', error);

    const cached = localCache.get('ai_prompts');
    if (cached) return cached;

    return {
      personalize_step: 'Basándote en la información del usuario: {userData}, personaliza las siguientes sugerencias para el paso {stepNumber}',
      validate_input: 'Valida si la siguiente información es coherente y completa: {userInput}',
      generate_suggestions: 'Genera 3 sugerencias específicas para mejorar los OKRs basándote en: {context}',
      onboarding_summary: 'Crea un resumen personalizado del onboarding completado por el usuario: {allSteps}'
    };
  }
}

/**
 * Get complete Edge Config data
 */
export async function getCompleteEdgeConfig(): Promise<EdgeConfigData> {
  const [onboardingSteps, featureFlags, systemMessages, rateLimits, aiPrompts] = await Promise.all([
    getOnboardingStepsFromEdge(),
    getFeatureFlags(),
    getSystemMessages(),
    getRateLimits(),
    getAIPrompts()
  ]);

  return {
    onboarding_steps: onboardingSteps,
    feature_flags: featureFlags,
    system_messages: systemMessages,
    rate_limits: rateLimits,
    ai_prompts: aiPrompts
  };
}

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  try {
    const flags = await getFeatureFlags();
    return flags[flagName] ?? false;
  } catch (error) {
    console.error(`Error checking feature flag ${flagName}:`, error);
    return false;
  }
}

/**
 * Get rate limit for specific action
 */
export async function getRateLimit(action: string): Promise<number> {
  try {
    const limits = await getRateLimits();
    return limits[action] ?? 100; // Default fallback
  } catch (error) {
    console.error(`Error getting rate limit for ${action}:`, error);
    return 100;
  }
}

/**
 * Get AI prompt with template replacement
 */
export async function getAIPrompt(promptName: string, replacements: Record<string, string> = {}): Promise<string> {
  try {
    const prompts = await getAIPrompts();
    let prompt = prompts[promptName] ?? '';

    // Replace template variables
    Object.entries(replacements).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return prompt;
  } catch (error) {
    console.error(`Error getting AI prompt ${promptName}:`, error);
    return '';
  }
}

/**
 * Get cache metrics for monitoring
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

/**
 * Reset cache metrics
 */
export function resetCacheMetrics(): void {
  cacheMetrics.hit = 0;
  cacheMetrics.miss = 0;
  cacheMetrics.error = 0;
  cacheMetrics.lastUpdate = Date.now();
}

/**
 * Warm up the cache by pre-loading critical data
 */
export async function warmUpCache(): Promise<void> {
  try {
    console.log('Warming up Edge Config cache...');
    await Promise.all([
      getOnboardingStepsFromEdge(),
      getFeatureFlags(),
      getSystemMessages(),
      getRateLimits(),
      getAIPrompts()
    ]);
    console.log('Edge Config cache warmed up successfully');
  } catch (error) {
    console.error('Error warming up Edge Config cache:', error);
  }
}

/**
 * Health check for Edge Config connection
 */
export async function healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
  try {
    const startTime = Date.now();

    // Test basic connectivity
    const testValue = await get('health_check');
    const responseTime = Date.now() - startTime;

    const metrics = getCacheMetrics();
    const errorRate = metrics.error / (metrics.hit + metrics.miss + metrics.error || 1);

    if (responseTime > 1000 || errorRate > 0.1) {
      return {
        status: 'degraded',
        details: {
          responseTime,
          errorRate,
          metrics,
          message: 'High latency or error rate detected'
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        responseTime,
        errorRate,
        metrics,
        message: 'Edge Config operating normally'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: getCacheMetrics(),
        message: 'Edge Config connection failed'
      }
    };
  }
}