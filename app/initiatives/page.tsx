"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InitiativeCard } from "@/components/okr/initiative-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client-stub" // TEMPORARY: using stub during migration
import type { Initiative } from "@/lib/types/okr"
import { useState, useEffect } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { InitiativeForm } from "@/components/okr/initiative-form"
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

export default function InitiativesPage() {
  const { profile } = useAuth()
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<Initiative | undefined>()
  const [deletingInitiative, setDeletingInitiative] = useState<Initiative | undefined>()

  const fetchInitiatives = async () => {
    if (!profile) return

    const supabase = createClient()
    setLoading(true)

    try {
      let query = supabase.from("initiatives").select(`
        *,
        owner:profiles(*),
        objective:objectives(*)
      `)

      // Apply role-based filtering
      if (profile.role === "empleado") {
        query = query.eq("owner_id", profile.id)
      }
      // Gerentes y Corporativo pueden ver más iniciativas según las políticas RLS

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error

      setInitiatives(data || [])
    } catch (error) {
      console.error("Error fetching initiatives:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitiatives()
  }, [profile])

  const handleDelete = async (initiative: Initiative) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("initiatives").delete().eq("id", initiative.id)
      if (error) throw error

      toast({ title: "Iniciativa eliminada", description: "La iniciativa ha sido eliminada correctamente." })
      fetchInitiatives()
    } catch (error) {
      console.error("Error deleting initiative:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la iniciativa. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
    setDeletingInitiative(undefined)
  }

  const filteredInitiatives = initiatives.filter((initiative) => {
    const matchesSearch =
      initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      initiative.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || initiative.status === statusFilter

    // Date range filtering
    let matchesDateRange = true
    if (dateRange?.from && dateRange?.to) {
      const startDate = new Date(initiative.start_date)
      const endDate = new Date(initiative.end_date)
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
            <h1 className="text-3xl font-bold">Iniciativas</h1>
            <p className="text-muted-foreground">Gestiona las iniciativas que impulsan tus objetivos</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Iniciativa
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtra las iniciativas por diferentes criterios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar iniciativas..."
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

        {/* Initiatives Grid */}
        {filteredInitiatives.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron iniciativas</h3>
              <p className="text-muted-foreground text-center">
                {initiatives.length === 0
                  ? "Aún no tienes iniciativas creadas. Crea tu primera iniciativa para comenzar."
                  : "No hay iniciativas que coincidan con los filtros aplicados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInitiatives.map((initiative) => (
              <InitiativeCard
                key={initiative.id}
                initiative={initiative}
                onEdit={(init) => {
                  setEditingInitiative(init)
                  setShowForm(true)
                }}
                onDelete={(init) => setDeletingInitiative(init)}
                onViewDetails={(init) => console.log("View details:", init)}
              />
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditingInitiative(undefined)
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInitiative ? "Editar" : "Crear"} Iniciativa</DialogTitle>
              <DialogDescription>
                {editingInitiative
                  ? "Modifica los datos de la iniciativa."
                  : "Completa la información para crear una nueva iniciativa."}
              </DialogDescription>
            </DialogHeader>
            <InitiativeForm
              initiative={editingInitiative}
              onSuccess={() => {
                setShowForm(false)
                setEditingInitiative(undefined)
                fetchInitiatives()
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingInitiative(undefined)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingInitiative} onOpenChange={() => setDeletingInitiative(undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la iniciativa "
                {deletingInitiative?.title}" y todas sus actividades asociadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingInitiative && handleDelete(deletingInitiative)}
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
