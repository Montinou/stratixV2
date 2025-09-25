"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { profile, company, loading, refreshProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || "",
    department: profile?.department || "",
  })

  // Sync form data with profile changes from auth system
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        department: profile.department || "",
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: formData.full_name,
          department: formData.department,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 401) {
          throw new Error('No autorizado. Por favor, inicia sesión de nuevo.')
        } else if (response.status === 400) {
          // Handle validation errors
          if (result.details && Array.isArray(result.details)) {
            const validationMessages = result.details.map((detail: any) => detail.message).join(', ')
            throw new Error(`Datos inválidos: ${validationMessages}`)
          }
          throw new Error(result.error || 'Datos inválidos')
        } else if (response.status === 404) {
          throw new Error('Perfil no encontrado')
        } else if (response.status === 500) {
          throw new Error('Error del servidor. Por favor, inténtalo más tarde.')
        } else {
          throw new Error(result.error || `Error ${response.status}: No se pudo actualizar el perfil`)
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al actualizar el perfil')
      }

      await refreshProfile()
      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada correctamente.",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      
      let errorMessage = "No se pudo actualizar el perfil. Inténtalo de nuevo."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (!navigator.onLine) {
        errorMessage = "Sin conexión a internet. Verifica tu conexión y vuelve a intentarlo."
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "corporativo":
        return "Corporativo"
      case "gerente":
        return "Gerente"
      case "empleado":
        return "Empleado"
      default:
        return role
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal y configuración</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tu información básica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile?.email || ""} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Input id="role" value={getRoleLabel(profile?.role || "")} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de la Cuenta</CardTitle>
              <CardDescription>Detalles de tu cuenta y permisos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Fecha de Registro</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("es-ES") : "N/A"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Última Actualización</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString("es-ES") : "N/A"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Permisos del Rol</Label>
                <div className="mt-2 space-y-1">
                  {profile?.role === "corporativo" && (
                    <>
                      <p className="text-sm text-muted-foreground">• Acceso total a todos los datos</p>
                      <p className="text-sm text-muted-foreground">• Gestión de usuarios y equipos</p>
                      <p className="text-sm text-muted-foreground">• Análisis corporativo completo</p>
                    </>
                  )}
                  {profile?.role === "gerente" && (
                    <>
                      <p className="text-sm text-muted-foreground">• Gestión de su equipo</p>
                      <p className="text-sm text-muted-foreground">• Análisis de departamento</p>
                      <p className="text-sm text-muted-foreground">• Supervisión de objetivos del equipo</p>
                    </>
                  )}
                  {profile?.role === "empleado" && (
                    <>
                      <p className="text-sm text-muted-foreground">• Gestión de objetivos personales</p>
                      <p className="text-sm text-muted-foreground">• Seguimiento de progreso individual</p>
                      <p className="text-sm text-muted-foreground">• Acceso a insights personalizados</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Información de la Empresa</Label>
                <div className="mt-2 space-y-1">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando información de la empresa...</p>
                  ) : company ? (
                    <>
                      <div className="flex items-center gap-2">
                        {company.logo_url && (
                          <img 
                            src={company.logo_url} 
                            alt={`Logo de ${company.name}`}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <p className="text-sm font-medium">{company.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">ID: {company.slug || company.id}</p>
                      {company.created_at && (
                        <p className="text-sm text-muted-foreground">
                          Empresa registrada: {new Date(company.created_at).toLocaleDateString("es-ES")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay información de empresa disponible</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
