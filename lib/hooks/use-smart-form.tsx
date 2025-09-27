"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm, UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { debounce } from "lodash"
import {
  AISuggestion,
  SmartFormMethods,
  UseSmartFormOptions,
  FormContext,
  SmartFieldState
} from "@/lib/types/smart-forms"
import { useAuth } from "@/lib/hooks/use-auth"

interface UseSmartFormReturn<T extends Record<string, any>> extends UseFormReturn<T> {
  fieldStates: Record<string, SmartFieldState>
  methods: SmartFormMethods
  isAIEnabled: boolean
  context: FormContext
}

export function useSmartForm<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  options: UseSmartFormOptions = {}
): UseSmartFormReturn<T> {
  const { profile } = useAuth()
  const {
    aiEnabled = true,
    autoSave = true,
    validationMode = "onChange",
    context = {}
  } = options

  // Initialize react-hook-form
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: validationMode,
  })

  // Track field states for AI features
  const [fieldStates, setFieldStates] = useState<Record<string, SmartFieldState>>({})
  const [isAIEnabled, setIsAIEnabled] = useState(aiEnabled && profile?.role === "corporativo")

  // Initialize field state
  const initializeFieldState = useCallback((fieldName: string) => {
    if (!fieldStates[fieldName]) {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          value: "",
          suggestions: [],
          isLoading: false,
          showSuggestions: false,
          hasError: false,
        }
      }))
    }
  }, [fieldStates])

  // Get AI suggestions for a field
  const getAISuggestions = useCallback(async (
    fieldName: string,
    value: string
  ): Promise<AISuggestion[]> => {
    if (!isAIEnabled || value.length < 5) {
      return []
    }

    try {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isLoading: true,
        }
      }))

      const response = await fetch("/api/ai/form-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldName,
          value,
          context: {
            ...context,
            userRole: profile?.role,
            department: profile?.department,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI suggestions")
      }

      const data = await response.json()
      const suggestions: AISuggestion[] = data.suggestions || []

      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          suggestions,
          isLoading: false,
          showSuggestions: suggestions.length > 0,
        }
      }))

      return suggestions
    } catch (error) {
      console.error("Error getting AI suggestions:", error)
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isLoading: false,
          showSuggestions: false,
          hasError: true,
          errorMessage: "Error obteniendo sugerencias",
        }
      }))
      return []
    }
  }, [isAIEnabled, context, profile])

  // Debounced version of getAISuggestions
  const debouncedGetSuggestions = useCallback(
    debounce(getAISuggestions, 1000),
    [getAISuggestions]
  )

  // Enhance field value with AI
  const enhanceField = useCallback(async (
    fieldName: string,
    value: string
  ): Promise<string> => {
    if (!isAIEnabled || value.length < 10) {
      return value
    }

    try {
      const response = await fetch("/api/ai/enhance-field", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldName,
          value,
          context: {
            ...context,
            userRole: profile?.role,
            department: profile?.department,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to enhance field")
      }

      const data = await response.json()
      return data.enhancedValue || value
    } catch (error) {
      console.error("Error enhancing field:", error)
      return value
    }
  }, [isAIEnabled, context, profile])

  // Validate field with AI assistance
  const validateField = useCallback(async (
    fieldName: string,
    value: string
  ): Promise<boolean> => {
    try {
      // First, use Zod validation
      const fieldSchema = schema.shape?.[fieldName as keyof typeof schema.shape]
      if (fieldSchema) {
        fieldSchema.parse(value)
      }

      // Then, use AI validation if enabled
      if (isAIEnabled && value.length > 5) {
        const response = await fetch("/api/ai/validate-field", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fieldName,
            value,
            context: {
              ...context,
              userRole: profile?.role,
              department: profile?.department,
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return data.isValid !== false
        }
      }

      return true
    } catch (error) {
      console.error("Field validation error:", error)
      return false
    }
  }, [schema, isAIEnabled, context, profile])

  // Save form progress
  const saveProgress = useCallback(async () => {
    if (!autoSave) return

    try {
      const values = form.getValues()
      localStorage.setItem(
        `smart-form-progress-${context.companyId || 'default'}`,
        JSON.stringify({
          values,
          timestamp: Date.now(),
          context,
        })
      )
    } catch (error) {
      console.error("Error saving form progress:", error)
    }
  }, [form, autoSave, context])

  // Load form progress
  const loadProgress = useCallback(async () => {
    if (!autoSave) return

    try {
      const saved = localStorage.getItem(
        `smart-form-progress-${context.companyId || 'default'}`
      )

      if (saved) {
        const { values, timestamp } = JSON.parse(saved)

        // Only load if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          Object.keys(values).forEach(key => {
            form.setValue(key as any, values[key])
          })
        }
      }
    } catch (error) {
      console.error("Error loading form progress:", error)
    }
  }, [form, autoSave, context])

  // Watch form values and trigger AI suggestions
  const watchedValues = form.watch()

  useEffect(() => {
    if (isAIEnabled) {
      Object.keys(watchedValues).forEach(fieldName => {
        const value = watchedValues[fieldName]
        if (typeof value === "string" && value.length > 5) {
          initializeFieldState(fieldName)
          debouncedGetSuggestions(fieldName, value)
        }
      })
    }
  }, [watchedValues, isAIEnabled, initializeFieldState, debouncedGetSuggestions])

  // Auto-save on form changes
  useEffect(() => {
    if (autoSave) {
      const subscription = form.watch(() => {
        saveProgress()
      })
      return () => subscription.unsubscribe()
    }
  }, [form, autoSave, saveProgress])

  // Load progress on mount
  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const methods: SmartFormMethods = {
    getAISuggestions,
    enhanceField,
    validateField,
    saveProgress,
    loadProgress,
  }

  return {
    ...form,
    fieldStates,
    methods,
    isAIEnabled,
    context: {
      ...context,
      userRole: profile?.role,
    },
  }
}