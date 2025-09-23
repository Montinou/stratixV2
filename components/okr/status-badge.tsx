import { Badge } from "@/components/ui/badge"
import type { OKRStatus } from "@/lib/types/okr"

interface StatusBadgeProps {
  status: OKRStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: OKRStatus) => {
    switch (status) {
      case "no_iniciado":
        return {
          label: "No Iniciado",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        }
      case "en_progreso":
        return {
          label: "En Progreso",
          variant: "default" as const,
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        }
      case "completado":
        return {
          label: "Completado",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        }
      case "pausado":
        return {
          label: "Pausado",
          variant: "destructive" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        }
      default:
        return {
          label: status,
          variant: "secondary" as const,
          className: "",
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
