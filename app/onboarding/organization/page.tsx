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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sitemap, Plus, Trash2, Building2 } from "lucide-react";
import { Department, OrganizationStructure } from "@/lib/types/onboarding";

const organizationSchema = z.object({
  structure: z.enum(["hierarchical", "flat", "matrix"]),
  departments: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre del departamento es requerido"),
    description: z.string().optional(),
    parentId: z.string().optional(),
  })).min(1, "Debe crear al menos un departamento"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

const organizationStructures = [
  {
    value: "hierarchical" as const,
    label: "Jerárquica",
    description: "Estructura tradicional con niveles de reporte claros"
  },
  {
    value: "flat" as const,
    label: "Plana",
    description: "Pocos niveles jerárquicos, más autonomía"
  },
  {
    value: "matrix" as const,
    label: "Matricial",
    description: "Equipos multifuncionales con múltiples reportes"
  },
];

const defaultDepartments = [
  { name: "Dirección General", description: "Liderazgo y dirección estratégica" },
  { name: "Recursos Humanos", description: "Gestión del talento y cultura" },
  { name: "Finanzas", description: "Gestión financiera y contable" },
  { name: "Tecnología", description: "Desarrollo y sistemas" },
  { name: "Ventas", description: "Ventas y desarrollo comercial" },
  { name: "Marketing", description: "Marketing y comunicaciones" },
];

export default function OrganizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const { stepData, setStepData, completeStep, nextStep } = useOnboardingStore();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      structure: stepData.organization.structure || "hierarchical",
      departments: stepData.organization.departments.length > 0
        ? stepData.organization.departments
        : [],
    },
  });

  const { setValue, watch, formState: { errors, isValid } } = form;
  const departments = watch("departments");
  const structure = watch("structure");

  const addDepartment = useCallback((name: string, description?: string) => {
    const newDepartment: Department = {
      id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim(),
    };

    setValue("departments", [...departments, newDepartment], { shouldValidate: true });
  }, [departments, setValue]);

  const removeDepartment = useCallback((id: string) => {
    setValue("departments", departments.filter(dept => dept.id !== id), { shouldValidate: true });
  }, [departments, setValue]);

  const addQuickDepartment = () => {
    if (newDepartmentName.trim()) {
      addDepartment(newDepartmentName);
      setNewDepartmentName("");
    }
  };

  const addDefaultDepartment = (dept: typeof defaultDepartments[0]) => {
    addDepartment(dept.name, dept.description);
  };

  const handleNext = useCallback(async () => {
    const isFormValid = await form.trigger();
    if (!isFormValid) return;

    setIsLoading(true);
    try {
      const formData = form.getValues();

      // Save to store
      setStepData('organization', formData);

      // Simulate API call (replace with actual API call later)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete step and navigate
      completeStep(3);
      nextStep();
      router.push("/onboarding/complete");
    } catch (error) {
      console.error("Error saving organization data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [form, setStepData, completeStep, nextStep, router]);

  return (
    <OnboardingLayout
      step={3}
      canProceed={isValid}
      isLoading={isLoading}
      onNext={handleNext}
    >
      <FormStep
        title="Estructura Organizacional"
        description="Define los departamentos y la estructura de tu organización"
        icon={<Sitemap className="w-8 h-8" />}
        maxWidth="2xl"
      >
        <div className="space-y-8">
          {/* Organization Structure */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Tipo de Estructura Organizacional
            </Label>
            <div className="grid md:grid-cols-3 gap-4">
              {organizationStructures.map((structureOption) => (
                <Card
                  key={structureOption.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    structure === structureOption.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setValue("structure", structureOption.value, { shouldValidate: true })}
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="font-medium">{structureOption.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {structureOption.description}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Departments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Departamentos
              </Label>
              <Badge variant="secondary">
                {departments.length} departamento{departments.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Quick Add Department */}
            <div className="flex gap-2">
              <Input
                placeholder="Agregar departamento..."
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addQuickDepartment();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addQuickDepartment}
                disabled={!newDepartmentName.trim()}
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Default Departments */}
            {departments.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  O selecciona de estos departamentos comunes:
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {defaultDepartments.map((dept, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addDefaultDepartment(dept)}
                      className="justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <div className="font-medium">{dept.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {dept.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Department List */}
            {departments.length > 0 && (
              <div className="space-y-2">
                {departments.map((department) => (
                  <Card key={department.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{department.name}</div>
                          {department.description && (
                            <div className="text-sm text-muted-foreground">
                              {department.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDepartment(department.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {errors.departments && (
              <p className="text-sm text-destructive">
                {errors.departments.message}
              </p>
            )}
          </div>

          {/* Helper Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sitemap className="w-4 h-4" />
              ¿Cómo se usará esta información?
            </div>
            <p className="text-sm text-muted-foreground">
              Los departamentos te permitirán organizar objetivos y dar seguimiento
              al progreso por área. Podrás modificar esta estructura después.
            </p>
          </div>
        </div>
      </FormStep>
    </OnboardingLayout>
  );
}