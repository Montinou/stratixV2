"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import type { UserRole } from "@/lib/types/okr"
import { debounce } from "lodash"

interface SmartInputProps {
  value: string
  department: string
  userRole: UserRole
  onSuggestionSelect: (suggestion: string) => void
  placeholder?: string
}

export function SmartInput({
  value,
  department,
  userRole,
  onSuggestionSelect,
  placeholder = "Escribe para obtener sugerencias...",
}: SmartInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const debouncedGenerateSuggestions = useCallback(
    debounce(async (input: string) => {
      if (input.length < 10) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/ai/smart-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input,
            department,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate suggestions")
        }

        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions?.length > 0)
      } catch (error) {
        console.error("Error generating smart suggestions:", error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoading(false)
      }
    }, 1000),
    [department, userRole],
  )

  useEffect(() => {
    debouncedGenerateSuggestions(value)
    return () => {
      debouncedGenerateSuggestions.cancel()
    }
  }, [value, debouncedGenerateSuggestions])

  if (userRole !== "corporativo") {
    return null
  }

  if (!showSuggestions && !loading) {
    return null
  }

  return (
    <Card className="mt-2 p-3 border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          {loading ? "Generando sugerencias..." : "Sugerencias IA"}
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-auto p-2 text-wrap"
              onClick={() => {
                onSuggestionSelect(suggestion)
                setShowSuggestions(false)
              }}
            >
              <span className="text-sm">{suggestion}</span>
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
