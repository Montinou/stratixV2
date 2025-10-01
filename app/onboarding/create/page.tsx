'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  organizationName: string;
  organizationSlug: string;
}

export default function CreateOrganizationPage() {
  const user = useUser({ or: 'redirect' });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    organizationName: '',
    organizationSlug: '',
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
    if (!loading && (form.organizationName || form.organizationSlug)) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.organizationName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    if (!form.organizationSlug.trim()) {
      toast.error('Organization slug is required');
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Check if user already has an organization
      if (data.alreadyExists) {
        toast.info('You already have an organization. Redirecting...');
        router.push('/tools');
        return;
      }

      toast.success('Organization created successfully!');

      // Redirect to tools
      router.push('/tools');
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
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
          <CardTitle className="text-2xl text-center">Create Your Organization</CardTitle>
          <CardDescription className="text-center">
            Set up your workspace to start managing OKRs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Acme Inc."
                value={form.organizationName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationSlug">Organization Slug</Label>
              <Input
                id="organizationSlug"
                placeholder="acme-inc"
                value={form.organizationSlug}
                onChange={(e) => setForm(prev => ({ ...prev, organizationSlug: e.target.value }))}
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be used in URLs and must be unique
              </p>
            </div>

            {(form.organizationName || form.organizationSlug) && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-3 flex items-center gap-2">
                <Save className="h-4 w-4 text-green-600 dark:text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-500">
                  Draft saved automatically
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Organization
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You will become the Corporate administrator of this organization
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
