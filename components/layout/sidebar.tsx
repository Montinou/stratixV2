"use client"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Target,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Home,
  CheckSquare,
  Lightbulb,
  Activity,
  Upload,
} from "lucide-react"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["corporativo", "gerente", "empleado"],
    },
    {
      name: "Objetivos",
      href: "/objectives",
      icon: Target,
      roles: ["corporativo", "gerente", "empleado"],
    },
    {
      name: "Iniciativas",
      href: "/initiatives",
      icon: CheckSquare,
      roles: ["corporativo", "gerente", "empleado"],
    },
    {
      name: "Actividades",
      href: "/activities",
      icon: Activity,
      roles: ["corporativo", "gerente", "empleado"],
    },
    {
      name: "Análisis",
      href: "/analytics",
      icon: BarChart3,
      roles: ["corporativo", "gerente"],
    },
    {
      name: "Equipo",
      href: "/team",
      icon: Users,
      roles: ["corporativo", "gerente"],
    },
    {
      name: "IA Insights",
      href: "/insights",
      icon: Lightbulb,
      roles: ["corporativo", "gerente", "empleado"],
    },
    {
      name: "Importar Datos",
      href: "/import",
      icon: Upload,
      roles: ["corporativo", "gerente"],
    },
  ]

  const filteredNavigation = navigation.filter((item) => profile?.role && item.roles.includes(profile.role))

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "corporativo":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "gerente":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "empleado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "corporativo":
        return "Corporativo"
      case "gerente":
        return "Gerente"
      case "empleado":
        return "Empleado"
      default:
        return role
    }
  }

  return (
    <div className={cn("flex h-full w-64 flex-col bg-background border-r", className)}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Target className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold text-primary">OKR Manager</h1>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.name}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start", isActive && "bg-secondary")}
              >
                <Link href={item.href}>
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </Button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{profile?.full_name}</span>
                <span
                  className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getRoleBadgeColor(profile?.role || ""))}
                >
                  {getRoleLabel(profile?.role || "")}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
