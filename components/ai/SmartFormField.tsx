"use client"

import { useState, useEffect } from "react"
import { UseFormReturn, FieldPath, FieldValues } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Sparkles, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SmartFormFieldProps,
  AISuggestion,
  SmartFieldState,
} from "@/lib/types/smart-forms"

interface SmartFormFieldComponentProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends SmartFormFieldProps {
  form: UseFormReturn<TFieldValues>
  name: TName
  type?: "input" | "textarea" | "password" | "email"
  fieldState?: SmartFieldState
  suggestions?: AISuggestion[]
  onSuggestionSelect?: (suggestion: string) => void
  onEnhanceField?: (value: string) => Promise<string>
  className?: string
}

export function SmartFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  name,
  label,
  placeholder,
  description,
  required = false,
  type = "input",
  aiSuggestions = true,
  fieldState,
  suggestions = [],
  onSuggestionSelect,
  onEnhanceField,
  className,
}: SmartFormFieldComponentProps<TFieldValues, TName>) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)

  const currentValue = form.watch(name)
  const hasAISuggestions = aiSuggestions && suggestions.length > 0
  const isLoading = fieldState?.isLoading || false

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    form.setValue(name, suggestion as any)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
  }

  // Handle field enhancement
  const handleEnhanceField = async () => {
    if (!onEnhanceField || !currentValue) return

    setIsEnhancing(true)
    try {
      const enhanced = await onEnhanceField(currentValue)
      form.setValue(name, enhanced as any)
    } catch (error) {
      console.error("Error enhancing field:", error)
    } finally {
      setIsEnhancing(false)
    }
  }

  // Show suggestions when field is focused and has suggestions
  useEffect(() => {
    if (hasAISuggestions && currentValue && currentValue.length > 5) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [hasAISuggestions, currentValue])

  const renderInput = (field: any) => {
    const baseProps = {
      ...field,
      placeholder,
      className: cn(
        "transition-colors duration-200",
        hasAISuggestions && "border-primary/30 focus:border-primary",
        fieldState?.hasError && "border-destructive",
        className
      ),
    }

    switch (type) {
      case "textarea":
        return <Textarea {...baseProps} rows={3} />
      case "password":
        return <Input {...baseProps} type="password" />
      case "email":
        return <Input {...baseProps} type="email" />
      default:
        return <Input {...baseProps} />
    }
  }

  const SuggestionCard = () => {
    if (!showSuggestions || !hasAISuggestions) return null

    return (
      <Card className="mt-2 p-3 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {isLoading ? "Generando sugerencias..." : "Sugerencias IA"}
          </span>
          {onEnhanceField && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs"
              onClick={handleEnhanceField}
              disabled={isEnhancing || !currentValue}
            >
              {isEnhancing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Mejorar"
              )}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 bg-primary/10 rounded animate-pulse" />
            <div className="h-3 bg-primary/10 rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="group cursor-pointer rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors duration-200"
                onClick={() => handleSuggestionSelect(suggestion.text)}
              >
                <div className="p-2">
                  <div className="flex items-start gap-2">
                    <Badge
                      variant={
                        suggestion.type === "completion"
                          ? "default"
                          : suggestion.type === "improvement"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs shrink-0 mt-0.5"
                    >
                      {suggestion.type === "completion" && "Completar"}
                      {suggestion.type === "improvement" && "Mejorar"}
                      {suggestion.type === "alternative" && "Alternativa"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                        {suggestion.text}
                      </p>
                      {suggestion.explanation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.explanation}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="flex items-center gap-2">
            {label}
            {required && <span className="text-destructive">*</span>}
            {hasAISuggestions && (
              <Sparkles className="h-3 w-3 text-primary" />
            )}
          </FormLabel>

          <FormControl>
            <div className="relative">
              {renderInput(field)}
              {fieldState?.hasError && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
              {currentValue && !fieldState?.hasError && !isLoading && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
            </div>
          </FormControl>

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          <FormMessage />

          {fieldState?.hasError && fieldState.errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fieldState.errorMessage}</AlertDescription>
            </Alert>
          )}

          <SuggestionCard />
        </FormItem>
      )}
    />
  )
}