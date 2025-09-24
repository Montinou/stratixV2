"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Objective } from "@/lib/database/services"
import { createObjective, updateObjective } from "@/lib/actions/objectives"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

type OKRStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

interface ObjectiveFormProps {
  objective?: Objective
  onSuccess: () => void
  onCancel: () => void
}

export function ObjectiveForm({ objective, onSuccess, onCancel }: ObjectiveFormProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: objective?.title || "",
    description: objective?.description || "",
    department: objective?.department || profile?.department || "",
    status: objective?.status || ("draft" as OKRStatus),
    progress: objective?.progress || 0,
    start_date: objective?.start_date || new Date().toISOString().split("T")[0],
    end_date: objective?.end_date || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)

    try {
      const objectiveData = {
        title: formData.title,
        description: formData.description || undefined,
        department: formData.department,
        status: formData.status,
        priority: 'medium' as const, // Default priority
        start_date: formData.start_date,
        end_date: formData.end_date,
        company_id: profile.company_id,
      }

      let result;
      if (objective) {
        // Update existing objective
        result = await updateObjective(objective.id, objectiveData)
        if (result.error) throw new Error(result.error)
        toast({ title: "Objetivo actualizado", description: "El objetivo ha sido actualizado correctamente." })
      } else {
        // Create new objective
        result = await createObjective(objectiveData)
        if (result.error) throw new Error(result.error)
        toast({ title: "Objetivo creado", description: "El objetivo ha sido creado correctamente." })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving objective:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el objetivo. Inténtalo de nuevo.",
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
          placeholder="Ej: Aumentar ventas en 25%"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe el objetivo en detalle..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Ej: Ventas, Marketing, Tecnología"
          />
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
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          {loading ? "Guardando..." : objective ? "Actualizar" : "Crear"} Objetivo
        </Button>
      </div>
    </form>
  )
}
