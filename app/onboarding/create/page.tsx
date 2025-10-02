'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  organizationName: string;
  organizationSlug: string;
  organizationDescription: string;
}

export default function CreateOrganizationPage() {
  const user = useUser({ or: 'redirect' });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);
  const [form, setForm] = useState<FormData>({
    organizationName: '',
    organizationSlug: '',
    organizationDescription: '',
  });

  // Load draft data on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const response = await fetch('/api/onboarding/status');
        if (response.ok) {
          const session = await response.json();

          if (session?.partialData) {
            setForm({
              organizationName: session.partialData.organizationName || '',
              organizationSlug: session.partialData.organizationSlug || '',
              organizationDescription: session.partialData.organizationDescription || '',
            });
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
    if (!loading && (form.organizationName || form.organizationSlug || form.organizationDescription)) {
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

  // AI enhancement for description
  const enhanceDescription = async () => {
    if (!form.organizationDescription.trim()) {
      toast.error('Por favor escribe una descripción breve primero');
      return;
    }

    setEnhancingDescription(true);

    try {
      const response = await fetch('/api/ai/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.organizationDescription,
          context: 'organization_description',
          organizationName: form.organizationName,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al mejorar la descripción');
      }

      const data = await response.json();

      if (data.enhancedText) {
        setForm(prev => ({
          ...prev,
          organizationDescription: data.enhancedText,
        }));
        toast.success('¡Descripción mejorada exitosamente!');
      }
    } catch (error) {
      console.error('Error enhancing description:', error);
      toast.error('Error al mejorar la descripción. Por favor intenta de nuevo.');
    } finally {
      setEnhancingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.organizationName.trim()) {
      toast.error('El nombre de la organización es requerido');
      return;
    }

    if (!form.organizationSlug.trim()) {
      toast.error('El slug de la organización es requerido');
      return;
    }

    if (!form.organizationDescription.trim()) {
      toast.error('La descripción de la organización es requerida');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.organizationName,
          slug: form.organizationSlug,
          description: form.organizationDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la organización');
      }

      // Check if user already has an organization
      if (data.alreadyExists) {
        toast.info('Ya tienes una organización. Redirigiendo...');
        router.push('/tools');
        return;
      }

      toast.success('¡Organización creada exitosamente!');

      // Redirect to tools
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
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Crea Tu Organización</CardTitle>
          <CardDescription className="text-center">
            Configura tu espacio de trabajo para comenzar a gestionar OKRs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Nombre de la Organización</Label>
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
              <Label htmlFor="organizationSlug">Identificador (Slug)</Label>
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
                <Label htmlFor="organizationDescription">Descripción de la Organización</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={enhanceDescription}
                  disabled={submitting || enhancingDescription || !form.organizationDescription.trim()}
                  className="h-7 px-2 text-xs"
                >
                  {enhancingDescription ? (
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
                placeholder="Describe la misión, valores y actividades de tu organización..."
                value={form.organizationDescription}
                onChange={(e) => setForm(prev => ({ ...prev, organizationDescription: e.target.value }))}
                disabled={submitting || enhancingDescription}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Escribe una descripción breve y usa la IA para mejorarla
              </p>
            </div>

            {(form.organizationName || form.organizationSlug || form.organizationDescription) && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-3 flex items-center gap-2">
                <Save className="h-4 w-4 text-green-600 dark:text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-500">
                  Borrador guardado automáticamente
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || enhancingDescription}
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

            <p className="text-xs text-center text-muted-foreground">
              Serás el administrador corporativo de esta organización
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}