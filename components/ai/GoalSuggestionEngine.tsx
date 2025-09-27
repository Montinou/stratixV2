"use client"

import { useState, useEffect } from "react"
import {
  Target,
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Star,
  Award,
  Lightbulb,
  ChevronRight,
  Filter,
  Shuffle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface GoalSuggestion {
  id: string
  title: string
  description: string
  category: "growth" | "efficiency" | "quality" | "innovation" | "customer" | "team"
  priority: "high" | "medium" | "low"
  timeframe: "quarter" | "semester" | "year"
  difficulty: "easy" | "medium" | "hard"
  industry: string[]
  department: string[]
  companySize: string[]
  keyResults: Array<{
    title: string
    metric: string
    targetValue: number
    unit: string
  }>
  benefits: string[]
  risks: string[]
  aiScore: number
}

interface GoalSuggestionEngineProps {
  industry?: string
  department?: string
  companySize?: string
  currentGoals?: any[]
  onSuggestionSelect: (suggestion: GoalSuggestion) => void
  className?: string
}

const categoryIcons = {
  growth: TrendingUp,
  efficiency: Clock,
  quality: Award,
  innovation: Lightbulb,
  customer: Users,
  team: Users,
}

const categoryColors = {
  growth: "text-green-500",
  efficiency: "text-blue-500",
  quality: "text-purple-500",
  innovation: "text-orange-500",
  customer: "text-pink-500",
  team: "text-cyan-500",
}

const priorityColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
}

