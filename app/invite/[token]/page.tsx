'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, Mail, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  inviter: {
    id: string;
    email: string;
  };
}

export default function AcceptInvitationPage() {
  const user = useUser({ or: 'redirect' });
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load invitation');
        }

        setInvitation(data);
      } catch (error) {
        console.error('Error loading invitation:', error);
        setError(error instanceof Error ? error.message : 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation) return;

    setAccepting(true);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      toast.success(`Welcome to ${invitation.organization.name}!`);

      // Redirect to tools
      router.push('/tools');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              This invitation is not valid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4">
              <p className="text-sm text-red-600 dark:text-red-500">
                {error || 'Invitation not found'}
              </p>
            </div>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full mt-4"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = new Date(invitation.expiresAt);
  const isExpired = expiresAt < new Date();

  if (isExpired || invitation.status !== 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3">
                <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Invitation Expired</CardTitle>
            <CardDescription className="text-center">
              This invitation is no longer valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Please contact {invitation.inviter.email} to request a new invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            Join an organization to start collaborating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Organization</p>
                  <p className="text-lg font-semibold">{invitation.organization.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-sm">
                    {invitation.role === 'corporativo' && 'Corporate Administrator'}
                    {invitation.role === 'gerente' && 'Manager'}
                    {invitation.role === 'empleado' && 'Employee'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Invited by</p>
                  <p className="text-sm">{invitation.inviter.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Expires</p>
                  <p className="text-sm">{expiresAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-4">
              <p className="text-sm text-blue-600 dark:text-blue-500">
                By accepting this invitation, you will join <strong>{invitation.organization.name}</strong> as a{' '}
                <strong>
                  {invitation.role === 'corporativo' && 'Corporate Administrator'}
                  {invitation.role === 'gerente' && 'Manager'}
                  {invitation.role === 'empleado' && 'Employee'}
                </strong>.
              </p>
            </div>
          </div>

          <Button
            onClick={handleAccept}
            className="w-full"
            disabled={accepting}
            size="lg"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your email ({user.primaryEmail}) must match the invitation email
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
