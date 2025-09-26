"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Building2, Users, Settings, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Company as DatabaseCompany, Profile } from "@/lib/database/types"

interface CompanyWithStats extends DatabaseCompany {
  profilesCount?: number
}

interface CompaniesContentProps {
  profile: Profile
}

export function CompaniesContent({ profile }: CompaniesContentProps) {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null)
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<{ fetch?: string; save?: string }>({})
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    size: ""
  })

  // Enhanced role validation with error handling
  const [roleValidationError, setRoleValidationError] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  
  const isCorporativo = profile?.role === "corporativo"
  const hasValidProfile = !!profile && !!profile.role

  useEffect(() => {
    // Wait for profile to be loaded before checking role
    if (profile === undefined) {
      setRoleLoading(true)
      return
    }

    setRoleLoading(false)
    
    // Check if profile loaded successfully
    if (!hasValidProfile) {
      setRoleValidationError("No se pudo cargar el perfil de usuario")
      setLoading(false)
      return
    }

    // Clear any previous errors
    setRoleValidationError(null)

    if (isCorporativo) {
      fetchCompanies()
    } else {
      setLoading(false)
    }
  }, [profile, isCorporativo, hasValidProfile])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setErrors(prev => ({ ...prev, fetch: undefined }))
      
      const response = await fetch("/api/companies?withStats=true", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "Error al obtener las empresas")
      }

      setCompanies(result.data || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al cargar las empresas"
      setErrors(prev => ({ ...prev, fetch: errorMessage }))
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name?.trim()) {
      toast.error("El nombre de la empresa es requerido")
      return
    }
    
    // Validate field lengths according to API schema
    if (formData.name.length > 255) {
      toast.error("El nombre de la empresa no puede exceder 255 caracteres")
      return
    }
    
    if (formData.description && formData.description.length > 1000) {
      toast.error("La descripción no puede exceder 1000 caracteres")
      return
    }
    
    if (formData.industry && formData.industry.length > 100) {
      toast.error("La industria no puede exceder 100 caracteres")
      return
    }
    
    if (formData.size && formData.size.length > 50) {
      toast.error("El tamaño no puede exceder 50 caracteres")
      return
    }

    const operationKey = editingCompany ? `update-${editingCompany.id}` : 'create'
    
    try {
      setOperationLoading(prev => ({ ...prev, [operationKey]: true }))
      setErrors(prev => ({ ...prev, save: undefined }))
      
      let response: Response
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined
      }
      
      if (editingCompany) {
        // Update existing company
        response = await fetch(`/api/companies/${editingCompany.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      } else {
        // Create new company  
        response = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || `Error al ${editingCompany ? 'actualizar' : 'crear'} la empresa`)
      }
      
      toast.success(result.message || `Empresa ${editingCompany ? 'actualizada' : 'creada'} correctamente`)
      setEditingCompany(null)
      setFormData({ name: "", description: "", industry: "", size: "" })
      await fetchCompanies()
      
    } catch (error: unknown) {
      console.error('Error saving company:', error)
      const errorMessage = error instanceof Error ? error.message : `Error al ${editingCompany ? 'actualizar' : 'crear'} la empresa`
      setErrors(prev => ({ ...prev, save: errorMessage }))
      toast.error(errorMessage)
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationKey]: false }))
    }
  }

  const openEditDialog = (company?: CompanyWithStats) => {
    setErrors(prev => ({ ...prev, save: undefined }))
    
    if (company) {
      setEditingCompany(company)
      setFormData({
        name: company.name,
        description: company.description || "",
        industry: company.industry || "",
        size: company.size || ""
      })
    } else {
      setEditingCompany(null)
      setFormData({ name: "", description: "", industry: "", size: "" })
    }
  }

  // Show loading state while validating role
  if (roleLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Validando permisos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if role validation failed
  if (roleValidationError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-destructive">Error de Validación</h3>
              <p className="text-muted-foreground mb-4">{roleValidationError}</p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show access denied for non-corporativo users
  if (!isCorporativo) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-amber-800">Acceso Restringido</h3>
              <p className="text-amber-700 mb-4">
                Solo usuarios con rol Corporativo pueden gestionar empresas.
              </p>
              {profile && (
                <div className="mb-4 p-3 bg-white/80 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800">Tu rol actual:</p>
                  <p className="text-lg font-bold text-amber-900 capitalize">{profile.role}</p>
                </div>
              )}
              <p className="text-xs text-amber-600 mt-4">
                Contacta a un administrador si necesitas acceso a esta funcionalidad.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Empresas</h1>
          <p className="text-muted-foreground">Administra las empresas en el sistema multiempresa</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => openEditDialog()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, industry: e.target.value }))
                  }
                  placeholder="Tecnología, Finanzas, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Tamaño</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, size: e.target.value }))
                  }
                  placeholder="Startup, Pequeña, Mediana, Grande"
                />
              </div>
              {errors.save && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {errors.save}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingCompany(null)
                    setErrors(prev => ({ ...prev, save: undefined }))
                  }}
                  disabled={operationLoading[editingCompany ? `update-${editingCompany.id}` : 'create']}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={operationLoading[editingCompany ? `update-${editingCompany.id}` : 'create']}
                >
                  {operationLoading[editingCompany ? `update-${editingCompany.id}` : 'create'] ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      {editingCompany ? "Actualizando..." : "Creando..."}
                    </div>
                  ) : (
                    editingCompany ? "Actualizar" : "Crear"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando empresas...</p>
          </div>
        </div>
      ) : errors.fetch ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-destructive">Error al cargar empresas</h3>
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 max-w-md mx-auto">
                  {errors.fetch}
                </div>
              </div>
              <Button 
                onClick={fetchCompanies} 
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Reintentando...
                  </div>
                ) : (
                  "Reintentar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{company.description || "Sin descripción"}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{company.profilesCount || 0} usuarios</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Empleados activos: {company.profilesCount || 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(company)}
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {companies.length === 0 && !loading && !errors.fetch && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay empresas registradas</h3>
              <p className="text-muted-foreground mb-4">
                Crea la primera empresa para comenzar a usar el sistema multiempresa
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
