"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Target, TrendingUp, Users, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              StratixV2
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/handler/sign-in">
              <Button variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/handler/sign-up">
              <Button size="sm" className="gap-2">
                Comenzar <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <Badge variant="secondary" className="gap-2 inline-flex">
              <Zap className="w-3 h-3" />
              Gestión Estratégica Impulsada por IA
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-5xl">
              Transforma Tu{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Visión Estratégica
              </span>
              {" "}En Realidad
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              Potencia tu organización con gestión inteligente de OKRs, análisis en tiempo real
              e insights impulsados por IA. Toma decisiones basadas en datos más rápido que nunca.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/handler/sign-up">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Comenzar Prueba Gratuita <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/handler/sign-in">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center mb-16">
            <Badge variant="outline" className="mb-4 inline-flex">Características</Badge>
            <h2 className="text-4xl font-bold mb-4">Todo lo que Necesitas para Tener Éxito</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Herramientas poderosas diseñadas para la gestión estratégica moderna
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Alineación de Objetivos",
                description: "Cascadea objetivos a través de tu organización con precisión y claridad.",
                color: "text-blue-500"
              },
              {
                icon: TrendingUp,
                title: "Análisis en Tiempo Real",
                description: "Rastrea el progreso con dashboards en vivo e insights accionables.",
                color: "text-green-500"
              },
              {
                icon: Users,
                title: "Colaboración en Equipo",
                description: "Herramientas de colaboración fluidas para mantener a todos alineados y productivos.",
                color: "text-purple-500"
              },
              {
                icon: Shield,
                title: "Seguridad Empresarial",
                description: "Encriptación de grado bancario y cumplimiento con estándares de la industria.",
                color: "text-orange-500"
              },
              {
                icon: Zap,
                title: "Insights Impulsados por IA",
                description: "Aprovecha el aprendizaje automático para optimizar tu planificación estratégica.",
                color: "text-yellow-500"
              },
              {
                icon: Sparkles,
                title: "Automatización Inteligente",
                description: "Automatiza tareas rutinarias y enfócate en lo que más importa.",
                color: "text-pink-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2">
                <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { value: "10K+", label: "Usuarios Activos" },
              { value: "500K+", label: "Objetivos Rastreados" },
              { value: "99.9%", label: "SLA de Disponibilidad" }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Listo para Transformar tu Estrategia?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Únete a miles de equipos que ya usan StratixV2 para alcanzar sus objetivos más ambiciosos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link href="/handler/sign-up">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Comenzar Ahora <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">No se requiere tarjeta de crédito</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">StratixV2</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 StratixV2. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
