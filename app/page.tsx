import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Target, TrendingUp, Users, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">OKR Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl text-balance">
            Gestiona tus <span className="text-primary">OKRs</span> de manera eficiente
          </h2>
          <p className="text-xl text-muted-foreground text-pretty">
            Sistema completo de gestión de Objetivos, Iniciativas y Actividades con roles específicos y análisis
            inteligente con IA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/register">Comenzar Ahora</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold mb-4">Características Principales</h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Todo lo que necesitas para gestionar objetivos empresariales de manera efectiva
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Target className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Jerarquía Clara</CardTitle>
              <CardDescription>
                Organiza Objetivos, Iniciativas y Actividades en una estructura clara y fácil de seguir.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Roles Específicos</CardTitle>
              <CardDescription>
                Sistema de permisos con roles Corporativo, Gerente y Empleado para control granular.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Dashboard Analítico</CardTitle>
              <CardDescription>
                Visualiza el progreso con gráficos interactivos y métricas de rendimiento en tiempo real.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>IA Integrada</CardTitle>
              <CardDescription>
                Recibe insights diarios y sugerencias de mejora personalizadas según tu rol.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">¿Listo para optimizar tus objetivos?</h3>
            <p className="text-xl mb-8 opacity-90">Únete a empresas que ya están transformando su gestión de OKRs</p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth/register">Crear Cuenta Gratuita</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-8 text-center text-muted-foreground">
          <p>&copy; 2025 OKR Manager. Sistema de gestión de objetivos empresariales.</p>
        </div>
      </footer>
    </div>
  )
}
