"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client-stub" // TEMPORARY: using stub during migration (still needed for handleSubmit)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    const supabase = createClient()

    try {
      const activityData = {
        title: formData.title,
        description: formData.description || null,
        initiative_id: formData.initiative_id,
        owner_id: profile.id,
        status: formData.status,
        progress: formData.progress,
        start_date: formData.start_date,
        end_date: formData.end_date,
      }

      if (activity) {
        // Update existing activity
        const { error } = await supabase.from("activities").update(activityData).eq("id", activity.id)
        if (error) throw error
        toast({ title: "Actividad actualizada", description: "La actividad ha sido actualizada correctamente." })
      } else {
        // Create new activity
        const { error } = await supabase.from("activities").insert(activityData)
        if (error) throw error
        toast({ title: "Actividad creada", description: "La actividad ha sido creada correctamente." })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving activity:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la actividad. Inténtalo de nuevo.",
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
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una iniciativa" />
          </SelectTrigger>
          <SelectContent>
            {initiatives.map((initiative) => (
              <SelectItem key={initiative.id} value={initiative.id}>
                {initiative.title}
              </SelectItem>
            ))}
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
