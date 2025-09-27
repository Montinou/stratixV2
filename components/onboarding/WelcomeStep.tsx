'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useWelcomeForm } from "@/lib/hooks/use-onboarding-form";
import {
  ROLE_OPTIONS,
  EXPERIENCE_LEVELS,
  WelcomeFormData
} from "@/lib/validations/onboarding-schemas";
import {
  Rocket,
  Target,
  Users,
  BarChart3,
  Crown,
  Briefcase,
  Star,
  User,
  Sparkles
} from "lucide-react";

const roleIcons = {
  ceo: Crown,
  manager: Briefcase,
  team_lead: Star,
  individual: User,
  custom: Sparkles
};

interface RoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showCustomInput: boolean;
  customValue: string;
  onCustomChange: (value: string) => void;
}

function RoleSelector({ value, onChange, showCustomInput, customValue, onCustomChange }: RoleSelectorProps) {
  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_OPTIONS.map((role) => {
          const Icon = roleIcons[role.value as keyof typeof roleIcons];
          return (
            <div key={role.value} className="relative">
              <RadioGroupItem value={role.value} id={role.value} className="peer sr-only" />
              <Label
                htmlFor={role.value}
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  "peer-checked:border-primary peer-checked:bg-primary/5",
                  "hover:border-primary/50 hover:bg-primary/2"
                )}
              >
                <Icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{role.label}</span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {showCustomInput && (
        <div className="mt-4">
          <Label htmlFor="customRole" className="text-sm font-medium">
            Especifica tu rol
          </Label>
          <Input
            id="customRole"
            placeholder="Ej: Director de Producto, CTO, etc."
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}

interface ExperienceLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function ExperienceLevelSelector({ value, onChange }: ExperienceLevelSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
      {EXPERIENCE_LEVELS.map((level) => (
        <div key={level.value} className="relative">
          <RadioGroupItem value={level.value} id={level.value} className="peer sr-only" />
          <Label
            htmlFor={level.value}
            className={cn(
              "flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "peer-checked:border-primary peer-checked:bg-primary/5",
              "hover:border-primary/50 hover:bg-primary/2"
            )}
          >
            <div className="flex-1 space-y-1">
              <div className="font-medium">{level.label}</div>
              <div className="text-sm text-muted-foreground">{level.description}</div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export function WelcomeStepComponent() {
  const router = useRouter();
  const form = useWelcomeForm();
  const [showCustomRole, setShowCustomRole] = useState(false);

  const handleSubmit = (data: WelcomeFormData) => {
    form.onSubmit(data);
    router.push("/onboarding/company");
  };

  const handleRoleChange = (value: string) => {
    form.setValue("role", value);
    setShowCustomRole(value === "custom");
    if (value !== "custom") {
      form.setValue("customRole", "");
    }
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
          <Rocket className="w-12 h-12 text-primary-foreground" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">¡Bienvenido a StratixV2!</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Configuremos tu organización para que puedas comenzar a gestionar tus OKRs de manera efectiva
          </p>
        </div>
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

      {/* Configuration Form */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cuéntanos sobre ti</CardTitle>
          <CardDescription>
            Esta información nos ayudará a personalizar tu experiencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cuál es tu rol en la organización?</FormLabel>
                    <FormControl>
                      <RoleSelector
                        value={field.value}
                        onChange={handleRoleChange}
                        showCustomInput={showCustomRole}
                        customValue={form.watch("customRole") || ""}
                        onCustomChange={(value) => form.setValue("customRole", value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Experience Level */}
              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cuál es tu nivel de experiencia con metodologías de objetivos?</FormLabel>
                    <FormControl>
                      <ExperienceLevelSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Progress Info */}
              <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
                <h3 className="font-semibold text-lg">¿Qué configuraremos a continuación?</h3>
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

              {/* Submit Button */}
              <div className="text-center">
                <Button
                  type="submit"
                  size="lg"
                  className="min-w-[200px] h-12 text-base"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Guardando..." : "Continuar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}