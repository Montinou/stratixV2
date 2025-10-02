'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Upload, Trash2, Save, RefreshCw, Building, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

// Validation schemas
const basicInfoSchema = z.object({
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  headquartersLocation: z.string().optional(),
  foundedYear: z.number().min(1800).max(2100).optional(),
  employeeCount: z.number().min(1).optional(),
});

const strategySchema = z.object({
  businessModel: z.string().optional(),
  targetMarket: z.array(z.string()).optional(),
  keyProductsServices: z.array(z.string()).optional(),
});

const visionSchema = z.object({
  missionStatement: z.string().max(1000).optional(),
  visionStatement: z.string().max(1000).optional(),
  coreValues: z.array(z.string()).optional(),
});

const socialSchema = z.object({
  linkedinUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
type StrategyFormValues = z.infer<typeof strategySchema>;
type VisionFormValues = z.infer<typeof visionSchema>;
type SocialFormValues = z.infer<typeof socialSchema>;

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Color states
  const [primaryColor, setPrimaryColor] = useState('#0066CC');
  const [secondaryColor, setSecondaryColor] = useState('#00AA55');
  const [accentColor, setAccentColor] = useState('#FF6633');

  // Array field states for dynamic inputs
  const [targetMarkets, setTargetMarkets] = useState<string[]>(['']);
  const [products, setProducts] = useState<string[]>(['']);
  const [coreValuesList, setCoreValuesList] = useState<string[]>(['']);

  // Forms
  const basicForm = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      industry: '',
      companySize: '',
      website: '',
      headquartersLocation: '',
    },
  });

  const strategyForm = useForm<StrategyFormValues>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      businessModel: '',
    },
  });

  const visionForm = useForm<VisionFormValues>({
    resolver: zodResolver(visionSchema),
    defaultValues: {
      missionStatement: '',
      visionStatement: '',
    },
  });

  const socialForm = useForm<SocialFormValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      linkedinUrl: '',
      twitterHandle: '',
    },
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/company/profile');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setCompany(data);

      // Set logo preview
      if (data.logoUrl) {
        setLogoPreview(data.logoUrl);
      }

      // Set colors from settings
      if (data.settings?.theme) {
        setPrimaryColor(data.settings.theme.primaryColor || '#0066CC');
        setSecondaryColor(data.settings.theme.secondaryColor || '#00AA55');
        setAccentColor(data.settings.theme.accentColor || '#FF6633');
      }

      // Set profile data if exists
      if (data.profile) {
        const profile = data.profile;

        // Basic info
        basicForm.reset({
          industry: profile.industry || '',
          companySize: profile.companySize || '',
          website: profile.website || '',
          headquartersLocation: profile.headquartersLocation || '',
          foundedYear: profile.foundedYear,
          employeeCount: profile.employeeCount,
        });

        // Strategy
        strategyForm.reset({
          businessModel: profile.businessModel || '',
        });
        setTargetMarkets(profile.targetMarket?.length ? profile.targetMarket : ['']);
        setProducts(profile.keyProductsServices?.length ? profile.keyProductsServices : ['']);

        // Vision
        visionForm.reset({
          missionStatement: profile.missionStatement || '',
          visionStatement: profile.visionStatement || '',
        });
        setCoreValuesList(profile.coreValues?.length ? profile.coreValues : ['']);

        // Social
        socialForm.reset({
          linkedinUrl: profile.linkedinUrl || '',
          twitterHandle: profile.twitterHandle || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es muy grande. Máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      setSaving(true);
      const response = await fetch('/api/company/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload logo');

      const data = await response.json();
      toast.success('Logo actualizado correctamente');
      setCompany((prev: any) => ({ ...prev, logoUrl: data.logoUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error al subir el logo');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/company/logo', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove logo');

      setLogoPreview(null);
      toast.success('Logo eliminado');
      setCompany((prev: any) => ({ ...prev, logoUrl: null }));
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Error al eliminar el logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveColors = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            theme: {
              primaryColor,
              secondaryColor,
              accentColor,
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save colors');

      toast.success('Colores guardados. Recarga la página para ver los cambios.');
      updateCSSVariables();
    } catch (error) {
      console.error('Error saving colors:', error);
      toast.error('Error al guardar los colores');
    } finally {
      setSaving(false);
    }
  };

  const updateCSSVariables = () => {
    const root = document.documentElement;
    root.style.setProperty('--company-primary', primaryColor);
    root.style.setProperty('--company-secondary', secondaryColor);
    root.style.setProperty('--company-accent', accentColor);
  };

  const resetToDefaults = () => {
    setPrimaryColor('#0066CC');
    setSecondaryColor('#00AA55');
    setAccentColor('#FF6633');
  };

  // Save handlers for each section
  const handleSaveBasicInfo = async (values: BasicInfoFormValues) => {
    try {
      setSaving(true);
      const response = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Información básica guardada');
    } catch (error) {
      console.error('Error saving basic info:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStrategy = async (values: StrategyFormValues) => {
    try {
      setSaving(true);
      const filteredMarkets = targetMarkets.filter(m => m.trim() !== '');
      const filteredProducts = products.filter(p => p.trim() !== '');

      const response = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          targetMarket: filteredMarkets,
          keyProductsServices: filteredProducts,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Estrategia guardada');
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVision = async (values: VisionFormValues) => {
    try {
      setSaving(true);
      const filteredValues = coreValuesList.filter(v => v.trim() !== '');

      const response = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          coreValues: filteredValues,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Visión y valores guardados');
    } catch (error) {
      console.error('Error saving vision:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocial = async (values: SocialFormValues) => {
    try {
      setSaving(true);
      const response = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Redes sociales guardadas');
    } catch (error) {
      console.error('Error saving social:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Array helpers
  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Configuración de Empresa
        </h1>
        <p className="text-muted-foreground mt-2">
          Personaliza la información y apariencia de tu empresa
        </p>
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="basic">Info Básica</TabsTrigger>
          <TabsTrigger value="strategy">Estrategia</TabsTrigger>
          <TabsTrigger value="vision">Visión</TabsTrigger>
          <TabsTrigger value="social">Redes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Apariencia (Logo + Colores) */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo de la Empresa
              </CardTitle>
              <CardDescription>
                Sube un logo para mostrar en la navegación (máx. 2MB, formatos: JPG, PNG, SVG)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Logo
                    </Button>
                    {logoPreview && (
                      <Button
                        onClick={handleRemoveLogo}
                        disabled={saving}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colores del Tema
              </CardTitle>
              <CardDescription>
                Personaliza los colores principales de tu plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary">Color Primario</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#0066CC"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Botones principales y enlaces
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary">Color Secundario</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#00AA55"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Elementos secundarios
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent">Color de Acento</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent"
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#FF6633"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Destacados y notificaciones
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold mb-4">Vista Previa</h4>
                  <div className="flex gap-4 flex-wrap">
                    <Button
                      style={{ backgroundColor: primaryColor }}
                      className="text-white"
                    >
                      Botón Primario
                    </Button>
                    <Button
                      variant="outline"
                      style={{ borderColor: secondaryColor, color: secondaryColor }}
                    >
                      Botón Secundario
                    </Button>
                    <div
                      className="px-4 py-2 rounded-md text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Elemento de Acento
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveColors}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Colores
                  </Button>
                  <Button
                    onClick={resetToDefaults}
                    variant="outline"
                    disabled={saving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restaurar Predeterminados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Información Básica */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>
                Detalles generales sobre tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...basicForm}>
                <form onSubmit={basicForm.handleSubmit(handleSaveBasicInfo)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={basicForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industria</FormLabel>
                          <FormControl>
                            <Input placeholder="ej. Tecnología, Retail, Salud" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamaño de Empresa</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona tamaño" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1-10 empleados</SelectItem>
                              <SelectItem value="11-50">11-50 empleados</SelectItem>
                              <SelectItem value="51-200">51-200 empleados</SelectItem>
                              <SelectItem value="201-500">201-500 empleados</SelectItem>
                              <SelectItem value="501-1000">501-1000 empleados</SelectItem>
                              <SelectItem value="1000+">1000+ empleados</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sitio Web</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.ejemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="headquartersLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ubicación de Oficinas Centrales</FormLabel>
                          <FormControl>
                            <Input placeholder="ej. Ciudad de México, México" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="foundedYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Año de Fundación</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2020"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Empleados</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Información Básica
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Estrategia de Negocio */}
        <TabsContent value="strategy">
          <Card>
            <CardHeader>
              <CardTitle>Estrategia de Negocio</CardTitle>
              <CardDescription>
                Define tu modelo de negocio y mercado objetivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...strategyForm}>
                <form onSubmit={strategyForm.handleSubmit(handleSaveStrategy)} className="space-y-6">
                  <FormField
                    control={strategyForm.control}
                    name="businessModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo de Negocio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona modelo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="B2B">B2B (Business to Business)</SelectItem>
                            <SelectItem value="B2C">B2C (Business to Consumer)</SelectItem>
                            <SelectItem value="B2B2C">B2B2C</SelectItem>
                            <SelectItem value="Marketplace">Marketplace</SelectItem>
                            <SelectItem value="SaaS">SaaS</SelectItem>
                            <SelectItem value="Other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Mercados Objetivo</Label>
                    <div className="space-y-2">
                      {targetMarkets.map((market, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="ej. Latinoamérica, Norteamérica"
                            value={market}
                            onChange={(e) => updateArrayItem(setTargetMarkets, index, e.target.value)}
                          />
                          {targetMarkets.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem(setTargetMarkets, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem(setTargetMarkets)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Mercado
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Productos/Servicios Principales</Label>
                    <div className="space-y-2">
                      {products.map((product, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="ej. Software de Gestión, Consultoría"
                            value={product}
                            onChange={(e) => updateArrayItem(setProducts, index, e.target.value)}
                          />
                          {products.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem(setProducts, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem(setProducts)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Producto/Servicio
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Estrategia
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Visión y Valores */}
        <TabsContent value="vision">
          <Card>
            <CardHeader>
              <CardTitle>Visión y Valores</CardTitle>
              <CardDescription>
                Define la misión, visión y valores de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...visionForm}>
                <form onSubmit={visionForm.handleSubmit(handleSaveVision)} className="space-y-6">
                  <FormField
                    control={visionForm.control}
                    name="missionStatement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Misión</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="¿Cuál es la razón de ser de tu empresa?"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo 1000 caracteres
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={visionForm.control}
                    name="visionStatement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visión</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="¿Hacia dónde se dirige tu empresa?"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo 1000 caracteres
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Valores Fundamentales</Label>
                    <div className="space-y-2">
                      {coreValuesList.map((value, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="ej. Innovación, Integridad, Colaboración"
                            value={value}
                            onChange={(e) => updateArrayItem(setCoreValuesList, index, e.target.value)}
                          />
                          {coreValuesList.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem(setCoreValuesList, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem(setCoreValuesList)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Valor
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Visión y Valores
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Redes Sociales */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales</CardTitle>
              <CardDescription>
                Enlaces a las redes sociales de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...socialForm}>
                <form onSubmit={socialForm.handleSubmit(handleSaveSocial)} className="space-y-6">
                  <FormField
                    control={socialForm.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.linkedin.com/company/tu-empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={socialForm.control}
                    name="twitterHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter/X</FormLabel>
                        <FormControl>
                          <Input placeholder="@tuempresa" {...field} />
                        </FormControl>
                        <FormDescription>
                          Incluye el @ al inicio
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Redes Sociales
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
