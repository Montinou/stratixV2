"use client"

import type React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createClient } from "@/lib/supabase/client-stub" // TEMPORARY: using stub during migration
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { profileFormSchema, type ProfileFormValues } from "@/lib/validations/profile"

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      department: "",
    },
  })

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || "",
        department: profile.department || "",
      })
    }
  }, [profile, form])

  const handleSubmit = async (data: ProfileFormValues) => {
    if (!profile) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          department: data.department,
        })
        .eq("userId", profile.userId)

      if (error) throw error

      await refreshProfile()
      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profile?.email || ""} 
                      disabled 
                      className="bg-muted"
                    />
                    <FormDescription>
                      El email no se puede modificar desde este formulario
                    </FormDescription>
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ingresa tu nombre completo"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Tu nombre completo como aparecerá en la aplicación
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Input 
                      id="role" 
                      value={getRoleLabel(profile?.roleType || "")} 
                      disabled 
                      className="bg-muted"
                    />
                    <FormDescription>
                      Tu rol es asignado por el administrador
                    </FormDescription>
                  </div>

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ingresa tu departamento"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          El departamento donde trabajas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={isLoading || !form.formState.isDirty}
                    className="w-full"
                  >
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </form>
              </Form>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
