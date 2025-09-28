'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import {
  CheckCircle,
  Sparkles,
  Target,
  Users,
  BarChart3,
  ArrowRight,
  Rocket,
  Building,
  Settings,
  Trophy,
  TrendingUp,
  Calendar,
  Clock
} from "lucide-react";

interface OnboardingSummaryProps {
  data: {
    welcome?: any;
    company?: any;
    organization?: any;
  };
}

function OnboardingSummary({ data }: OnboardingSummaryProps) {
  const { welcome, company, organization } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Resumen de Configuración</span>
        </CardTitle>
        <CardDescription>
          Aquí está todo lo que configuraste para tu organización
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Info */}
        {welcome && (
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Información Personal</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {welcome.role && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Rol</div>
                  <Badge variant="secondary">
                    {welcome.customRole || welcome.role === 'ceo' ? 'CEO / Fundador' :
                     welcome.role === 'manager' ? 'Manager / Gerente' :
                     welcome.role === 'team_lead' ? 'Team Lead / Líder de Equipo' :
                     welcome.role === 'individual' ? 'Colaborador Individual' :
                     welcome.customRole || welcome.role}
                  </Badge>
                </div>
              )}
              {welcome.experienceLevel && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Experiencia</div>
                  <Badge variant="outline">
                    {welcome.experienceLevel === 'beginner' ? 'Principiante' :
                     welcome.experienceLevel === 'intermediate' ? 'Intermedio' :
                     'Avanzado'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Info */}
        {company && (
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Información de la Empresa</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industria:</span>
                <span className="font-medium">
                  {company.industry === 'technology' ? 'Tecnología' :
                   company.industry === 'finance' ? 'Finanzas y Banca' :
                   company.industry === 'healthcare' ? 'Salud y Medicina' :
                   company.industry}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño:</span>
                <span className="font-medium">
                  {company.size === 'startup' ? 'Startup (1-10 empleados)' :
                   company.size === 'small' ? 'Pequeña (11-50 empleados)' :
                   company.size === 'medium' ? 'Mediana (51-200 empleados)' :
                   company.size === 'large' ? 'Grande (201-1000 empleados)' :
                   company.size === 'enterprise' ? 'Empresa (1000+ empleados)' :
                   company.size}
                </span>
              </div>
              {company.description && (
                <div className="pt-2">
                  <div className="text-muted-foreground mb-1">Descripción:</div>
                  <div className="text-sm">{company.description}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Organization Info */}
        {organization && (
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Estructura Organizacional</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño del equipo:</span>
                <span className="font-medium">{organization.teamSize} personas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estructura:</span>
                <span className="font-medium">
                  {organization.structure === 'hierarchical' ? 'Jerárquica' :
                   organization.structure === 'flat' ? 'Plana' :
                   'Matricial'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metodología:</span>
                <span className="font-medium">
                  {organization.methodology === 'okrs' ? 'OKRs' :
                   organization.methodology === 'kpis' ? 'KPIs' :
                   'Personalizada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colaboración:</span>
                <span className="font-medium">
                  {organization.collaborationStyle === 'centralized' ? 'Centralizada' :
                   organization.collaborationStyle === 'distributed' ? 'Distribuida' :
                   'Híbrida'}
                </span>
              </div>
              {organization.integrations && organization.integrations.length > 0 && (
                <div className="pt-2">
                  <div className="text-muted-foreground mb-2">Integraciones:</div>
                  <div className="flex flex-wrap gap-1">
                    {organization.integrations.map((integration: string) => (
                      <Badge key={integration} variant="outline" className="text-xs">
                        {integration}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ icon, title, description, badge }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NextStepsRoadmap() {
  const steps = [
    {
      title: "Crear tu primer OKR",
      description: "Define objetivos claros para el próximo trimestre",
      icon: <Target className="w-5 h-5" />,
      time: "5 min"
    },
    {
      title: "Invitar a tu equipo",
      description: "Agrega miembros del equipo para colaborar",
      icon: <Users className="w-5 h-5" />,
      time: "10 min"
    },
    {
      title: "Configurar dashboard",
      description: "Personaliza tu vista de métricas y progreso",
      icon: <BarChart3 className="w-5 h-5" />,
      time: "5 min"
    },
    {
      title: "Explorar integraciones",
      description: "Conecta tus herramientas favoritas",
      icon: <Settings className="w-5 h-5" />,
      time: "15 min"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Próximos Pasos</span>
        </CardTitle>
        <CardDescription>
          Te recomendamos seguir estos pasos para aprovechar al máximo la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <span className="text-sm font-semibold">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.title}</h4>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{step.time}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CompletionStepComponent() {
  const router = useRouter();
  const { stepData } = useOnboardingStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartBuilding = async () => {
    try {
      // Complete onboarding and create profile
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: stepData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      router.push("/dashboard");
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // For now, still redirect to dashboard even if completion fails
      router.push("/dashboard");
    }
  };

  const handleCreateFirstOKR = async () => {
    try {
      // Complete onboarding and create profile
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: stepData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      router.push("/objectives/new");
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // For now, still redirect to objectives even if completion fails
      router.push("/objectives/new");
    }
  };

  // Generate personalized recommendations based on setup
  const recommendations = [
    {
      icon: <Target className="w-5 h-5" />,
      title: "Definir OKRs Trimestrales",
      description: "Basándote en tu industria y estructura organizacional, te sugerimos empezar con 3-5 objetivos clave para este trimestre.",
      badge: "Recomendado"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Configurar Equipos",
      description: "Organiza a tu equipo en departamentos para un mejor seguimiento de objetivos y métricas.",
      badge: "Siguiente"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Métricas Inteligentes",
      description: "Aprovecha nuestro AI para sugerir KPIs relevantes para tu industria y objetivos específicos.",
      badge: "IA"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Header */}
      <div className="text-center space-y-6">
        <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">¡Configuración Completada!</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Excelente trabajo. Tu organización está lista para comenzar a gestionar objetivos de manera efectiva.
          </p>
        </div>
      </div>

      {/* Progress Animation */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progreso de configuración</span>
              <span className="text-sm text-muted-foreground">100% completado</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Información personal</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Datos de empresa</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Estructura organizacional</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Configuration Summary */}
        <div className="space-y-6">
          <OnboardingSummary data={stepData} />
        </div>

        {/* Next Steps */}
        <div className="space-y-6">
          <NextStepsRoadmap />
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold flex items-center justify-center space-x-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span>Recomendaciones Personalizadas</span>
          </h2>
          <p className="text-muted-foreground">
            Basado en tu configuración, nuestro AI ha preparado estas sugerencias
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={index}
              icon={rec.icon}
              title={rec.title}
              description={rec.description}
              badge={rec.badge}
            />
          ))}
        </div>
      </div>

      {/* Achievement Badge */}
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">¡Logro Desbloqueado!</h3>
              <p className="text-muted-foreground">
                Has completado la configuración inicial. Tu organización está lista para alcanzar sus objetivos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          onClick={handleCreateFirstOKR}
          className="min-w-[200px] h-12 text-base"
        >
          <Target className="w-5 h-5 mr-2" />
          Crear Primer OKR
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleStartBuilding}
          className="min-w-[200px] h-12 text-base"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          Ir al Dashboard
        </Button>
      </div>

      {/* Footer Info */}
      <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">¡Ya estás listo para comenzar!</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Si necesitas ayuda en cualquier momento, puedes acceder a nuestra documentación
          desde el menú de usuario o contactar con soporte.
        </p>
      </div>
    </div>
  );
}