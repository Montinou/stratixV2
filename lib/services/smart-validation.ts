import { z } from "zod"
import { FormContext, AISuggestion } from "@/lib/types/smart-forms"

// Validation levels
export type ValidationLevel = "error" | "warning" | "info" | "success"

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  level: ValidationLevel
  message: string
  fieldName?: string
  suggestion?: AISuggestion
  aiConfidence?: number
}

// Smart validation configuration
export interface SmartValidationConfig {
  enableAI: boolean
  enableRealtime: boolean
  enableContextual: boolean
  enableSuggestions: boolean
  debounceMs: number
  minConfidence: number
}

// Default configuration
const defaultConfig: SmartValidationConfig = {
  enableAI: true,
  enableRealtime: true,
  enableContextual: true,
  enableSuggestions: true,
  debounceMs: 1000,
  minConfidence: 0.7,
}

export class SmartValidationService {
  private config: SmartValidationConfig
  private cache: Map<string, ValidationResult[]> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<SmartValidationConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  // Main validation method
  async validateField(
    fieldName: string,
    value: any,
    schema?: z.ZodSchema,
    context?: FormContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    try {
      // 1. Schema validation (Zod)
      if (schema) {
        const schemaResults = await this.validateWithSchema(fieldName, value, schema)
        results.push(...schemaResults)
      }

      // 2. Contextual validation
      if (this.config.enableContextual && context) {
        const contextResults = await this.validateWithContext(fieldName, value, context)
        results.push(...contextResults)
      }

      // 3. AI validation (if enabled and no critical errors)
      if (this.config.enableAI && !results.some(r => r.level === "error")) {
        const aiResults = await this.validateWithAI(fieldName, value, context)
        results.push(...aiResults)
      }

      // Cache results
      this.cache.set(`${fieldName}:${JSON.stringify(value)}`, results)

      return results
    } catch (error) {
      console.error("Validation error:", error)
      return [{
        isValid: false,
        level: "error",
        message: "Error en la validación del campo",
        fieldName
      }]
    }
  }

