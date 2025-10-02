'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2, Save, Sparkles, ChevronRight, ChevronLeft, Briefcase, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface FormData {
  // Step 1: Basic Company Info
  organizationName: string;
  organizationSlug: string;
  organizationDescription: string;
  industry: string;
  companySize: string;
  website: string;
  headquartersLocation: string;

  // Step 2: Business & Vision
  missionStatement: string;
  visionStatement: string;
  businessModel: string;
  targetMarket: string; // Comma-separated
  keyProductsServices: string; // Comma-separated
  coreValues: string; // Comma-separated

  // Step 3: Optional Details
  foundedYear: string;
  employeeCount: string;
  annualRevenue: string;
  fiscalYearStart: string;
  timezone: string;
  currency: string;
  linkedinUrl: string;
  twitterHandle: string;
}

export default function CreateOrganizationPage() {
  const user = useUser({ or: 'redirect' });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [form, setForm] = useState<FormData>({
    organizationName: '',
    organizationSlug: '',
    organizationDescription: '',
    industry: '',
    companySize: '',
    website: '',
    headquartersLocation: '',
    missionStatement: '',
    visionStatement: '',
    businessModel: '',
    targetMarket: '',
    keyProductsServices: '',
    coreValues: '',
    foundedYear: '',
    employeeCount: '',
    annualRevenue: '',
    fiscalYearStart: 'January',
    timezone: 'America/New_York',
    currency: 'USD',
    linkedinUrl: '',
    twitterHandle: '',
  });

  // Load draft data on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const response = await fetch('/api/onboarding/status');
        if (response.ok) {
          const session = await response.json();

          if (session?.partialData) {
            setForm(prev => ({
              ...prev,
              ...session.partialData,
            }));
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDraft();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!loading && form.organizationName) {
      const timer = setTimeout(() => {
        fetch('/api/onboarding/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }).catch(error => {
          console.error('Error saving draft:', error);
        });
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [form, loading]);

  // Auto-generate slug from organization name
  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      organizationName: name,
      organizationSlug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }));
  };

  // AI enhancement for text fields
  const enhanceText = async (field: keyof FormData, context: string) => {
    const text = form[field] as string;

    if (!text.trim()) {
      toast.error('Por favor escribe algo primero');
      return;
    }

    setEnhancingField(field);

    try {
      const response = await fetch('/api/ai/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context,
          organizationName: form.organizationName,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al mejorar el texto');
      }

      const data = await response.json();

      if (data.enhancedText) {
        setForm(prev => ({
          ...prev,
          [field]: data.enhancedText,
        }));
        toast.success('¡Texto mejorado exitosamente!');
      }
    } catch (error) {
      console.error('Error enhancing text:', error);
      toast.error('Error al mejorar el texto. Por favor intenta de nuevo.');
    } finally {
      setEnhancingField(null);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!form.organizationName.trim()) {
          toast.error('El nombre de la organización es requerido');
          return false;
        }
        if (!form.organizationSlug.trim()) {
          toast.error('El slug es requerido');
          return false;
        }
        if (!form.organizationDescription.trim()) {
          toast.error('La descripción es requerida');
          return false;
        }
        return true;
      case 2:
        // Optional validation for step 2
        return true;
      case 3:
        // Optional validation for step 3
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Basic company info
          name: form.organizationName,
          slug: form.organizationSlug,
          description: form.organizationDescription,

          // Company profile data
          profile: {
            industry: form.industry || null,
            companySize: form.companySize || null,
            website: form.website || null,
            headquartersLocation: form.headquartersLocation || null,
            missionStatement: form.missionStatement || null,
            visionStatement: form.visionStatement || null,
            businessModel: form.businessModel || null,
            targetMarket: form.targetMarket ? form.targetMarket.split(',').map(s => s.trim()).filter(Boolean) : null,
            keyProductsServices: form.keyProductsServices ? form.keyProductsServices.split(',').map(s => s.trim()).filter(Boolean) : null,
            coreValues: form.coreValues ? form.coreValues.split(',').map(s => s.trim()).filter(Boolean) : null,
            foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
            employeeCount: form.employeeCount ? parseInt(form.employeeCount) : null,
            annualRevenue: form.annualRevenue ? parseFloat(form.annualRevenue) : null,
            fiscalYearStart: form.fiscalYearStart || null,
            timezone: form.timezone || null,
            currency: form.currency || 'USD',
            linkedinUrl: form.linkedinUrl || null,
            twitterHandle: form.twitterHandle || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la organización');
      }

      if (data.alreadyExists) {
        toast.info('Ya tienes una organización. Redirigiendo...');
        router.push('/tools');
        return;
      }

      toast.success('¡Organización creada exitosamente!');
      router.push('/tools');
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear la organización');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Crea Tu Organización</CardTitle>
          <CardDescription className="text-center">
            Paso {currentStep} de {totalSteps}: {
              currentStep === 1 ? 'Información Básica' :
              currentStep === 2 ? 'Visión y Negocio' :
              'Detalles Opcionales'
            }
          </CardDescription>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-16 rounded-full transition-colors ${
                  i + 1 <= currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Basic Company Info */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Nombre de la Organización *</Label>
                  <Input
                    id="organizationName"
                    placeholder="Mi Empresa S.A."
                    value={form.organizationName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationSlug">Identificador (Slug) *</Label>
                  <Input
                    id="organizationSlug"
                    placeholder="mi-empresa"
                    value={form.organizationSlug}
                    onChange={(e) => setForm(prev => ({ ...prev, organizationSlug: e.target.value }))}
                    disabled={submitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Se usará en URLs y debe ser único
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="organizationDescription">Descripción *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => enhanceText('organizationDescription', 'organization_description')}
                      disabled={submitting || enhancingField === 'organizationDescription' || !form.organizationDescription.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      {enhancingField === 'organizationDescription' ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Mejorando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          Mejorar con IA
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="organizationDescription"
                    placeholder="Describe brevemente tu organización..."
                    value={form.organizationDescription}
                    onChange={(e) => setForm(prev => ({ ...prev, organizationDescription: e.target.value }))}
                    disabled={submitting || enhancingField === 'organizationDescription'}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industria</Label>
                    <Select
                      value={form.industry}
                      onValueChange={(value) => setForm(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Tecnología</SelectItem>
                        <SelectItem value="finance">Finanzas</SelectItem>
                        <SelectItem value="healthcare">Salud</SelectItem>
                        <SelectItem value="education">Educación</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufactura</SelectItem>
                        <SelectItem value="consulting">Consultoría</SelectItem>
                        <SelectItem value="other">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize">Tamaño</Label>
                    <Select
                      value={form.companySize}
                      onValueChange={(value) => setForm(prev => ({ ...prev, companySize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 empleados</SelectItem>
                        <SelectItem value="11-50">11-50 empleados</SelectItem>
                        <SelectItem value="51-200">51-200 empleados</SelectItem>
                        <SelectItem value="201-500">201-500 empleados</SelectItem>
                        <SelectItem value="501-1000">501-1000 empleados</SelectItem>
                        <SelectItem value="1000+">1000+ empleados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.miempresa.com"
                    value={form.website}
                    onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headquartersLocation">Ubicación Principal</Label>
                  <Input
                    id="headquartersLocation"
                    placeholder="Ciudad, País"
                    value={form.headquartersLocation}
                    onChange={(e) => setForm(prev => ({ ...prev, headquartersLocation: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            {/* Step 2: Business & Vision */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="missionStatement">Misión</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => enhanceText('missionStatement', 'general')}
                      disabled={submitting || enhancingField === 'missionStatement' || !form.missionStatement.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      {enhancingField === 'missionStatement' ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Mejorando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          Mejorar con IA
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="missionStatement"
                    placeholder="¿Cuál es el propósito fundamental de tu organización?"
                    value={form.missionStatement}
                    onChange={(e) => setForm(prev => ({ ...prev, missionStatement: e.target.value }))}
                    disabled={submitting || enhancingField === 'missionStatement'}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visionStatement">Visión</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => enhanceText('visionStatement', 'general')}
                      disabled={submitting || enhancingField === 'visionStatement' || !form.visionStatement.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      {enhancingField === 'visionStatement' ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Mejorando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          Mejorar con IA
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="visionStatement"
                    placeholder="¿A dónde quiere llegar tu organización?"
                    value={form.visionStatement}
                    onChange={(e) => setForm(prev => ({ ...prev, visionStatement: e.target.value }))}
                    disabled={submitting || enhancingField === 'visionStatement'}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessModel">Modelo de Negocio</Label>
                  <Select
                    value={form.businessModel}
                    onValueChange={(value) => setForm(prev => ({ ...prev, businessModel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B (Business to Business)</SelectItem>
                      <SelectItem value="B2C">B2C (Business to Consumer)</SelectItem>
                      <SelectItem value="B2B2C">B2B2C</SelectItem>
                      <SelectItem value="SaaS">SaaS (Software as a Service)</SelectItem>
                      <SelectItem value="Marketplace">Marketplace</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Consulting">Consultoría</SelectItem>
                      <SelectItem value="Other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetMarket">Mercados Objetivo</Label>
                  <Input
                    id="targetMarket"
                    placeholder="Ej: América Latina, Europa, Global (separados por comas)"
                    value={form.targetMarket}
                    onChange={(e) => setForm(prev => ({ ...prev, targetMarket: e.target.value }))}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa múltiples mercados con comas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyProductsServices">Productos/Servicios Principales</Label>
                  <Input
                    id="keyProductsServices"
                    placeholder="Ej: Software, Consultoría, Hardware (separados por comas)"
                    value={form.keyProductsServices}
                    onChange={(e) => setForm(prev => ({ ...prev, keyProductsServices: e.target.value }))}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa múltiples productos/servicios con comas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coreValues">Valores Fundamentales</Label>
                  <Input
                    id="coreValues"
                    placeholder="Ej: Innovación, Transparencia, Excelencia (separados por comas)"
                    value={form.coreValues}
                    onChange={(e) => setForm(prev => ({ ...prev, coreValues: e.target.value }))}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa múltiples valores con comas
                  </p>
                </div>
              </>
            )}

            {/* Step 3: Optional Details */}
            {currentStep === 3 && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Estos detalles son opcionales y pueden configurarse más tarde.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foundedYear">Año de Fundación</Label>
                    <Input
                      id="foundedYear"
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="2020"
                      value={form.foundedYear}
                      onChange={(e) => setForm(prev => ({ ...prev, foundedYear: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeCount">Número de Empleados</Label>
                    <Input
                      id="employeeCount"
                      type="number"
                      min="1"
                      placeholder="50"
                      value={form.employeeCount}
                      onChange={(e) => setForm(prev => ({ ...prev, employeeCount: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">Ingresos Anuales (USD)</Label>
                  <Input
                    id="annualRevenue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1000000"
                    value={form.annualRevenue}
                    onChange={(e) => setForm(prev => ({ ...prev, annualRevenue: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fiscalYearStart">Inicio Año Fiscal</Label>
                    <Select
                      value={form.fiscalYearStart}
                      onValueChange={(value) => setForm(prev => ({ ...prev, fiscalYearStart: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="January">Enero</SelectItem>
                        <SelectItem value="April">Abril</SelectItem>
                        <SelectItem value="July">Julio</SelectItem>
                        <SelectItem value="October">Octubre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Select
                      value={form.timezone}
                      onValueChange={(value) => setForm(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">ET (US)</SelectItem>
                        <SelectItem value="America/Chicago">CT (US)</SelectItem>
                        <SelectItem value="America/Denver">MT (US)</SelectItem>
                        <SelectItem value="America/Los_Angeles">PT (US)</SelectItem>
                        <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                        <SelectItem value="America/Bogota">Bogotá</SelectItem>
                        <SelectItem value="America/Santiago">Santiago</SelectItem>
                        <SelectItem value="America/Buenos_Aires">Buenos Aires</SelectItem>
                        <SelectItem value="Europe/London">Londres</SelectItem>
                        <SelectItem value="Europe/Madrid">Madrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(value) => setForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="MXN">MXN ($)</SelectItem>
                        <SelectItem value="COP">COP ($)</SelectItem>
                        <SelectItem value="ARS">ARS ($)</SelectItem>
                        <SelectItem value="CLP">CLP ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/company/..."
                    value={form.linkedinUrl}
                    onChange={(e) => setForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitterHandle">Twitter/X</Label>
                  <Input
                    id="twitterHandle"
                    placeholder="@miempresa"
                    value={form.twitterHandle}
                    onChange={(e) => setForm(prev => ({ ...prev, twitterHandle: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            {form.organizationName && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-3 flex items-center gap-2">
                <Save className="h-4 w-4 text-green-600 dark:text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-500">
                  Borrador guardado automáticamente
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={submitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}

              <div className="ml-auto flex gap-2">
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={submitting}
                  >
                    Siguiente
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting || enhancingField !== null}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Crear Organización
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {currentStep === totalSteps && (
              <p className="text-xs text-center text-muted-foreground">
                Serás el administrador corporativo de esta organización
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
