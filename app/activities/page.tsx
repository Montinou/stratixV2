"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ActivityCard } from "@/components/okr/activity-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"
// Removed Supabase client import - using API endpoints instead
import type { Activity } from "@/lib/types/okr"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { ActivityForm } from "@/components/okr/activity-form"
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
import type { DateRange } from "react-day-picker"
import { toast } from "@/hooks/use-toast"

export default function ActivitiesPage() {
  const { profile } = useAuth()
  
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>()
  const [deletingActivity, setDeletingActivity] = useState<Activity | undefined>()

  const fetchActivities = useCallback(async () => {
    if (!profile) return

    setLoading(true)

    try {
      const params = new URLSearchParams({
        userId: profile.id,
        userRole: profile.role,
        userDepartment: profile.department
      })

      const response = await fetch(`/api/activities?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`)
      }

      const data = await response.json()
      setActivities(data || [])
    } catch (error) {
      console.error("Error fetching activities:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleDelete = async (activity: Activity) => {
    try {
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete activity: ${response.statusText}`)
      }

      toast({ title: "Actividad eliminada", description: "La actividad ha sido eliminada correctamente." })
      fetchActivities()
    } catch (error) {
      console.error("Error deleting activity:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la actividad. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
    setDeletingActivity(undefined)
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter

    // Date range filtering
    let matchesDateRange = true
    if (dateRange?.from && dateRange?.to) {
      const startDate = new Date(activity.start_date)
      const endDate = new Date(activity.end_date)
      matchesDateRange =
        (startDate >= dateRange.from && startDate <= dateRange.to) ||
        (endDate >= dateRange.from && endDate <= dateRange.to) ||
        (startDate <= dateRange.from && endDate >= dateRange.to)
    }

    return matchesSearch && matchesStatus && matchesDateRange
  })

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
            <h1 className="text-3xl font-bold">Actividades</h1>
            <p className="text-muted-foreground">Gestiona las actividades específicas de tus iniciativas</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Actividad
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtra las actividades por diferentes criterios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar actividades..."
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
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </CardContent>
        </Card>

        {/* Activities Grid */}
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron actividades</h3>
              <p className="text-muted-foreground text-center">
                {activities.length === 0
                  ? "Aún no tienes actividades creadas. Crea tu primera actividad para comenzar."
                  : "No hay actividades que coincidan con los filtros aplicados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={(act) => {
                  setEditingActivity(act)
                  setShowForm(true)
                }}
                onDelete={(act) => setDeletingActivity(act)}
                onViewDetails={(act) => console.log("View details:", act)}
              />
            ))}
          </div>
        )}

        {/* Form Dialog */}
        {showForm && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingActivity ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
                <DialogDescription>
                  {editingActivity ? "Edita los detalles de la actividad." : "Crea una nueva actividad."}
                </DialogDescription>
              </DialogHeader>
              <ActivityForm
                activity={editingActivity}
                onClose={() => setShowForm(false)}
                onSubmit={async (activityData) => {
                  const { error } = editingActivity
                    ? await supabase.from("activities").update(activityData).eq("id", editingActivity.id)
                    : await supabase.from("activities").insert([activityData])

                  if (error) {
                    console.error("Error submitting activity form:", error)
                    toast({
                      title: "Error",
                      description: "No se pudo guardar la actividad. Inténtalo de nuevo.",
                      variant: "destructive",
                    })
                  } else {
                    toast({
                      title: "Actividad guardada",
                      description: "La actividad ha sido guardada correctamente.",
                    })
                    fetchActivities()
                  }
                  setShowForm(false)
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Dialog */}
        {deletingActivity && (
          <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(undefined)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Actividad</AlertDialogTitle>
                <AlertDialogDescription>¿Estás seguro de que quieres eliminar esta actividad?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(deletingActivity)}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </DashboardLayout>
  )
}
