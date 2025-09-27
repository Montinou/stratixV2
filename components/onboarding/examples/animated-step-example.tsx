'use client';

import { useState } from "react";
import { Building2, Users, Target } from "lucide-react";
import { FormStep } from "../WizardStep";
import {
  AnimatedInput,
  AnimatedSelect,
  AnimatedTextarea,
  FormSection,
  StepTransition,
  LoadingWrapper,
  CompanyInfoSkeleton
} from "../animations";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Example of a fully animated onboarding step
export function AnimatedCompanyStep() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    teamSize: "",
    description: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleSubmit = async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsLoading(false);
    setCurrentStep(prev => prev + 1);
  };

  const validateField = (field: string, value: string) => {
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, [field]: "Este campo es requerido" }));
      return false;
    }
    setErrors(prev => ({ ...prev, [field]: "" }));
    return true;
  };

  return (
    <LoadingWrapper
      isLoading={isLoading}
      skeleton={<CompanyInfoSkeleton />}
    >
      <StepTransition
        currentStep={currentStep}
        direction="right"
        staggerChildren
      >
        <FormStep
          title="Información de tu Empresa"
          description="Cuéntanos sobre tu organización para personalizar tu experiencia"
          icon={<Building2 className="w-6 h-6" />}
          delayContent
          animationDirection="up"
        >
          <div className="space-y-8">
            {/* Company Basics */}
            <FormSection
              title="Información Básica"
              description="Los detalles fundamentales de tu empresa"
              delay={200}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatedInput
                  label="Nombre de la Empresa"
                  placeholder="Ej. Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, companyName: e.target.value }));
                    if (errors.companyName) validateField("companyName", e.target.value);
                  }}
                  onBlur={() => validateField("companyName", formData.companyName)}
                  error={errors.companyName}
                  success={formData.companyName.length > 0 && !errors.companyName}
                  icon={<Building2 className="w-4 h-4" />}
                />

                <AnimatedSelect
                  label="Industria"
                  placeholder="Selecciona tu industria"
                  value={formData.industry}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, industry: value }));
                    if (errors.industry) validateField("industry", value);
                  }}
                  error={errors.industry}
                  helper="Esto nos ayuda a personalizar las recomendaciones"
                >
                  <SelectItem value="technology">Tecnología</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="healthcare">Salud</SelectItem>
                  <SelectItem value="education">Educación</SelectItem>
                  <SelectItem value="retail">Comercio</SelectItem>
                  <SelectItem value="manufacturing">Manufactura</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </AnimatedSelect>
              </div>
            </FormSection>

            {/* Company Details */}
            <FormSection
              title="Detalles Adicionales"
              description="Información que nos ayuda a entender mejor tu organización"
              delay={400}
            >
              <div className="space-y-6">
                <AnimatedTextarea
                  label="Descripción de la Empresa"
                  placeholder="Describe brevemente qué hace tu empresa..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  rows={4}
                  helper="Una breve descripción ayudará a configurar objetivos relevantes"
                />

                <AnimatedSelect
                  label="Tamaño del Equipo"
                  placeholder="¿Cuántas personas trabajan en tu empresa?"
                  value={formData.teamSize}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, teamSize: value }));
                    if (errors.teamSize) validateField("teamSize", value);
                  }}
                  error={errors.teamSize}
                  helper="Esto nos ayuda a sugerir estructuras organizacionales apropiadas"
                >
                  <SelectItem value="1-10">1-10 personas</SelectItem>
                  <SelectItem value="11-50">11-50 personas</SelectItem>
                  <SelectItem value="51-200">51-200 personas</SelectItem>
                  <SelectItem value="201-500">201-500 personas</SelectItem>
                  <SelectItem value="500+">Más de 500 personas</SelectItem>
                </AnimatedSelect>
              </div>
            </FormSection>

            {/* Action Buttons */}
            <FormSection delay={600}>
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="button-scale"
                >
                  Anterior
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={!formData.companyName || !formData.industry || !formData.teamSize}
                  className="button-scale min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </div>
            </FormSection>
          </div>
        </FormStep>
      </StepTransition>
    </LoadingWrapper>
  );
}