  // Validate with debouncing for real-time validation
  async validateFieldDebounced(
    fieldName: string,
    value: any,
    schema?: z.ZodSchema,
    context?: FormContext
  ): Promise<Promise<ValidationResult[]>> {
    return new Promise((resolve) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(fieldName)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Set new timer
      const timer = setTimeout(async () => {
        const results = await this.validateField(fieldName, value, schema, context)
        resolve(results)
        this.debounceTimers.delete(fieldName)
      }, this.config.debounceMs)

      this.debounceTimers.set(fieldName, timer)
    })
  }

  // Schema validation using Zod
  private async validateWithSchema(
    fieldName: string,
    value: any,
    schema: z.ZodSchema
  ): Promise<ValidationResult[]> {
    try {
      schema.parse(value)
      return [{
        isValid: true,
        level: "success",
        message: "Campo válido",
        fieldName
      }]
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => ({
          isValid: false,
          level: "error" as ValidationLevel,
          message: err.message,
          fieldName
        }))
      }

      return [{
        isValid: false,
        level: "error",
        message: "Error de validación",
        fieldName
      }]
    }
  }

  // Contextual validation based on form context
  private async validateWithContext(
    fieldName: string,
    value: any,
    context: FormContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Company name validation
    if (fieldName === "companyName" && typeof value === "string") {
      if (value.length > 0 && value.length < 2) {
        results.push({
          isValid: false,
          level: "warning",
          message: "El nombre de la empresa es muy corto",
          fieldName
        })
      }

      // Check for common business suffixes
      const businessSuffixes = ["S.A.", "S.L.", "LLC", "Inc.", "Corp.", "Ltd."]
      const hasBusinessSuffix = businessSuffixes.some(suffix =>
        value.toUpperCase().includes(suffix.toUpperCase())
      )

      if (value.length > 10 && !hasBusinessSuffix) {
        results.push({
          isValid: true,
          level: "info",
          message: "Considera agregar el tipo societario (ej: S.A., S.L.)",
          fieldName,
          suggestion: {
            text: `${value} S.A.`,
            confidence: 0.8,
            type: "improvement",
            explanation: "Agregar tipo societario hace más formal el nombre"
          }
        })
      }
    }

    // Email validation with domain suggestions
    if (fieldName === "email" && typeof value === "string") {
      if (value.includes("@")) {
        const domain = value.split("@")[1]
        const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
        const suggestedDomain = this.findSimilarDomain(domain, commonDomains)

        if (suggestedDomain && suggestedDomain !== domain) {
          results.push({
            isValid: true,
            level: "info",
            message: `¿Quisiste decir ${suggestedDomain}?`,
            fieldName,
            suggestion: {
              text: value.replace(domain, suggestedDomain),
              confidence: 0.9,
              type: "alternative",
              explanation: "Dominio de email más común"
            }
          })
        }
      }
    }

    // Department validation
    if (fieldName === "department" && context.departments) {
      const existingDepartments = context.departments.map(d => d.name.toLowerCase())
      const inputLower = value.toLowerCase()

      if (!existingDepartments.includes(inputLower) && value.length > 0) {
        const similarDept = existingDepartments.find(dept =>
          this.calculateSimilarity(dept, inputLower) > 0.7
        )

        if (similarDept) {
          results.push({
            isValid: true,
            level: "info",
            message: `¿Te refieres a "${similarDept}"?`,
            fieldName,
            suggestion: {
              text: similarDept,
              confidence: 0.85,
              type: "alternative",
              explanation: "Departamento existente similar"
            }
          })
        } else {
          results.push({
            isValid: true,
            level: "info",
            message: "Nuevo departamento - se creará automáticamente",
            fieldName
          })
        }
      }
    }

    // Date validation
    if (fieldName === "endDate" && context && typeof value === "string") {
      const startDate = (context as any).startDate
      if (startDate && value) {
        const start = new Date(startDate)
        const end = new Date(value)

        if (end <= start) {
          results.push({
            isValid: false,
            level: "error",
            message: "La fecha de fin debe ser posterior a la de inicio",
            fieldName
          })
        }

        // Check if timeframe is realistic
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < 7) {
          results.push({
            isValid: true,
            level: "warning",
            message: "El período es muy corto para un objetivo (menos de 1 semana)",
            fieldName
          })
        }

        if (daysDiff > 365) {
          results.push({
            isValid: true,
            level: "warning",
            message: "El período es muy largo para un objetivo (más de 1 año)",
            fieldName
          })
        }
      }
    }

    return results
  }

  // AI-powered validation
  private async validateWithAI(
    fieldName: string,
    value: any,
    context?: FormContext
  ): Promise<ValidationResult[]> {
    if (!this.config.enableAI || typeof value !== "string" || value.length < 5) {
      return []
    }

    try {
      // Simulate AI validation API call
      await new Promise(resolve => setTimeout(resolve, 500))

      const results: ValidationResult[] = []

      // AI content quality analysis
      if (fieldName === "description" || fieldName === "title") {
        const aiAnalysis = this.analyzeContentQuality(value)

        if (aiAnalysis.score < this.config.minConfidence) {
          results.push({
            isValid: true,
            level: "info",
            message: "El contenido podría ser más específico",
            fieldName,
            suggestion: {
              text: aiAnalysis.improvedVersion,
              confidence: aiAnalysis.confidence,
              type: "improvement",
              explanation: aiAnalysis.explanation
            },
            aiConfidence: aiAnalysis.confidence
          })
        }
      }

      // AI objective analysis (SMART criteria)
      if (fieldName === "title" && value.toLowerCase().includes("aumentar")) {
        const smartAnalysis = this.analyzeSMARTCriteria(value)

        if (!smartAnalysis.isSpecific) {
          results.push({
            isValid: true,
            level: "info",
            message: "El objetivo podría ser más específico",
            fieldName,
            suggestion: {
              text: smartAnalysis.specificVersion,
              confidence: 0.8,
              type: "improvement",
              explanation: "Los objetivos específicos son más efectivos"
            },
            aiConfidence: 0.8
          })
        }
      }

      return results
    } catch (error) {
      console.error("AI validation error:", error)
      return []
    }
  }

  // Content quality analysis
  private analyzeContentQuality(content: string): {
    score: number
    confidence: number
    improvedVersion: string
    explanation: string
  } {
    let score = 0.5
    let improvements: string[] = []

    // Check length
    if (content.length < 20) {
      score -= 0.2
      improvements.push("más detallado")
    }

    // Check for specific words
    const specificWords = ["específico", "medible", "alcanzable", "realista", "temporal"]
    const hasSpecificWords = specificWords.some(word =>
      content.toLowerCase().includes(word)
    )

    if (hasSpecificWords) {
      score += 0.2
    }

    // Check for measurable elements
    const hasNumbers = /\d+/.test(content)
    const hasPercentage = /%/.test(content)
    const hasMetrics = /\b(incrementar|aumentar|reducir|mejorar|alcanzar)\b/i.test(content)

    if (hasNumbers || hasPercentage || hasMetrics) {
      score += 0.3
    } else {
      improvements.push("incluir métricas específicas")
    }

    const improvedVersion = improvements.length > 0
      ? `${content} - Considera ${improvements.join(" y ")}`
      : content

    return {
      score,
      confidence: Math.min(score + 0.2, 1.0),
      improvedVersion,
      explanation: improvements.length > 0
        ? `Sugerencia para hacer el contenido ${improvements.join(" y ")}`
        : "El contenido se ve bien"
    }
  }

  // SMART criteria analysis
  private analyzeSMARTCriteria(objective: string): {
    isSpecific: boolean
    isMeasurable: boolean
    specificVersion: string
  } {
    const isSpecific = /\b(específicamente|exactamente|precisamente)\b/i.test(objective) ||
                      objective.split(" ").length > 6

    const isMeasurable = /\d+/.test(objective) || /%/.test(objective) ||
                        /\b(puntos|porcentaje|unidades|clientes|usuarios)\b/i.test(objective)

    let specificVersion = objective

    if (!isSpecific) {
      // Add specificity suggestions
      if (objective.toLowerCase().includes("aumentar")) {
        specificVersion = objective.replace(
          /aumentar/i,
          "aumentar específicamente"
        )
      }
    }

    if (!isMeasurable && !objective.includes("%")) {
      specificVersion += " en un 25%"
    }

    return {
      isSpecific,
      isMeasurable,
      specificVersion
    }
  }

  // Utility methods
  private findSimilarDomain(input: string, domains: string[]): string | null {
    for (const domain of domains) {
      if (this.calculateSimilarity(input, domain) > 0.7) {
        return domain
      }
    }
    return null
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 1.0
    }

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Enhancement methods
  async enhanceField(
    fieldName: string,
    value: string,
    context?: FormContext
  ): Promise<string> {
    if (!this.config.enableAI || value.length < 5) {
      return value
    }

    try {
      // Simulate AI enhancement
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Enhance based on field type
      switch (fieldName) {
        case "title":
        case "objective":
          return this.enhanceObjective(value, context)

        case "description":
          return this.enhanceDescription(value, context)

        case "companyName":
          return this.enhanceCompanyName(value)

        default:
          return this.enhanceGeneral(value)
      }
    } catch (error) {
      console.error("Enhancement error:", error)
      return value
    }
  }

  private enhanceObjective(value: string, context?: FormContext): string {
    let enhanced = value

    // Make more specific
    if (!enhanced.toLowerCase().includes("específicamente")) {
      enhanced = enhanced.replace(
        /\b(aumentar|mejorar|reducir)\b/gi,
        (match) => `${match} específicamente`
      )
    }

    // Add measurability if missing
    if (!/\d+/.test(enhanced) && !/%/.test(enhanced)) {
      if (enhanced.toLowerCase().includes("aumentar")) {
        enhanced += " en un 25%"
      } else if (enhanced.toLowerCase().includes("mejorar")) {
        enhanced += " hasta alcanzar 4.5/5"
      } else if (enhanced.toLowerCase().includes("reducir")) {
        enhanced += " en un 20%"
      }
    }

    // Add timeframe if missing
    if (!enhanced.toLowerCase().includes("durante") &&
        !enhanced.toLowerCase().includes("en") &&
        !enhanced.toLowerCase().includes("para")) {
      enhanced += " durante el próximo trimestre"
    }

    return enhanced
  }

  private enhanceDescription(value: string, context?: FormContext): string {
    let enhanced = value

    // Add context if too short
    if (enhanced.length < 50) {
      enhanced += ". Este objetivo es importante para el crecimiento del departamento y alineación con la estrategia organizacional."
    }

    // Add measurement context
    if (!enhanced.toLowerCase().includes("medir")) {
      enhanced += " Se medirá a través de indicadores clave de rendimiento específicos."
    }

    return enhanced
  }

  private enhanceCompanyName(value: string): string {
    // Add business suffix if missing and appropriate
    const businessSuffixes = ["S.A.", "S.L.", "LLC", "Inc.", "Corp.", "Ltd."]
    const hasBusinessSuffix = businessSuffixes.some(suffix =>
      value.toUpperCase().includes(suffix.toUpperCase())
    )

    if (value.length > 5 && !hasBusinessSuffix) {
      return `${value} S.A.`
    }

    return value
  }

  private enhanceGeneral(value: string): string {
    // General text enhancement
    let enhanced = value

    // Capitalize first letter
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)

    // Remove extra spaces
    enhanced = enhanced.replace(/\s+/g, " ").trim()

    // Add period if missing
    if (!enhanced.endsWith(".") && !enhanced.endsWith("!") && !enhanced.endsWith("?")) {
      enhanced += "."
    }

    return enhanced
  }

  // Get cached results
  getCachedValidation(fieldName: string, value: any): ValidationResult[] | null {
    return this.cache.get(`${fieldName}:${JSON.stringify(value)}`) || null
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Clear debounce timers
  clearTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
}

// Create singleton instance
export const smartValidationService = new SmartValidationService()

// Export types and utilities
export { ValidationLevel, ValidationResult, SmartValidationConfig }