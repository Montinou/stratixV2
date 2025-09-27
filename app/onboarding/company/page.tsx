'use client';

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingLayout } from "@/components/onboarding/WizardContainer";
import { FormStep } from "@/components/onboarding/WizardStep";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Briefcase } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "El nombre de la empresa debe tener al menos 2 caracteres"),
  industry: z.string().min(1, "Selecciona una industria"),
  size: z.string().min(1, "Selecciona el tamaño de la empresa"),
  description: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

const industries = [
  { value: "technology", label: "Tecnología" },
  { value: "finance", label: "Finanzas" },
  { value: "healthcare", label: "Salud" },
  { value: "education", label: "Educación" },
  { value: "retail", label: "Comercio" },
  { value: "manufacturing", label: "Manufactura" },
  { value: "consulting", label: "Consultoría" },
  { value: "media", label: "Medios y Comunicación" },
  { value: "energy", label: "Energía" },
  { value: "real-estate", label: "Bienes Raíces" },
  { value: "food", label: "Alimentación" },
  { value: "transportation", label: "Transporte" },
  { value: "other", label: "Otro" },
];

const companySizes = [
  { value: "1-10", label: "1-10 empleados" },
  { value: "11-50", label: "11-50 empleados" },
  { value: "51-200", label: "51-200 empleados" },
  { value: "201-500", label: "201-500 empleados" },
  { value: "501-1000", label: "501-1000 empleados" },
  { value: "1000+", label: "Más de 1000 empleados" },
];

export default function CompanyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { stepData, setStepData, completeStep, nextStep } = useOnboardingStore();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: stepData.company.name || "",
      industry: stepData.company.industry || "",
      size: stepData.company.size || "",
      description: stepData.company.description || "",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } = form;

  const handleNext = useCallback(async () => {
    const isFormValid = await form.trigger();
    if (!isFormValid) return;

    setIsLoading(true);
    try {
      const formData = form.getValues();

      // Save to store
      setStepData('company', formData);

      // Simulate API call (replace with actual API call later)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete step and navigate
      completeStep(2);
      nextStep();
      router.push("/onboarding/organization");
    } catch (error) {
      console.error("Error saving company data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [form, setStepData, completeStep, nextStep, router]);

  return (
    <OnboardingLayout
      step={2}
      canProceed={isValid}
      isLoading={isLoading}
      onNext={handleNext}
    >
      <FormStep
        title="Información de tu Empresa"
        description="Cuéntanos sobre tu empresa para personalizar la experiencia"
        icon={<Building className="w-8 h-8" />}
      >
        <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-base font-medium">
              Nombre de la Empresa *
            </Label>
            <Input
              id="company-name"
              placeholder="ej. Mi Empresa S.A."
              {...register("name")}
              aria-describedby="company-name-error"
              className="h-12"
            />
            {errors.name && (
              <p id="company-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-base font-medium">
              Industria *
            </Label>
            <Select
              value={watch("industry")}
              onValueChange={(value) => setValue("industry", value)}
            >
              <SelectTrigger id="industry" className="h-12" aria-describedby="industry-error">
                <SelectValue placeholder="Selecciona tu industria" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industry && (
              <p id="industry-error" className="text-sm text-destructive">
                {errors.industry.message}
              </p>
            )}
          </div>

          {/* Company Size */}
          <div className="space-y-2">
            <Label htmlFor="company-size" className="text-base font-medium">
              Tamaño de la Empresa *
            </Label>
            <Select
              value={watch("size")}
              onValueChange={(value) => setValue("size", value)}
            >
              <SelectTrigger id="company-size" className="h-12" aria-describedby="size-error">
                <SelectValue placeholder="Selecciona el tamaño de tu empresa" />
              </SelectTrigger>
              <SelectContent>
                {companySizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.size && (
              <p id="size-error" className="text-sm text-destructive">
                {errors.size.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-medium">
              Descripción (Opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Describe brevemente tu empresa y lo que hace..."
              {...register("description")}
              className="min-h-[100px] resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Esta información nos ayudará a personalizar mejor tu experiencia
            </p>
          </div>

          {/* Helper Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="w-4 h-4" />
              ¿Por qué necesitamos esta información?
            </div>
            <p className="text-sm text-muted-foreground">
              Esta información nos permite sugerir objetivos y métricas relevantes para tu industria
              y tamaño de empresa, haciendo que el proceso de configuración sea más eficiente.
            </p>
          </div>
        </form>
      </FormStep>
    </OnboardingLayout>
  );
}