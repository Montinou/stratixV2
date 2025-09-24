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
import { createClient } from "@/lib/supabase/client-stub" // TEMPORARY: using stub during migration
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: any
  created_at: string
  updated_at: string
  profiles?: { count: number }[]
}

export default function CompaniesPage() {
  const { profile, company } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({ name: "", slug: "" })
  const supabase = createClient()

  const isCorporativo = profile?.role === "corporativo"

  useEffect(() => {
    if (isCorporativo) {
      fetchCompanies()
    } else {
      setLoading(false)
    }
  }, [isCorporativo])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          profiles!inner(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCompanies(data || [])
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
        const { error } = await supabase
          .from("companies")
          .update({
            name: formData.name,
            slug: formData.slug,
          })
          .eq("id", editingCompany.id)

        if (error) throw error
        toast.success("Empresa actualizada correctamente")
      } else {
        const { error } = await supabase.from("companies").insert({
          name: formData.name,
          slug: formData.slug,
        })

        if (error) throw error
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

  if (!isCorporativo) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
              <p className="text-muted-foreground">Solo usuarios Corporativo pueden gestionar empresas.</p>
              {company && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium">Tu empresa actual:</p>
                  <p className="text-lg font-bold text-primary">{company.name}</p>
                </div>
              )}
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
