'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, Upload, Trash2, Save, RefreshCw, Building } from 'lucide-react';
import Image from 'next/image';

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

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/company/settings');
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
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      setMessage('El archivo es muy grande. Máximo 2MB');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
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
      setMessage('Logo actualizado correctamente');

      // Update local state
      setCompany((prev: any) => ({ ...prev, logoUrl: data.logoUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage('Error al subir el logo');
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
      setMessage('Logo eliminado');

      // Update local state
      setCompany((prev: any) => ({ ...prev, logoUrl: null }));
    } catch (error) {
      console.error('Error removing logo:', error);
      setMessage('Error al eliminar el logo');
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

      setMessage('Colores guardados. Recarga la página para ver los cambios.');

      // Update CSS variables immediately for preview
      updateCSSVariables();
    } catch (error) {
      console.error('Error saving colors:', error);
      setMessage('Error al guardar los colores');
    } finally {
      setSaving(false);
    }
  };

  const updateCSSVariables = () => {
    const root = document.documentElement;

    // Convert hex to HSL for better color manipulation
    const hexToHSL = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)}deg ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply to CSS variables
    root.style.setProperty('--company-primary', primaryColor);
    root.style.setProperty('--company-secondary', secondaryColor);
    root.style.setProperty('--company-accent', accentColor);
  };

  const resetToDefaults = () => {
    setPrimaryColor('#0066CC');
    setSecondaryColor('#00AA55');
    setAccentColor('#FF6633');
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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Configuración de Empresa
        </h1>
        <p className="text-muted-foreground mt-2">
          Personaliza la apariencia de tu plataforma
        </p>
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Logo Section */}
      <Card className="mb-6">
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
            {/* Logo Preview */}
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

      {/* Colors Section */}
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
            {/* Color Inputs */}
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

            {/* Preview */}
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

            {/* Actions */}
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
    </div>
  );
}