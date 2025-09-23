"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ObjectiveCard } from "@/components/okr/objective-card"
import { EnhancedObjectiveForm } from "@/components/okr/enhanced-objective-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import type { Objective } from "@/lib/types/okr"
import { useState, useEffect } from "react"
import { Plus, Search, Filter, Calendar } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "@/hooks/use-toast"

export default function ObjectivesPage() {
  const { profile } = useAuth()
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingObjective, setEditingObjective] = useState<Objective | undefined>()
  const [deletingObjective, setDeletingObjective] = useState<Objective | undefined>()

  const fetchObjectives = async () => {
    if (!profile) return

    const supabase = createClient()
    setLoading(true)

    try {
      let query = supabase.from("objectives").select(`
        *,
        owner:profiles(*)
      `)

      // Apply role-based filtering
      if (profile.role === "empleado") {
        query = query.eq("owner_id", profile.id)
      } else if (profile.role === "gerente") {
        query = query.eq("department", profile.department)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error

      setObjectives(data || [])
    } catch (error) {
      console.error("Error fetching objectives:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [profile])

  const handleDelete = async (objective: Objective) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("objectives").delete().eq("id", objective.id)
      if (error) throw error

      toast({ title: "Objetivo eliminado", description: "El objetivo ha sido eliminado correctamente." })
      fetchObjectives()
    } catch (error) {
      console.error("Error deleting objective:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el objetivo. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
    setDeletingObjective(undefined)
  }

  const filteredObjectives = objectives.filter((objective) => {
    const matchesSearch =
      objective.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      objective.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || objective.status === statusFilter
    const matchesDepartment = departmentFilter === "all" || objective.department === departmentFilter

    // Date range filtering
    let matchesDateRange = true
    if (dateRange?.from && dateRange?.to) {
      const startDate = new Date(objective.start_date)
      const endDate = new Date(objective.end_date)
      matchesDateRange =
        (startDate >= dateRange.from && startDate <= dateRange.to) ||
        (endDate >= dateRange.from && endDate <= dateRange.to) ||
        (startDate <= dateRange.from && endDate >= dateRange.to)
    }

    return matchesSearch && matchesStatus && matchesDepartment && matchesDateRange
  })

  const departments = Array.from(new Set(objectives.map((obj) => obj.department).filter(Boolean)))

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Objetivos</h1>
            <p className="text-muted-foreground">Gestiona y supervisa los objetivos estratégicos</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Objetivo
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtra los objetivos por diferentes criterios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar objetivos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="no_iniciado">No Iniciado</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                  </SelectContent>
                </Select>
                {profile?.role !== "empleado" && (
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los departamentos</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept!}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  placeholder="Filtrar por rango de fechas"
                  className="w-full sm:w-auto"
                />
                {dateRange && (
                  <Button variant="outline" size="sm" onClick={() => setDateRange(undefined)}>
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objectives Grid */}
        {filteredObjectives.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron objetivos</h3>
              <p className="text-muted-foreground text-center">
                {objectives.length === 0
                  ? "Aún no tienes objetivos creados. Crea tu primer objetivo para comenzar."
                  : "No hay objetivos que coincidan con los filtros aplicados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredObjectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                onEdit={(obj) => {
                  setEditingObjective(obj)
                  setShowForm(true)
                }}
                onDelete={(obj) => setDeletingObjective(obj)}
                onViewDetails={(obj) => console.log("View details:", obj)}
              />
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditingObjective(undefined)
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingObjective ? "Editar" : "Crear"} Objetivo</DialogTitle>
              <DialogDescription>
                {editingObjective
                  ? "Modifica los datos del objetivo."
                  : "Completa la información para crear un nuevo objetivo."}
                {profile?.role === "corporativo" && !editingObjective && (
                  <span className="block mt-1 text-primary">
                    ✨ Obtén sugerencias inteligentes de IA mientras escribes
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <EnhancedObjectiveForm
              objective={editingObjective}
              onSuccess={() => {
                setShowForm(false)
                setEditingObjective(undefined)
                fetchObjectives()
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingObjective(undefined)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingObjective} onOpenChange={() => setDeletingObjective(undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el objetivo "{deletingObjective?.title}"
                y todas sus iniciativas y actividades asociadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingObjective && handleDelete(deletingObjective)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
