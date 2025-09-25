"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
// Removed Supabase client stub - now using API endpoints
import { useAuth } from "@/lib/hooks/use-auth"
import type { Initiative, Objective, OKRStatus } from "@/lib/types/okr"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

interface InitiativeFormProps {
  initiative?: Initiative
  onSuccess: () => void
  onCancel: () => void
}

export function InitiativeForm({ initiative, onSuccess, onCancel }: InitiativeFormProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [formData, setFormData] = useState({
    title: initiative?.title || "",
    description: initiative?.description || "",
    objective_id: initiative?.objective_id || "",
    status: initiative?.status || ("no_iniciado" as OKRStatus),
    progress: initiative?.progress || 0,
    start_date: initiative?.start_date || new Date().toISOString().split("T")[0],
    end_date: initiative?.end_date || "",
  })

  useEffect(() => {
    const fetchObjectives = async () => {
      if (!profile) return

      try {
        // Use API endpoint with role-based filtering
        const params = new URLSearchParams({
          userId: profile.user_id,
          userRole: profile.role,
          userDepartment: profile.department || ''
        })

        const response = await fetch(`/api/objectives?${params}`)
        if (!response.ok) throw new Error('Failed to fetch objectives')
        
        const result = await response.json()
        if (result.success && result.data) {
          setObjectives(result.data)
        }
      } catch (error) {
        console.error('Error fetching objectives:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los objetivos.",
          variant: "destructive",
        })
      }
    }

    fetchObjectives()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)

    try {
      const initiativeData = {
        title: formData.title,
        description: formData.description || null,
        objective_id: formData.objective_id,
        owner_id: profile.user_id,
        status: formData.status,
        progress: formData.progress,
        start_date: formData.start_date,
        end_date: formData.end_date,
        priority: 'medium' // Default priority as required by API
      }

      if (initiative) {
        // Update existing initiative
        const response = await fetch(`/api/initiatives/${initiative.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(initiativeData),
        })

        if (!response.ok) throw new Error('Failed to update initiative')
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to update initiative')
        
        toast({ title: "Iniciativa actualizada", description: "La iniciativa ha sido actualizada correctamente." })
      } else {
        // Create new initiative
        const response = await fetch('/api/initiatives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(initiativeData),
        })

        if (!response.ok) throw new Error('Failed to create initiative')
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to create initiative')
        
        toast({ title: "Iniciativa creada", description: "La iniciativa ha sido creada correctamente." })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving initiative:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la iniciativa. Inténtalo de nuevo.",
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
          placeholder="Ej: Campaña de marketing digital"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe la iniciativa en detalle..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective_id">Objetivo *</Label>
        <Select
          value={formData.objective_id}
          onValueChange={(value) => setFormData({ ...formData, objective_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un objetivo" />
          </SelectTrigger>
          <SelectContent>
            {objectives.map((objective) => (
              <SelectItem key={objective.id} value={objective.id}>
                {objective.title}
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
          {loading ? "Guardando..." : initiative ? "Actualizar" : "Crear"} Iniciativa
        </Button>
      </div>
    </form>
  )
}
