"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown, Search, Sparkles, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Industry } from "@/lib/types/smart-forms"
import { mockIndustries } from "@/lib/forms/form-utils"

interface IndustrySelectorProps {
  value?: string
  onValueChange: (value: string) => void
  aiSuggestions?: boolean
  className?: string
  placeholder?: string
}

export function IndustrySelector({
  value,
  onValueChange,
  aiSuggestions = true,
  className,
  placeholder = "Selecciona tu industria",
}: IndustrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [aiSuggestedIndustries, setAiSuggestedIndustries] = useState<Industry[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Filter industries based on search term
  const filteredIndustries = mockIndustries.filter(industry =>
    industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.subcategories?.some(sub =>
      sub.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Get AI suggestions based on search
  useEffect(() => {
    if (!aiSuggestions || searchTerm.length < 3) {
      setAiSuggestedIndustries([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingAI(true)
      try {
        const response = await fetch("/api/ai/industry-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchTerm,
            currentIndustries: mockIndustries.map(i => i.name),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setAiSuggestedIndustries(data.suggestions || [])
        }
      } catch (error) {
        console.error("Error getting AI industry suggestions:", error)
      } finally {
        setIsLoadingAI(false)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, aiSuggestions])

  // Find selected industry
  useEffect(() => {
    if (value) {
      const industry = mockIndustries.find(i => i.id === value)
      setSelectedIndustry(industry || null)
    }
  }, [value])

  const handleIndustrySelect = (industry: Industry) => {
    setSelectedIndustry(industry)
    setSelectedSubcategory("")
    onValueChange(industry.id)
    setOpen(false)
  }

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory)
    if (selectedIndustry) {
      onValueChange(`${selectedIndustry.id}:${subcategory}`)
    }
  }

  const IndustryCard = ({ industry, isSelected }: { industry: Industry; isSelected: boolean }) => (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50"
      )}
      onClick={() => handleIndustrySelect(industry)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{industry.name}</CardTitle>
          </div>
          {isSelected && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </div>
        {industry.description && (
          <CardDescription className="text-sm">
            {industry.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {industry.subcategories && industry.subcategories.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Subcategorías:
            </Label>
            <div className="flex flex-wrap gap-1">
              {industry.subcategories.slice(0, 4).map((sub, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs"
                >
                  {sub}
                </Badge>
              ))}
              {industry.subcategories.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{industry.subcategories.length - 4} más
                </Badge>
              )}
            </div>
          </div>
        )}
        {industry.suggestedOKRs && industry.suggestedOKRs.length > 0 && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              OKRs Sugeridos:
            </Label>
            <div className="text-xs text-muted-foreground">
              • {industry.suggestedOKRs[0]}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Industria</Label>
        {aiSuggestions && (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            IA Habilitada
          </Badge>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] px-3 py-2"
          >
            <div className="flex items-center gap-2 flex-1 text-left">
              {selectedIndustry ? (
                <>
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">{selectedIndustry.name}</div>
                    {selectedSubcategory && (
                      <div className="text-xs text-muted-foreground">
                        {selectedSubcategory}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar industria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px] p-3">
            <div className="space-y-3">
              {/* AI Suggestions */}
              {aiSuggestions && isLoadingAI && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Buscando sugerencias IA...
                  </div>
                </div>
              )}

              {aiSuggestedIndustries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    Sugerencias IA
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {aiSuggestedIndustries.map((industry) => (
                      <IndustryCard
                        key={`ai-${industry.id}`}
                        industry={industry}
                        isSelected={selectedIndustry?.id === industry.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Industries */}
              {filteredIndustries.length > 0 && (
                <div className="space-y-2">
                  {aiSuggestedIndustries.length > 0 && (
                    <div className="text-sm font-medium text-muted-foreground">
                      Todas las industrias
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {filteredIndustries.map((industry) => (
                      <IndustryCard
                        key={industry.id}
                        industry={industry}
                        isSelected={selectedIndustry?.id === industry.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredIndustries.length === 0 && !isLoadingAI && (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron industrias</p>
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Subcategory Selection */}
      {selectedIndustry && selectedIndustry.subcategories && selectedIndustry.subcategories.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Subcategoría en {selectedIndustry.name}
          </Label>
          <Select value={selectedSubcategory} onValueChange={handleSubcategorySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una subcategoría (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {selectedIndustry.subcategories.map((subcategory) => (
                <SelectItem key={subcategory} value={subcategory}>
                  {subcategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Suggested OKRs */}
      {selectedIndustry && selectedIndustry.suggestedOKRs && selectedIndustry.suggestedOKRs.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">OKRs Sugeridos para {selectedIndustry.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {selectedIndustry.suggestedOKRs.map((okr, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {okr}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}