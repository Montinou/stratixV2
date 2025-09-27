"use client"

import { useState, useEffect } from "react"
import {
  User,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Target,
  Users,
  Shield,
  CheckCircle,
  AlertCircle,
  Lightbulb,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

interface Role {
  id: string
  name: string
  description: string
  departmentId: string
  level: "junior" | "mid" | "senior" | "lead" | "director"
  responsibilities: string[]
  skills: string[]
  permissions: string[]
  salary?: {
    min: number
    max: number
    currency: string
  }
  aiSuggestions?: {
    responsibilities: string[]
    skills: string[]
    similarRoles: string[]
  }
}

interface RoleDefinitionToolProps {
  departmentId: string
  departmentName: string
  existingRoles: string[]
  onRolesUpdate: (roles: Role[]) => void
  aiSuggestions?: boolean
  className?: string
}

interface RoleFormData {
  name: string
  description: string
  level: Role["level"]
  responsibilities: string[]
  skills: string[]
  permissions: string[]
}

const roleLevels = {
  junior: { label: "Junior", color: "bg-green-100 text-green-800" },
  mid: { label: "Mid-level", color: "bg-blue-100 text-blue-800" },
  senior: { label: "Senior", color: "bg-purple-100 text-purple-800" },
  lead: { label: "Lead/Manager", color: "bg-orange-100 text-orange-800" },
  director: { label: "Director", color: "bg-red-100 text-red-800" },
}

export function RoleDefinitionTool({
  departmentId,
  departmentName,
  existingRoles,
  onRolesUpdate,
  aiSuggestions = true,
  className,
}: RoleDefinitionToolProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Initialize roles from existing role names
  useEffect(() => {
    const initialRoles: Role[] = existingRoles.map((roleName, index) => ({
      id: `${departmentId}-role-${index}`,
      name: roleName,
      description: "",
      departmentId,
      level: "mid",
      responsibilities: [],
      skills: [],
      permissions: [],
    }))
    setRoles(initialRoles)
  }, [existingRoles, departmentId])

  // Update parent when roles change
  useEffect(() => {
    onRolesUpdate(roles)
  }, [roles, onRolesUpdate])

  // Generate AI suggestions for a role
  const generateRoleSuggestions = async (roleName: string, level: Role["level"]) => {
    if (!aiSuggestions) return null

    setIsLoadingAI(true)
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const suggestions = {
        responsibilities: generateResponsibilities(roleName, level),
        skills: generateSkills(roleName, level),
        similarRoles: generateSimilarRoles(roleName),
      }

      return suggestions
    } catch (error) {
      console.error("Error generating AI suggestions:", error)
      return null
    } finally {
      setIsLoadingAI(false)
    }
  }

  // Mock AI suggestion generation
  const generateResponsibilities = (roleName: string, level: Role["level"]): string[] => {
    const baseResponsibilities: Record<string, string[]> = {
      "Product Manager": [
        "Definir la estrategia y roadmap del producto",
        "Coordinar con equipos de desarrollo y diseño",
        "Analizar métricas y feedback de usuarios",
        "Priorizar features y backlog",
        "Comunicar avances a stakeholders",
      ],
      "Desarrollador": [
        "Desarrollar y mantener aplicaciones",
        "Escribir código limpio y documentado",
        "Realizar code reviews",
        "Implementar tests automatizados",
        "Colaborar en el diseño de arquitectura",
      ],
      "Designer": [
        "Crear wireframes y prototipos",
        "Diseñar interfaces de usuario",
        "Realizar investigación de usuarios",
        "Mantener sistema de design",
        "Colaborar con desarrollo en implementación",
      ],
    }

    return baseResponsibilities[roleName] || [
      "Ejecutar tareas relacionadas con el rol",
      "Colaborar con el equipo",
      "Reportar progreso regularmente",
      "Mantener actualizado el conocimiento del área",
    ]
  }

  const generateSkills = (roleName: string, level: Role["level"]): string[] => {
    const baseSkills: Record<string, string[]> = {
      "Product Manager": ["Product Management", "Data Analysis", "User Research", "Agile/Scrum", "Communication"],
      "Desarrollador": ["JavaScript", "React", "Node.js", "SQL", "Git", "Testing"],
      "Designer": ["Figma", "Design Systems", "User Research", "Prototyping", "Visual Design"],
    }

    const levelSkills: Record<Role["level"], string[]> = {
      junior: ["Willingness to learn", "Basic technical skills"],
      mid: ["Problem solving", "Independent work"],
      senior: ["Mentoring", "Technical leadership"],
      lead: ["Team management", "Strategic thinking"],
      director: ["Vision setting", "Cross-functional leadership"],
    }

    return [...(baseSkills[roleName] || []), ...levelSkills[level]]
  }

  const generateSimilarRoles = (roleName: string): string[] => {
    const similarRoles: Record<string, string[]> = {
      "Product Manager": ["Product Owner", "Project Manager", "Business Analyst"],
      "Desarrollador": ["Software Engineer", "Full-stack Developer", "Frontend Developer"],
      "Designer": ["UX Designer", "UI Designer", "Visual Designer"],
    }

    return similarRoles[roleName] || []
  }

  // Add new role
  const addRole = async (formData: RoleFormData) => {
    const aiSuggestionData = await generateRoleSuggestions(formData.name, formData.level)

    const newRole: Role = {
      id: Date.now().toString(),
      departmentId,
      ...formData,
      aiSuggestions: aiSuggestionData,
    }

    setRoles(prev => [...prev, newRole])
    setIsDialogOpen(false)
    toast({
      title: "Rol agregado",
      description: `${formData.name} ha sido agregado exitosamente`,
    })
  }

  // Update role
  const updateRole = async (formData: RoleFormData) => {
    if (!editingRole) return

    const aiSuggestionData = await generateRoleSuggestions(formData.name, formData.level)

    setRoles(prev => prev.map(role =>
      role.id === editingRole.id
        ? { ...role, ...formData, aiSuggestions: aiSuggestionData }
        : role
    ))

    setEditingRole(null)
    setIsDialogOpen(false)
    toast({
      title: "Rol actualizado",
      description: `${formData.name} ha sido actualizado exitosamente`,
    })
  }

  // Delete role
  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(role => role.id !== id))
    toast({
      title: "Rol eliminado",
      description: "El rol ha sido eliminado exitosamente",
    })
  }

  // Apply AI suggestion
  const applySuggestion = (roleId: string, type: "responsibilities" | "skills", suggestion: string) => {
    setRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        const updated = { ...role }
        if (!updated[type].includes(suggestion)) {
          updated[type] = [...updated[type], suggestion]
        }
        return updated
      }
      return role
    }))
  }

  const RoleCard = ({ role }: { role: Role }) => {
    const levelInfo = roleLevels[role.level]

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 border">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{role.name}</CardTitle>
                <Badge className={cn("text-xs mt-1", levelInfo.color)}>
                  {levelInfo.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingRole(role)
                  setIsDialogOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteRole(role.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {role.description && (
            <CardDescription className="text-sm">
              {role.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Responsibilities */}
          {role.responsibilities.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Responsabilidades ({role.responsibilities.length})
              </Label>
              <div className="mt-1 space-y-1">
                {role.responsibilities.slice(0, 3).map((resp, index) => (
                  <div key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Target className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    {resp}
                  </div>
                ))}
                {role.responsibilities.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{role.responsibilities.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {role.skills.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Habilidades Requeridas
              </Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {role.skills.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {role.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.skills.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {role.aiSuggestions && aiSuggestions && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Sugerencias IA</span>
              </div>
              <div className="space-y-2">
                {role.aiSuggestions.responsibilities.slice(0, 2).map((resp, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs shrink-0"
                      onClick={() => applySuggestion(role.id, "responsibilities", resp)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            Definición de Roles - {departmentName}
          </Label>
          <p className="text-xs text-muted-foreground">
            Define roles específicos, responsabilidades y habilidades requeridas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => setEditingRole(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Rol
            </Button>
          </DialogTrigger>
          <RoleDialog
            role={editingRole}
            onSave={editingRole ? updateRole : addRole}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingRole(null)
            }}
            isLoadingAI={isLoadingAI}
          />
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="detailed">Vista Detallada</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {roles.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay roles definidos</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comienza definiendo los roles específicos para {departmentName}
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Definir Primer Rol
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="detailed" className="mt-4">
          <div className="space-y-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        <Badge className={cn("text-xs mt-1", roleLevels[role.level].color)}>
                          {roleLevels[role.level].label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRole(role)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {role.description && (
                    <div>
                      <Label className="text-sm font-medium">Descripción</Label>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Responsabilidades</Label>
                      <div className="mt-2 space-y-1">
                        {role.responsibilities.map((resp, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {resp}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Habilidades Requeridas</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {role.permissions.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Permisos y Accesos</Label>
                      <div className="mt-2 space-y-1">
                        {role.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-blue-500" />
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Role Dialog Component
function RoleDialog({
  role,
  onSave,
  onCancel,
  isLoadingAI,
}: {
  role: Role | null
  onSave: (formData: RoleFormData) => void
  onCancel: () => void
  isLoadingAI: boolean
}) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || "",
    description: role?.description || "",
    level: role?.level || "mid",
    responsibilities: role?.responsibilities || [],
    skills: role?.skills || [],
    permissions: role?.permissions || [],
  })

  const [newResponsibility, setNewResponsibility] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [newPermission, setNewPermission] = useState("")

  const addResponsibility = () => {
    if (newResponsibility.trim() && !formData.responsibilities.includes(newResponsibility.trim())) {
      setFormData(prev => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()]
      }))
      setNewResponsibility("")
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill("")
    }
  }

  const addPermission = () => {
    if (newPermission.trim() && !formData.permissions.includes(newPermission.trim())) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, newPermission.trim()]
      }))
      setNewPermission("")
    }
  }

  const removeItem = (type: keyof Pick<RoleFormData, "responsibilities" | "skills" | "permissions">, item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(i => i !== item)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave(formData)
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {role ? "Editar Rol" : "Agregar Rol"}
        </DialogTitle>
        <DialogDescription>
          Define las características específicas del rol
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Rol *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Product Manager, Developer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Nivel</Label>
            <Select
              value={formData.level}
              onValueChange={(value: Role["level"]) => setFormData(prev => ({ ...prev, level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLevels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe el propósito y alcance del rol"
            rows={2}
          />
        </div>

        {/* Responsibilities */}
        <div className="space-y-2">
          <Label>Responsabilidades</Label>
          <div className="flex gap-2">
            <Input
              value={newResponsibility}
              onChange={(e) => setNewResponsibility(e.target.value)}
              placeholder="Agregar responsabilidad..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addResponsibility())}
            />
            <Button type="button" onClick={addResponsibility} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.responsibilities.length > 0 && (
            <div className="space-y-1 mt-2">
              {formData.responsibilities.map((resp, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="flex-1">{resp}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem("responsibilities", resp)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label>Habilidades Requeridas</Label>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Agregar habilidad..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <Button type="button" onClick={addSkill} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeItem("skills", skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <Label>Permisos y Accesos</Label>
          <div className="flex gap-2">
            <Input
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value)}
              placeholder="Agregar permiso..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPermission())}
            />
            <Button type="button" onClick={addPermission} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.permissions.length > 0 && (
            <div className="space-y-1 mt-2">
              {formData.permissions.map((permission, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <span className="flex-1">{permission}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem("permissions", permission)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoadingAI && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Lightbulb className="h-4 w-4 animate-pulse" />
            Generando sugerencias IA...
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formData.name.trim() || isLoadingAI}>
            {role ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}