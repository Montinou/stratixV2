'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrganizationForm, useAutoSave } from "@/lib/hooks/use-onboarding-form";
import {
  METHODOLOGIES,
  COLLABORATION_STYLES,
  INTEGRATION_OPTIONS,
  OrganizationFormData
} from "@/lib/validations/onboarding-schemas";
import {
  Users,
  Layers,
  Target,
  GitBranch,
  Building,
  Plus,
  X,
  Network,
  Settings
} from "lucide-react";

interface TeamSizeInputProps {
  value: number;
  onChange: (value: number) => void;
}

function TeamSizeInput({ value, onChange }: TeamSizeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-4">
        <Input
          type="number"
          min="1"
          max="10000"
          value={value}
          onChange={handleChange}
          className="w-32"
          placeholder="5"
        />
        <span className="text-sm text-muted-foreground">personas en tu equipo</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Incluye a todos los miembros que participarán en la gestión de objetivos
      </div>
    </div>
  );
}

interface StructureSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function StructureSelector({ value, onChange }: StructureSelectorProps) {
  const structures = [
    {
      value: "hierarchical",
      title: "Jerárquica",
      description: "Estructura tradicional con niveles de autoridad claros",
      icon: <Layers className="w-6 h-6" />,
      example: "CEO → Gerentes → Equipos"
    },
    {
      value: "flat",
      title: "Plana",
      description: "Pocos niveles jerárquicos, mayor autonomía",
      icon: <Network className="w-6 h-6" />,
      example: "Líder → Colaboradores"
    },
    {
      value: "matrix",
      title: "Matricial",
      description: "Equipos multifuncionales con múltiples líderes",
      icon: <GitBranch className="w-6 h-6" />,
      example: "Proyectos × Funciones"
    }
  ];

  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
      {structures.map((structure) => (
        <div key={structure.value} className="relative">
          <RadioGroupItem value={structure.value} id={structure.value} className="peer sr-only" />
          <Label
            htmlFor={structure.value}
            className={cn(
              "flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "peer-checked:border-primary peer-checked:bg-primary/5",
              "hover:border-primary/50 hover:bg-primary/2"
            )}
          >
            <div className="text-primary mt-1">{structure.icon}</div>
            <div className="flex-1 space-y-2">
              <div className="font-medium">{structure.title}</div>
              <div className="text-sm text-muted-foreground">{structure.description}</div>
              <div className="text-xs text-muted-foreground italic">{structure.example}</div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

interface MethodologySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function MethodologySelector({ value, onChange }: MethodologySelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
      {METHODOLOGIES.map((methodology) => (
        <div key={methodology.value} className="relative">
          <RadioGroupItem value={methodology.value} id={methodology.value} className="peer sr-only" />
          <Label
            htmlFor={methodology.value}
            className={cn(
              "flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "peer-checked:border-primary peer-checked:bg-primary/5",
              "hover:border-primary/50 hover:bg-primary/2"
            )}
          >
            <div className="flex-1 space-y-2">
              <div className="font-medium">{methodology.label}</div>
              <div className="text-sm text-muted-foreground">{methodology.description}</div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

interface CollaborationStyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function CollaborationStyleSelector({ value, onChange }: CollaborationStyleSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
      {COLLABORATION_STYLES.map((style) => (
        <div key={style.value} className="relative">
          <RadioGroupItem value={style.value} id={style.value} className="peer sr-only" />
          <Label
            htmlFor={style.value}
            className={cn(
              "flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "peer-checked:border-primary peer-checked:bg-primary/5",
              "hover:border-primary/50 hover:bg-primary/2"
            )}
          >
            <div className="flex-1 space-y-2">
              <div className="font-medium">{style.label}</div>
              <div className="text-sm text-muted-foreground">{style.description}</div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

interface IntegrationSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function IntegrationSelector({ value, onChange }: IntegrationSelectorProps) {
  const handleToggle = (integrationValue: string) => {
    const newValue = value.includes(integrationValue)
      ? value.filter(v => v !== integrationValue)
      : [...value, integrationValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INTEGRATION_OPTIONS.map((integration) => (
          <div key={integration.value} className="relative">
            <Checkbox
              id={integration.value}
              checked={value.includes(integration.value)}
              onCheckedChange={() => handleToggle(integration.value)}
              className="peer sr-only"
            />
            <Label
              htmlFor={integration.value}
              className={cn(
                "flex flex-col items-center space-y-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                "peer-checked:border-primary peer-checked:bg-primary/5",
                "hover:border-primary/50 hover:bg-primary/2"
              )}
            >
              <span className="text-2xl">{integration.icon}</span>
              <span className="text-sm font-medium text-center">{integration.label}</span>
            </Label>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Integraciones seleccionadas:</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((integrationValue) => {
              const integration = INTEGRATION_OPTIONS.find(i => i.value === integrationValue);
              return integration ? (
                <Badge
                  key={integrationValue}
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <span>{integration.icon}</span>
                  <span>{integration.label}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(integrationValue)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizationStepComponent() {
  const router = useRouter();
  const form = useOrganizationForm();

  // Auto-save form data
  useAutoSave(form, 'organization');

  const handleSubmit = (data: OrganizationFormData) => {
    form.onSubmit(data);
    router.push("/onboarding/complete");
  };

  const handleBack = () => {
    router.push("/onboarding/company");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Estructura Organizacional</h1>
          <p className="text-lg text-muted-foreground">
            Define cómo está organizado tu equipo y qué metodologías usarán
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuración del Equipo</span>
          </CardTitle>
          <CardDescription>
            Esta información nos ayudará a adaptar la plataforma a tu forma de trabajar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Team Size */}
              <FormField
                control={form.control}
                name="teamSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cuántas personas forman tu equipo?</FormLabel>
                    <FormControl>
                      <TeamSizeInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Organization Structure */}
              <FormField
                control={form.control}
                name="structure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cuál es la estructura de tu organización?</FormLabel>
                    <FormControl>
                      <StructureSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Methodology */}
              <FormField
                control={form.control}
                name="methodology"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Qué metodología prefieres para gestionar objetivos?</FormLabel>
                    <FormControl>
                      <MethodologySelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collaboration Style */}
              <FormField
                control={form.control}
                name="collaborationStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cómo prefiere colaborar tu equipo?</FormLabel>
                    <FormControl>
                      <CollaborationStyleSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Integrations */}
              <FormField
                control={form.control}
                name="integrations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Con qué herramientas te gustaría integrar? (Opcional)</FormLabel>
                    <FormDescription>
                      Selecciona las herramientas que tu equipo usa diariamente
                    </FormDescription>
                    <FormControl>
                      <IntegrationSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary Info */}
              <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Configuración Final</h3>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Configuraremos {form.watch("teamSize")} usuarios iniciales</p>
                  <p>• Estructura organizacional: {
                    form.watch("structure") === "hierarchical" ? "Jerárquica" :
                    form.watch("structure") === "flat" ? "Plana" : "Matricial"
                  }</p>
                  <p>• Metodología: {
                    form.watch("methodology") === "okrs" ? "OKRs" :
                    form.watch("methodology") === "kpis" ? "KPIs" : "Personalizada"
                  }</p>
                  {form.watch("integrations").length > 0 && (
                    <p>• Integraciones: {form.watch("integrations").length} herramientas</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Anterior
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Finalizando..." : "Finalizar Configuración"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}