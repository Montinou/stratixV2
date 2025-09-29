"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Calendar, User, Target } from "lucide-react"
import { InitiativeDialog } from "./initiative-dialog"
import { useRouter } from "next/navigation"

interface Initiative {
  id: string
  title: string
  description?: string
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  progress?: number
  start_date: string
  end_date: string
  owner_id: string
  objective_id: string
  company_id: string
  created_at: string
  updated_at: string
}

interface Objective {
  id: string
  title: string
}

interface InitiativesContentProps {
  profile: {
    id: string
    user_id: string
    role: string
    department: string
    company_id: string
  }
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

const statusLabels = {
  planning: 'Planificación',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado'
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
}

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}

export function InitiativesContent({ profile }: InitiativesContentProps) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedObjective, setSelectedObjective] = useState<string>("")
  const [showDialog, setShowDialog] = useState(false)
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchInitiatives()
    fetchObjectives()
  }, [profile])

  const fetchInitiatives = async () => {
    try {
      const params = new URLSearchParams({
        userId: profile.user_id,
        userRole: profile.role,
        userDepartment: profile.department,
        ...(selectedObjective && { objectiveId: selectedObjective })
      })

      const response = await fetch(`/api/initiatives?${params}`)
      if (response.ok) {
        const data = await response.json()
        setInitiatives(data)
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchObjectives = async () => {
    try {
      const params = new URLSearchParams({
        userId: profile.user_id,
        userRole: profile.role,
        userDepartment: profile.department
      })

      const response = await fetch(`/api/objectives?${params}`)
      if (response.ok) {
        const data = await response.json()
        setObjectives(data)
      }
    } catch (error) {
      console.error('Error fetching objectives:', error)
    }
  }

  const handleCreateInitiative = () => {
    setSelectedInitiative(null)
    setShowDialog(true)
  }

  const handleEditInitiative = (initiative: Initiative) => {
    setSelectedInitiative(initiative)
    setShowDialog(true)
  }

  const handleInitiativeCreated = () => {
    fetchInitiatives()
    setShowDialog(false)
  }

  const handleViewDetails = (initiativeId: string) => {
    router.push(`/initiatives/${initiativeId}`)
  }

  const filteredInitiatives = initiatives.filter(initiative =>
    initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    initiative.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando iniciativas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Iniciativas</h1>
          <p className="text-muted-foreground">
            Gestiona las iniciativas estratégicas de tus objetivos
          </p>
        </div>
        <Button onClick={handleCreateInitiative} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Iniciativa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar iniciativas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedObjective}
          onChange={(e) => setSelectedObjective(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los objetivos</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </select>
      </div>

      {/* Initiatives Grid */}
      {filteredInitiatives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay iniciativas</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No se encontraron iniciativas que coincidan con tu búsqueda.' : 'Comienza creando tu primera iniciativa estratégica.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateInitiative} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Iniciativa
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInitiatives.map((initiative) => (
            <Card key={initiative.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{initiative.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[initiative.priority]}>
                      {priorityLabels[initiative.priority]}
                    </Badge>
                    <Badge className={statusColors[initiative.status]}>
                      {statusLabels[initiative.status]}
                    </Badge>
                  </div>
                </div>
                {initiative.description && (
                  <CardDescription className="line-clamp-2">
                    {initiative.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Progress */}
                  {initiative.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{initiative.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${initiative.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(initiative.start_date).toLocaleDateString('es-ES')} - {' '}
                      {new Date(initiative.end_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(initiative.id)}
                      className="flex-1"
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditInitiative(initiative)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <InitiativeDialog
          initiative={selectedInitiative}
          objectives={objectives}
          profile={profile}
          onClose={() => setShowDialog(false)}
          onSuccess={handleInitiativeCreated}
        />
      )}
    </div>
  )
}