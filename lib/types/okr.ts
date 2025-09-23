export type OKRStatus = "no_iniciado" | "en_progreso" | "completado" | "pausado"
export type UserRole = "corporativo" | "gerente" | "empleado"

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

export interface Objective {
  id: string
  title: string
  description: string | null
  owner_id: string
  department: string | null
  status: OKRStatus
  progress: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  owner?: Profile
}

export interface Initiative {
  id: string
  title: string
  description: string | null
  objective_id: string
  owner_id: string
  status: OKRStatus
  progress: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  owner?: Profile
  objective?: Objective
}

export interface Activity {
  id: string
  title: string
  description: string | null
  initiative_id: string
  owner_id: string
  status: OKRStatus
  progress: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  owner?: Profile
  initiative?: Initiative
}
