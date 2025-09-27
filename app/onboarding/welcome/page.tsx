'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { WelcomeStep } from "@/components/onboarding/WizardStep";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Rocket, Target, Users, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function WelcomePage() {
  const router = useRouter();
  const { setStepData, completeStep, nextStep } = useOnboardingStore();

  useEffect(() => {
    // Mark welcome as seen
    setStepData('welcome', { hasSeenWelcome: true });
  }, [setStepData]);

  const handleContinue = () => {
    completeStep(1);
    nextStep();
    router.push("/onboarding/company");
  };

  const features = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "OKRs Inteligentes",
      description: "Crea y gestiona objetivos con asistencia de IA"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Colaboración en Equipo",
      description: "Alinea a todo tu equipo hacia objetivos comunes"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Analytics Avanzados",
      description: "Métricas detalladas para medir tu progreso"
    }
  ];

  return (
    <OnboardingLayout step={1} showNavigation={false}>
      <WelcomeStep
        title="¡Bienvenido a StratixV2!"
        description="Configuremos tu organización para que puedas comenzar a gestionar tus OKRs de manera efectiva"
      >
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <Rocket className="w-12 h-12 text-primary-foreground" />
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              En los próximos 3 pasos configuraremos tu empresa, estructura organizacional
              y crearemos tus primeros objetivos. Te tomará menos de 5 minutos.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Info */}
          <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
            <h3 className="font-semibold text-lg">¿Qué configuraremos?</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Paso 1</div>
                <div className="text-muted-foreground">Información de tu empresa</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Paso 2</div>
                <div className="text-muted-foreground">Estructura organizacional</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Paso 3</div>
                <div className="text-muted-foreground">¡Todo listo!</div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleContinue}
              className="min-w-[200px] h-12 text-base"
            >
              Comenzar Configuración
            </Button>
          </div>
        </div>
      </WelcomeStep>
    </OnboardingLayout>
  );
}