export function GoalSuggestionEngine({
  industry = "",
  department = "",
  companySize = "",
  currentGoals = [],
  onSuggestionSelect,
  className,
}: GoalSuggestionEngineProps) {
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<GoalSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: "",
    priority: "",
    timeframe: "",
    difficulty: "",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("recommended")

  // Generate suggestions on mount and when context changes
  useEffect(() => {
    generateSuggestions()
  }, [industry, department, companySize])

  // Apply filters
  useEffect(() => {
    let filtered = suggestions

    if (filters.category) {
      filtered = filtered.filter(s => s.category === filters.category)
    }
    if (filters.priority) {
      filtered = filtered.filter(s => s.priority === filters.priority)
    }
    if (filters.timeframe) {
      filtered = filtered.filter(s => s.timeframe === filters.timeframe)
    }
    if (filters.difficulty) {
      filtered = filtered.filter(s => s.difficulty === filters.difficulty)
    }
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredSuggestions(filtered)
  }, [suggestions, filters, searchTerm])

  const generateSuggestions = async () => {
    setIsLoading(true)
    try {
      // Simulate AI suggestion generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockSuggestions: GoalSuggestion[] = [
        {
          id: "1",
          title: "Aumentar la retención de clientes en 25%",
          description: "Implementar estrategias para reducir el churn y aumentar la satisfacción",
          category: "customer",
          priority: "high",
          timeframe: "quarter",
          difficulty: "medium",
          industry: ["technology", "saas", "finance"],
          department: ["marketing", "customer-success", "sales"],
          companySize: ["startup", "small", "medium"],
          keyResults: [
            { title: "Reducir churn rate", metric: "Churn Rate", targetValue: 5, unit: "%" },
            { title: "Aumentar NPS", metric: "Net Promoter Score", targetValue: 50, unit: "puntos" },
            { title: "Mejorar tiempo de respuesta", metric: "Response Time", targetValue: 2, unit: "horas" }
          ],
          benefits: [
            "Mayor lifetime value de clientes",
            "Reducción en costos de adquisición",
            "Mejora en la reputación de marca"
          ],
          risks: [
            "Requiere inversión en customer success",
            "Cambios en procesos pueden ser disruptivos"
          ],
          aiScore: 92
        },
        {
          id: "2",
          title: "Mejorar la eficiencia operativa en 30%",
          description: "Optimizar procesos y eliminar desperdicios para aumentar productividad",
          category: "efficiency",
          priority: "high",
          timeframe: "semester",
          difficulty: "medium",
          industry: ["manufacturing", "retail", "services"],
          department: ["operations", "production", "logistics"],
          companySize: ["medium", "large", "enterprise"],
          keyResults: [
            { title: "Reducir tiempo de procesos", metric: "Process Time", targetValue: 30, unit: "% reducción" },
            { title: "Aumentar throughput", metric: "Output per Hour", targetValue: 25, unit: "% aumento" },
            { title: "Reducir errores", metric: "Error Rate", targetValue: 2, unit: "%" }
          ],
          benefits: [
            "Reducción significativa de costos",
            "Mayor capacidad de producción",
            "Mejor calidad del producto/servicio"
          ],
          risks: [
            "Resistencia al cambio del equipo",
            "Inversión inicial en tecnología/capacitación"
          ],
          aiScore: 88
        },
        {
          id: "3",
          title: "Lanzar 3 nuevas funcionalidades innovadoras",
          description: "Desarrollar features diferenciadores que aporten valor único al cliente",
          category: "innovation",
          priority: "medium",
          timeframe: "quarter",
          difficulty: "hard",
          industry: ["technology", "software"],
          department: ["product", "development", "design"],
          companySize: ["startup", "small", "medium"],
          keyResults: [
            { title: "Completar desarrollo", metric: "Features Released", targetValue: 3, unit: "features" },
            { title: "Adopción de usuarios", metric: "Feature Adoption", targetValue: 40, unit: "%" },
            { title: "Feedback positivo", metric: "User Rating", targetValue: 4.5, unit: "estrellas" }
          ],
          benefits: [
            "Diferenciación competitiva",
            "Aumento en engagement de usuarios",
            "Nuevas oportunidades de monetización"
          ],
          risks: [
            "Riesgo de retrasos en desarrollo",
            "Posible complejidad excesiva del producto"
          ],
          aiScore: 85
        },
        {
          id: "4",
          title: "Aumentar ingresos recurrentes en 40%",
          description: "Crecer el MRR a través de upselling, cross-selling y nuevos clientes",
          category: "growth",
          priority: "high",
          timeframe: "semester",
          difficulty: "medium",
          industry: ["saas", "technology", "services"],
          department: ["sales", "marketing", "business-development"],
          companySize: ["startup", "small", "medium"],
          keyResults: [
            { title: "Aumentar MRR", metric: "Monthly Recurring Revenue", targetValue: 40, unit: "% crecimiento" },
            { title: "Mejorar LTV:CAC ratio", metric: "LTV to CAC Ratio", targetValue: 3, unit: "ratio" },
            { title: "Incrementar ARPU", metric: "Average Revenue Per User", targetValue: 25, unit: "% aumento" }
          ],
          benefits: [
            "Mayor predictibilidad de ingresos",
            "Mejor valoración de la empresa",
            "Capacidad de inversión en crecimiento"
          ],
          risks: [
            "Presión en el equipo de ventas",
            "Posible disminución temporal en adquisición"
          ],
          aiScore: 90
        },
        {
          id: "5",
          title: "Mejorar engagement del equipo a 85%",
          description: "Implementar iniciativas para aumentar la satisfacción y compromiso del personal",
          category: "team",
          priority: "medium",
          timeframe: "year",
          difficulty: "easy",
          industry: ["all"],
          department: ["hr", "management", "leadership"],
          companySize: ["small", "medium", "large"],
          keyResults: [
            { title: "Aumentar engagement score", metric: "Employee Engagement", targetValue: 85, unit: "%" },
            { title: "Reducir turnover", metric: "Employee Turnover", targetValue: 10, unit: "%" },
            { title: "Mejorar eNPS", metric: "Employee Net Promoter Score", targetValue: 40, unit: "puntos" }
          ],
          benefits: [
            "Mayor productividad del equipo",
            "Reducción en costos de contratación",
            "Mejor ambiente laboral"
          ],
          risks: [
            "Resultados a largo plazo",
            "Requiere cambios culturales profundos"
          ],
          aiScore: 78
        }
      ]

      // Filter by context
      let contextFilteredSuggestions = mockSuggestions

      if (industry) {
        contextFilteredSuggestions = contextFilteredSuggestions.filter(s =>
          s.industry.includes(industry) || s.industry.includes("all")
        )
      }

      if (department) {
        contextFilteredSuggestions = contextFilteredSuggestions.filter(s =>
          s.department.includes(department)
        )
      }

      if (companySize) {
        contextFilteredSuggestions = contextFilteredSuggestions.filter(s =>
          s.companySize.includes(companySize)
        )
      }

      // Sort by AI score
      contextFilteredSuggestions.sort((a, b) => b.aiScore - a.aiScore)

      setSuggestions(contextFilteredSuggestions)
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({ category: "", priority: "", timeframe: "", difficulty: "" })
    setSearchTerm("")
  }

  const shuffleSuggestions = () => {
    const shuffled = [...filteredSuggestions].sort(() => Math.random() - 0.5)
    setFilteredSuggestions(shuffled)
  }

  const SuggestionCard = ({ suggestion }: { suggestion: GoalSuggestion }) => {
    const CategoryIcon = categoryIcons[suggestion.category]
    const categoryColor = categoryColors[suggestion.category]

    return (
      <Card
        className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 relative"
        onClick={() => onSuggestionSelect(suggestion)}
      >
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary text-primary-foreground text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {suggestion.aiScore}%
          </Badge>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-md bg-background border", categoryColor)}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight pr-12">
                {suggestion.title}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {suggestion.description}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            <Badge
              variant="outline"
              className={cn("text-xs capitalize", priorityColors[suggestion.priority])}
            >
              {suggestion.priority === "high" && "Alta"}
              {suggestion.priority === "medium" && "Media"}
              {suggestion.priority === "low" && "Baja"}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs capitalize", difficultyColors[suggestion.difficulty])}
            >
              {suggestion.difficulty === "easy" && "Fácil"}
              {suggestion.difficulty === "medium" && "Medio"}
              {suggestion.difficulty === "hard" && "Difícil"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {suggestion.timeframe === "quarter" && "3 meses"}
              {suggestion.timeframe === "semester" && "6 meses"}
              {suggestion.timeframe === "year" && "1 año"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Key Results Preview */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Resultados Clave ({suggestion.keyResults.length})
            </Label>
            <div className="mt-1 space-y-1">
              {suggestion.keyResults.slice(0, 2).map((kr, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <Target className="h-3 w-3 text-primary" />
                  <span>{kr.title}: {kr.targetValue} {kr.unit}</span>
                </div>
              ))}
              {suggestion.keyResults.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{suggestion.keyResults.length - 2} más...
                </div>
              )}
            </div>
          </div>

          {/* Benefits Preview */}
          {suggestion.benefits.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-green-600">
                Beneficios principales:
              </Label>
              <div className="text-xs text-muted-foreground mt-1">
                • {suggestion.benefits[0]}
                {suggestion.benefits.length > 1 && (
                  <span className="text-muted-foreground">
                    {" "}y {suggestion.benefits.length - 1} más
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span>Match: {suggestion.aiScore}%</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Motor de Sugerencias de Objetivos</Label>
          <p className="text-xs text-muted-foreground">
            Objetivos personalizados basados en IA para tu contexto
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shuffleSuggestions}
            disabled={filteredSuggestions.length === 0}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Explorar
          </Button>
          <Button
            size="sm"
            onClick={generateSuggestions}
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isLoading ? "Generando..." : "Regenerar"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Filtros</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar objetivos..."
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="growth">Crecimiento</SelectItem>
                  <SelectItem value="efficiency">Eficiencia</SelectItem>
                  <SelectItem value="quality">Calidad</SelectItem>
                  <SelectItem value="innovation">Innovación</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="team">Equipo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Prioridad</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Plazo</Label>
              <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="quarter">3 meses</SelectItem>
                  <SelectItem value="semester">6 meses</SelectItem>
                  <SelectItem value="year">1 año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Dificultad</Label>
              <Select value={filters.difficulty} onValueChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommended">Recomendados</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="custom">Personalizados</TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-48">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-primary/10 rounded animate-pulse" />
                      <div className="h-3 bg-primary/10 rounded animate-pulse w-3/4" />
                      <div className="space-y-2">
                        <div className="h-2 bg-primary/10 rounded animate-pulse" />
                        <div className="h-2 bg-primary/10 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay sugerencias</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No encontramos objetivos que coincidan con tus filtros actuales
                </p>
                <Button onClick={clearFilters} size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredSuggestions.length} objetivos encontrados
                  {searchTerm && ` para "${searchTerm}"`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="mt-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Próximamente</h3>
              <p className="text-muted-foreground text-center">
                Objetivos trending basados en datos de la industria
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Próximamente</h3>
              <p className="text-muted-foreground text-center">
                Crea objetivos completamente personalizados con IA
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}