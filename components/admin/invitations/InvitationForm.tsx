'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Mail, Users, Send, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface InvitationFormProps {
  organizationId: string;
  organizationName: string;
}

export function InvitationForm({ organizationId, organizationName }: InvitationFormProps) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'corporativo' | 'gerente' | 'empleado'>('empleado');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse and validate emails
    const emailList = emails
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails: emailList,
            role,
            organizationId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send invitations');
        }

        // Show success message
        toast.success(data.message);

        // Show details for partial failures
        if (data.stats.failed > 0) {
          const failedEmails = data.results
            .filter((r: any) => r.status === 'failed')
            .map((r: any) => r.email)
            .join(', ');
          toast.error(`Failed to send to: ${failedEmails}`);
        }

        // Clear form on success
        if (data.stats.sent > 0) {
          setEmails('');
          setRole('empleado');

          // Refresh the invitations table
          window.location.reload();
        }
      } catch (error) {
        console.error('Error sending invitations:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to send invitations');
      }
    });
  };

  const emailCount = emails
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Invitations
        </CardTitle>
        <CardDescription>
          Invite team members to join {organizationName}. They will receive an email with
          instructions to accept the invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="emails">
              Email Addresses
              {emailCount > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({emailCount} {emailCount === 1 ? 'email' : 'emails'})
                </span>
              )}
            </Label>
            <Textarea
              id="emails"
              placeholder="Enter email addresses (one per line or comma-separated)&#10;example@company.com, another@company.com&#10;third@company.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              disabled={isPending}
              className="min-h-[120px] font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter one or more email addresses separated by commas, semicolons, or line breaks.
              Maximum 50 emails per batch.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: any) => setRole(value)}
              disabled={isPending}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empleado">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Employee</p>
                      <p className="text-xs text-muted-foreground">
                        Can view and manage their own OKRs
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="gerente">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Manager</p>
                      <p className="text-xs text-muted-foreground">
                        Can manage team OKRs and send invitations
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="corporativo">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Corporate Administrator</p>
                      <p className="text-xs text-muted-foreground">
                        Full access to all organization features
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All invited users will be assigned this role when they join.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {emailCount > 0 && (
                <p>
                  Ready to send {emailCount} invitation{emailCount !== 1 ? 's' : ''} as{' '}
                  <strong>
                    {role === 'corporativo'
                      ? 'Corporate Administrator'
                      : role === 'gerente'
                        ? 'Manager'
                        : 'Employee'}
                  </strong>
                </p>
              )}
            </div>
            <Button type="submit" disabled={isPending || emailCount === 0}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitations
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
