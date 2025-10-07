/**
 * Feature Flags Configuration
 *
 * Control de features de automatización inteligente
 * Cada feature puede ser activada/desactivada via variables de entorno
 */

export const FEATURE_FLAGS = {
  // Automatizaciones de IA
  AI_DAILY_OKR_ANALYSIS: process.env.FEATURE_AI_DAILY_OKR_ANALYSIS === 'true',
  AI_SMART_REMINDERS: process.env.FEATURE_AI_SMART_REMINDERS === 'true',
  AI_WEEKLY_REPORTS: process.env.FEATURE_AI_WEEKLY_REPORTS === 'true',

  // Insights automáticos
  AI_AUTO_INSIGHTS: process.env.FEATURE_AI_AUTO_INSIGHTS === 'true',
  AI_RISK_DETECTION: process.env.FEATURE_AI_RISK_DETECTION === 'true',

  // Features experimentales
  AI_PREDICTIVE_ANALYTICS: process.env.FEATURE_AI_PREDICTIVE_ANALYTICS === 'true',
  AI_AUTO_SUGGESTIONS: process.env.FEATURE_AI_AUTO_SUGGESTIONS === 'true',
} as const;

/**
 * Verifica si una feature está habilitada
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] === true;
}

/**
 * Obtiene todas las features habilitadas
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Logging de features activas (útil para debugging)
 */
export function logEnabledFeatures() {
  const enabled = getEnabledFeatures();

  if (enabled.length === 0) {
    console.log('[Feature Flags] No AI automation features enabled');
    return;
  }

  console.log('[Feature Flags] Enabled AI features:', enabled.join(', '));
}
