"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Building2, Users, Settings, Plus } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  description?: string | null
  industry?: string | null
  size?: string | null
  createdAt: string
  updatedAt: string
  profilesCount?: number
}

export default function CompaniesPage() {
  const { profile, company } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    size: ""
  })
  const supabase = createClient()

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
      const response = await fetch("/api/companies?withStats=true", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "Error fetching companies")
      }

      setCompanies(result.data || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
      toast.error("Error al cargar las empresas")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Por favor completa todos los campos")
      return
    }

    try {
      if (editingCompany) {
        // Update existing company
        const response = await fetch(`/api/companies/${editingCompany.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.slug, // Using slug as description for now
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || "Error updating company")
        }

        toast.success("Empresa actualizada correctamente")
      } else {
        // Create new company
        const response = await fetch("/api/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.slug, // Using slug as description for now
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || "Error creating company")
        }

        toast.success("Empresa creada correctamente")
      }

      setEditingCompany(null)
      setFormData({ name: "", slug: "" })
      fetchCompanies()
    } catch (error: any) {
      console.error("Error saving company:", error)
      toast.error(error.message || "Error al guardar la empresa")
    }
  }

  const openEditDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setFormData({ name: company.name, slug: company.slug })
    } else {
      setEditingCompany(null)
      setFormData({ name: "", slug: "" })
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
              {company && (
                <div className="mt-4 p-4 bg-white/80 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800">Tu empresa actual:</p>
                  <p className="text-lg font-bold text-amber-900">{company.name}</p>
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
                <Label htmlFor="slug">Slug (identificador único)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))
                  }
                  placeholder="acme-corp"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCompany(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>{editingCompany ? "Actualizar" : "Crear"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
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
                      <CardDescription>@{company.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{company.profiles?.[0]?.count || 0} usuarios</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Empleados activos: {company.profiles?.[0]?.count || 0}</span>
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

      {companies.length === 0 && !loading && (
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
