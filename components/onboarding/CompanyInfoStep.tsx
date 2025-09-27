'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCompanyForm, useAutoSave } from "@/lib/hooks/use-onboarding-form";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  CompanyFormData
} from "@/lib/validations/onboarding-schemas";
import {
  Building,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface CompanySizeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function CompanySizeSelector({ value, onChange }: CompanySizeSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {COMPANY_SIZES.map((size) => (
        <div key={size.value} className="relative">
          <RadioGroupItem value={size.value} id={size.value} className="peer sr-only" />
          <Label
            htmlFor={size.value}
            className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "peer-checked:border-primary peer-checked:bg-primary/5",
              "hover:border-primary/50 hover:bg-primary/2"
            )}
          >
            <Building className="w-5 h-5 text-primary" />
            <span className="font-medium">{size.label}</span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

interface LogoUploadProps {
  value: string;
  onChange: (value: string) => void;
}

function LogoUpload({ value, onChange }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadStatus('error');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // For now, just create a data URL - in production this would upload to cloud storage
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
        setUploadStatus('success');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadStatus('idle');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-primary/5",
          uploadStatus === 'error' ? "border-destructive" : "border-muted-foreground/25"
        )}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {value ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">Logo cargado exitosamente</p>
              </>
            ) : isUploading ? (
              <>
                <Upload className="w-8 h-8 text-primary mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Subiendo...</p>
              </>
            ) : uploadStatus === 'error' ? (
              <>
                <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                <p className="text-sm text-destructive">Error al subir archivo</p>
                <p className="text-xs text-muted-foreground">Máximo 2MB, solo imágenes</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG hasta 2MB</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {value && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <img src={value} alt="Logo preview" className="w-8 h-8 rounded object-cover" />
            <span className="text-sm font-medium">Logo de la empresa</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRemove}>
            Remover
          </Button>
        </div>
      )}
    </div>
  );
}

export function CompanyInfoStepComponent() {
  const router = useRouter();
  const form = useCompanyForm();

  // Auto-save form data
  useAutoSave(form, 'company');

  const handleSubmit = (data: CompanyFormData) => {
    form.onSubmit(data);
    router.push("/onboarding/organization");
  };

  const handleBack = () => {
    router.push("/onboarding/welcome");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Building className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Información de tu Empresa</h1>
          <p className="text-lg text-muted-foreground">
            Cuéntanos sobre tu empresa para personalizar tu experiencia
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Datos de la Empresa</span>
          </CardTitle>
          <CardDescription>
            Esta información nos ayudará a sugerir las mejores prácticas para tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Company Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Empresa *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Mi Empresa S.A."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Industry */}
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industria *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu industria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Size */}
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño de la Empresa *</FormLabel>
                    <FormControl>
                      <CompanySizeSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción de la Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe brevemente a qué se dedica tu empresa..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta información nos ayudará a personalizar las sugerencias de IA
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo Upload */}
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo de la Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <LogoUpload
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Sube el logo de tu empresa para personalizar la interfaz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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