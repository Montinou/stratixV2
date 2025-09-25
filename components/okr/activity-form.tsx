"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
// Removed Supabase client dependency - now using API endpoints (still needed for handleSubmit)
import { useAuth } from "@/lib/hooks/use-auth"
import type { Activity, Initiative, OKRStatus } from "@/lib/types/okr"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

interface ActivityFormProps {
  activity?: Activity
  onSuccess: () => void
  onCancel: () => void
}

export function ActivityForm({ activity, onSuccess, onCancel }: ActivityFormProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [formData, setFormData] = useState({
    title: activity?.title || "",
    description: activity?.description || "",
    initiative_id: activity?.initiative_id || "",
    status: activity?.status || ("no_iniciado" as OKRStatus),
    progress: activity?.progress || 0,
    start_date: activity?.start_date || new Date().toISOString().split("T")[0],
    end_date: activity?.end_date || "",
  })

  useEffect(() => {
    const fetchInitiatives = async () => {
      if (!profile) return

      try {
        const params = new URLSearchParams({
          userId: profile.id,
          userRole: profile.role,
          userDepartment: profile.department || 'general'
        })

        const response = await fetch(`/api/initiatives?${params}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch initiatives: ${response.statusText}`)
        }

        const result = await response.json()
        if (result.data) {
          setInitiatives(result.data)
        }
      } catch (error) {
        console.error('Error fetching initiatives:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las iniciativas. Inténtalo de nuevo.",
          variant: "destructive",
        })
      }
    }

    fetchInitiatives()
  }, [profile])

  const mapOKRStatusToAPIStatus = (status: OKRStatus): string => {
    switch (status) {
      case "no_iniciado": return "todo"
      case "en_progreso": return "in_progress"
      case "completado": return "completed"
      case "pausado": return "cancelled"
      default: return "todo"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    // Validate required fields
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido.",
        variant: "destructive",
      })
      return
    }

    if (!formData.initiative_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar una iniciativa.",
        variant: "destructive",
      })
      return
    }

    if (!formData.end_date) {
      toast({
        title: "Error",
        description: "La fecha de fin es requerida.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const apiData = {
        initiative_id: formData.initiative_id,
        title: formData.title,
        description: formData.description || null,
        status: mapOKRStatusToAPIStatus(formData.status),
        priority: "medium" as const, // Default priority - can be enhanced later
        due_date: formData.end_date,
        assigned_to: profile.id,
      }

      let response: Response

      if (activity) {
        // Update existing activity
        response = await fetch(`/api/activities/${activity.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        })
      } else {
        // Create new activity
        response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Request failed')
      }

      const result = await response.json()
      
      if (activity) {
        toast({ title: "Actividad actualizada", description: "La actividad ha sido actualizada correctamente." })
      } else {
        toast({ title: "Actividad creada", description: "La actividad ha sido creada correctamente." })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving activity:", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudo guardar la actividad. Inténtalo de nuevo."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ej: Crear contenido para redes sociales"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe la actividad en detalle..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initiative_id">Iniciativa *</Label>
        <Select
          value={formData.initiative_id}
          onValueChange={(value) => setFormData({ ...formData, initiative_id: value })}
          disabled={initiatives.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              initiatives.length === 0 
                ? "Cargando iniciativas..." 
                : "Selecciona una iniciativa"
            } />
          </SelectTrigger>
          <SelectContent>
            {initiatives.length === 0 ? (
              <SelectItem value="" disabled>
                {!profile ? "Usuario no autenticado" : "No hay iniciativas disponibles"}
              </SelectItem>
            ) : (
              initiatives.map((initiative) => (
                <SelectItem key={initiative.id} value={initiative.id}>
                  {initiative.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <Select
          value={formData.status}
          onValueChange={(value: OKRStatus) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no_iniciado">No Iniciado</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Progreso: {formData.progress}%</Label>
        <Slider
          value={[formData.progress]}
          onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de Inicio *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de Fin *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : activity ? "Actualizar" : "Crear"} Actividad
        </Button>
      </div>
    </form>
  )
}
