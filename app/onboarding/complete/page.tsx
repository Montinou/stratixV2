'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { CompletionStep } from "@/components/onboarding/WizardStep";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Building, Users, Rocket } from "lucide-react";

export default function CompletePage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { stepData, completeStep, reset } = useOnboardingStore();

  useEffect(() => {
    // Mark final step as complete
    completeStep(4);
  }, [completeStep]);

  const handleGoToDashboard = async () => {
    setIsNavigating(true);

    try {
      // Simulate saving final configuration
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear onboarding state
      reset();

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setIsNavigating(false);
    }
  };

  const completionDetails = [
    {
      icon: <Building className="w-5 h-5" />,
      title: "Empresa Configurada",
      value: stepData.company.name || "Sin nombre",
      description: `${stepData.company.industry || "Sin industria"} • ${stepData.company.size || "Sin tamaño"}`,
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Estructura Organizacional",
      value: `${stepData.organization.departments.length} Departamento${stepData.organization.departments.length !== 1 ? 's' : ''}`,
      description: `Estructura ${stepData.organization.structure === 'hierarchical' ? 'Jerárquica' :
                                 stepData.organization.structure === 'flat' ? 'Plana' : 'Matricial'}`,
    },
  ];

  return (
    <OnboardingLayout step={4} showNavigation={false}>
      <CompletionStep
        title="¡Configuración Completada!"
        description="Tu organización está lista para comenzar a gestionar OKRs de manera efectiva"
      >
        <div className="space-y-8">
          {/* Success Icon */}
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">
              Resumen de Configuración
            </h3>
            <div className="grid gap-4">
              {completionDetails.map((detail, index) => (
                <Card key={index} className="border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                        {detail.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {detail.title}
                          </span>
                          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                            Configurado
                          </Badge>
                        </div>
                        <div className="font-semibold">{detail.value}</div>
                        <div className="text-sm text-muted-foreground">
                          {detail.description}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Departments List */}
          {stepData.organization.departments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-center">Departamentos Creados</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {stepData.organization.departments.map((dept) => (
                  <Badge key={dept.id} variant="outline" className="px-3 py-1">
                    {dept.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Próximos Pasos
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Crear tus primeros objetivos (OKRs)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Invitar a tu equipo a colaborar
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Configurar métricas y seguimiento
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center space-y-4">
            <Button
              size="lg"
              onClick={handleGoToDashboard}
              disabled={isNavigating}
              className="min-w-[200px] h-12 text-base"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Finalizando...
                </>
              ) : (
                <>
                  Ir al Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Te redirigiremos al dashboard donde podrás comenzar a crear objetivos
            </p>
          </div>
        </div>
      </CompletionStep>
    </OnboardingLayout>
  );
}