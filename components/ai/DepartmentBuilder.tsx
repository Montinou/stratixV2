"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus,
  GripVertical,
  Users,
  Edit,
  Trash2,
  Sparkles,
  Building2,
  MoreVertical,
  Copy,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { DepartmentStructure } from "@/lib/types/smart-forms"

interface DepartmentBuilderProps {
  value: DepartmentStructure[]
  onChange: (departments: DepartmentStructure[]) => void
  aiSuggestions?: boolean
  className?: string
}

interface DepartmentFormData {
  name: string
  description: string
  roles: string[]
  parentId?: string
}

export function DepartmentBuilder({
  value,
  onChange,
  aiSuggestions = true,
  className,
}: DepartmentBuilderProps) {
  const [departments, setDepartments] = useState<DepartmentStructure[]>(value)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentStructure | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiSuggestedStructure, setAiSuggestedStructure] = useState<DepartmentStructure[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update parent when departments change
  useEffect(() => {
    onChange(departments)
  }, [departments, onChange])

  // Generate AI structure suggestions
  const generateAISuggestions = useCallback(async () => {
    if (!aiSuggestions) return

    setIsLoadingAI(true)
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const suggestions: DepartmentStructure[] = [
        {
          id: "leadership",
          name: "Liderazgo",
          description: "Dirección estratégica y toma de decisiones",
          level: 0,
          roles: ["CEO", "COO", "Director General"],
          suggestedMetrics: ["ROI", "Crecimiento de ingresos", "Satisfacción del equipo"]
        },
        {
          id: "sales",
          name: "Ventas",
          description: "Generación de ingresos y relaciones con clientes",
          level: 1,
          roles: ["Director de Ventas", "Account Manager", "Sales Representative"],
          suggestedMetrics: ["Ingresos", "Conversión", "Retención de clientes"]
        },
        {
          id: "marketing",
          name: "Marketing",
          description: "Promoción de marca y generación de leads",
          level: 1,
          roles: ["Director de Marketing", "Marketing Manager", "Especialista en Digital"],
          suggestedMetrics: ["Leads generados", "CAC", "Brand awareness"]
        },
        {
          id: "product",
          name: "Producto",
          description: "Desarrollo y mejora del producto",
          level: 1,
          roles: ["Product Manager", "UX Designer", "Desarrollador"],
          suggestedMetrics: ["Time to market", "User satisfaction", "Feature adoption"]
        }
      ]

      setAiSuggestedStructure(suggestions)
    } catch (error) {
      console.error("Error generating AI suggestions:", error)
      toast({
        title: "Error",
        description: "No se pudieron generar sugerencias IA",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAI(false)
    }
  }, [aiSuggestions])

  // Apply AI suggestions
  const applyAISuggestions = () => {
    setDepartments(aiSuggestedStructure)
    setAiSuggestedStructure([])
    toast({
      title: "Estructura aplicada",
      description: "Se ha aplicado la estructura sugerida por IA",
    })
  }

  // Add new department
  const addDepartment = (formData: DepartmentFormData) => {
    const newDepartment: DepartmentStructure = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      parentId: formData.parentId,
      roles: formData.roles,
      level: formData.parentId ? getParentLevel(formData.parentId) + 1 : 0,
      suggestedMetrics: []
    }

    setDepartments(prev => [...prev, newDepartment])
    setIsDialogOpen(false)
    toast({
      title: "Departamento agregado",
      description: `${formData.name} ha sido agregado exitosamente`,
    })
  }

  // Edit department
  const updateDepartment = (formData: DepartmentFormData) => {
    if (!editingDepartment) return

    setDepartments(prev => prev.map(dept =>
      dept.id === editingDepartment.id
        ? {
            ...dept,
            name: formData.name,
            description: formData.description,
            roles: formData.roles,
            parentId: formData.parentId,
            level: formData.parentId ? getParentLevel(formData.parentId) + 1 : 0,
          }
        : dept
    ))

    setEditingDepartment(null)
    setIsDialogOpen(false)
    toast({
      title: "Departamento actualizado",
      description: `${formData.name} ha sido actualizado exitosamente`,
    })
  }

  // Delete department
  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(dept => dept.id !== id))
    toast({
      title: "Departamento eliminado",
      description: "El departamento ha sido eliminado exitosamente",
    })
  }

  // Duplicate department
  const duplicateDepartment = (dept: DepartmentStructure) => {
    const duplicated: DepartmentStructure = {
      ...dept,
      id: Date.now().toString(),
      name: `${dept.name} (Copia)`,
    }
    setDepartments(prev => [...prev, duplicated])
    toast({
      title: "Departamento duplicado",
      description: `${dept.name} ha sido duplicado exitosamente`,
    })
  }

  // Get parent level
  const getParentLevel = (parentId: string): number => {
    const parent = departments.find(dept => dept.id === parentId)
    return parent ? parent.level : 0
  }

  // Get children departments
  const getChildren = (parentId: string): DepartmentStructure[] => {
    return departments.filter(dept => dept.parentId === parentId)
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setDepartments((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Estructura Organizacional</Label>
          {aiSuggestions && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA Habilitada
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {aiSuggestions && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateAISuggestions}
              disabled={isLoadingAI}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isLoadingAI ? "Generando..." : "Sugerir Estructura"}
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => setEditingDepartment(null)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Departamento
              </Button>
            </DialogTrigger>
            <DepartmentDialog
              department={editingDepartment}
              departments={departments}
              onSave={editingDepartment ? updateDepartment : addDepartment}
              onCancel={() => {
                setIsDialogOpen(false)
                setEditingDepartment(null)
              }}
            />
          </Dialog>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestedStructure.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Estructura Sugerida por IA</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiSuggestedStructure([])}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  onClick={applyAISuggestions}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {aiSuggestedStructure.map((dept, index) => (
                <div key={dept.id} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{dept.name}</span>
                  <span className="text-muted-foreground">({dept.roles.length} roles)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department List */}
      {departments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay departamentos</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza agregando tu primer departamento o usa nuestras sugerencias IA
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Departamento
              </Button>
              {aiSuggestions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAISuggestions}
                  disabled={isLoadingAI}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sugerir con IA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={departments.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {departments.map((department) => (
                <SortableDepartmentCard
                  key={department.id}
                  department={department}
                  onEdit={(dept) => {
                    setEditingDepartment(dept)
                    setIsDialogOpen(true)
                  }}
                  onDelete={deleteDepartment}
                  onDuplicate={duplicateDepartment}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <DepartmentCard
                department={departments.find(d => d.id === activeId)!}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

// Sortable Department Card Component
function SortableDepartmentCard({
  department,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  department: DepartmentStructure
  onEdit: (dept: DepartmentStructure) => void
  onDelete: (id: string) => void
  onDuplicate: (dept: DepartmentStructure) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: department.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <DepartmentCard
        department={department}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEdit={() => onEdit(department)}
        onDelete={() => onDelete(department.id)}
        onDuplicate={() => onDuplicate(department)}
      />
    </div>
  )
}

// Department Card Component
function DepartmentCard({
  department,
  isDragging = false,
  dragHandleProps,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  department: DepartmentStructure
  isDragging?: boolean
  dragHandleProps?: any
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
}) {
  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-50 shadow-lg scale-105",
        `ml-${department.level * 4}`
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">{department.name}</CardTitle>
                {department.level > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Nivel {department.level}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(onEdit || onDelete || onDuplicate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                {(onEdit || onDuplicate) && onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {department.description && (
          <CardDescription className="text-sm">
            {department.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Roles */}
        {department.roles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">
                Roles ({department.roles.length})
              </Label>
            </div>
            <div className="flex flex-wrap gap-1">
              {department.roles.map((role, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Metrics */}
        {department.suggestedMetrics && department.suggestedMetrics.length > 0 && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Métricas Sugeridas:
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {department.suggestedMetrics.map((metric, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {metric}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Department Dialog Component
function DepartmentDialog({
  department,
  departments,
  onSave,
  onCancel,
}: {
  department: DepartmentStructure | null
  departments: DepartmentStructure[]
  onSave: (formData: DepartmentFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: department?.name || "",
    description: department?.description || "",
    roles: department?.roles || [],
    parentId: department?.parentId,
  })
  const [roleInput, setRoleInput] = useState("")

  const handleAddRole = () => {
    if (roleInput.trim() && !formData.roles.includes(roleInput.trim())) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, roleInput.trim()]
      }))
      setRoleInput("")
    }
  }

  const handleRemoveRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== role)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    onSave(formData)
  }

  return (
    <DialogContent className="sm:max-w-[525px]">
      <DialogHeader>
        <DialogTitle>
          {department ? "Editar Departamento" : "Agregar Departamento"}
        </DialogTitle>
        <DialogDescription>
          Configura la información del departamento y sus roles.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Departamento *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Ventas, Marketing, Tecnología"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe las responsabilidades del departamento"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="flex gap-2">
            <Input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="Agregar rol..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRole())}
            />
            <Button type="button" onClick={handleAddRole} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.roles.map((role, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {role}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formData.name.trim()}>
            {department ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}