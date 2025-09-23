"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Objective, OKRStatus } from "@/lib/types/okr"
import { toast } from "@/hooks/use-toast"
import { SuggestionPanel } from "@/components/ai/suggestion-panel"
import { SmartInput } from "@/components/ai/smart-input"

interface EnhancedObjectiveFormProps {
  objective?: Objective
  onSuccess: () => void
  onCancel: () => void
}

export function EnhancedObjectiveForm({ objective, onSuccess, onCancel }: EnhancedObjectiveFormProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: objective?.title || "",
    description: objective?.description || "",
    department: objective?.department || profile?.department || "",
    status: objective?.status || ("no_iniciado" as OKRStatus),
    progress: objective?.progress || 0,
    start_date: objective?.start_date || new Date().toISOString().split("T")[0],
    end_date: objective?.end_date || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    const supabase = createClient()

    try {
      const objectiveData = {
        title: formData.title,
        description: formData.description || null,
        owner_id: profile.id,
        department: formData.department,
        status: formData.status,
        progress: formData.progress,
        start_date: formData.start_date,
        end_date: formData.end_date,
      }

      if (objective) {
        // Update existing objective
        const { error } = await supabase.from("objectives").update(objectiveData).eq("id", objective.id)
        if (error) throw error
        toast({ title: "Objetivo actualizado", description: "El objetivo ha sido actualizado correctamente." })
      } else {
        // Create new objective
        const { error } = await supabase.from("objectives").insert(objectiveData)
        if (error) throw error
        toast({ title: "Objetivo creado", description: "El objetivo ha sido creado correctamente." })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving objective:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el objetivo. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTitleSuggestion = (suggestion: string) => {
    setFormData({ ...formData, title: suggestion })
  }

  const handleDescriptionSuggestion = (suggestion: string) => {
    setFormData({ ...formData, description: suggestion })
  }

  return (
    <div className="space-y-6">
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
          {profile?.role_type === "corporativo" && (
            <SmartInput
              value={formData.title}
              department={formData.department}
              userRole={profile?.role_type || "empleado"}
              onSuggestionSelect={handleTitleSuggestion}
              placeholder="Escribe el título para obtener sugerencias..."
            />
          )}
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
          {profile?.role_type === "corporativo" && (
            <SmartInput
              value={formData.description}
              department={formData.department}
              userRole={profile?.role_type || "empleado"}
              onSuggestionSelect={handleDescriptionSuggestion}
              placeholder="Escribe la descripción para obtener sugerencias..."
            />
          )}
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
                <SelectItem value="no_iniciado">No Iniciado</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
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

      {profile?.role_type === "corporativo" && (
        <SuggestionPanel
          title={formData.title}
          description={formData.description}
          department={formData.department}
          userRole={profile?.role_type || "empleado"}
        />
      )}
    </div>
  )
}
