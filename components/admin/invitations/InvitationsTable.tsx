'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Trash2,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InvitationsTableProps {
  organizationId: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  inviter: {
    id: string;
    email: string;
  };
}

export function InvitationsTable({ organizationId }: InvitationsTableProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isPending, startTransition] = useTransition();
  const [actionInvitation, setActionInvitation] = useState<Invitation | null>(null);
  const [actionType, setActionType] = useState<'resend' | 'cancel' | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId,
        page: page.toString(),
        limit: '10',
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/invitations?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [organizationId, page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    loadInvitations();
  };

  const handleResend = async (invitation: Invitation, isReminder: boolean = false) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/invitations/manage/${invitation.id}/resend`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminder: isReminder }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to resend invitation');
        }

        toast.success(data.message);
        setActionInvitation(null);
      } catch (error) {
        console.error('Error resending invitation:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
      }
    });
  };

  const handleCancel = async (invitation: Invitation) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/invitations/manage/${invitation.id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to cancel invitation');
        }

        toast.success(data.message);
        setActionInvitation(null);
        loadInvitations(); // Refresh the list
      } catch (error) {
        console.error('Error cancelling invitation:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: {
        variant: 'outline',
        icon: Clock,
        label: 'Pending',
      },
      accepted: {
        variant: 'default',
        icon: CheckCircle2,
        label: 'Accepted',
      },
      expired: {
        variant: 'secondary',
        icon: XCircle,
        label: 'Expired',
      },
      revoked: {
        variant: 'destructive',
        icon: XCircle,
        label: 'Cancelled',
      },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex w-fit items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      corporativo: 'Corporate Admin',
      gerente: 'Manager',
      empleado: 'Employee',
    };
    return labels[role] || role;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitations
          </CardTitle>
          <CardDescription>
            View and manage all pending and past invitations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-sm"
              />
              <Button onClick={handleSearch} variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No invitations found
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires / Accepted</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const daysRemaining = getDaysRemaining(invitation.expiresAt);
                      const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;

                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">
                            {invitation.email}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getRoleLabel(invitation.role)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                          <TableCell>
                            {invitation.status === 'accepted' && invitation.acceptedAt ? (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                {formatDate(invitation.acceptedAt)}
                              </span>
                            ) : (
                              <div>
                                <span className={`text-sm ${isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                                  {formatDate(invitation.expiresAt)}
                                </span>
                                {invitation.status === 'pending' && (
                                  <p className={`text-xs ${isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                                    {daysRemaining > 0
                                      ? `${daysRemaining} days left`
                                      : 'Expired'}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invitation.inviter.email}
                          </TableCell>
                          <TableCell className="text-right">
                            {invitation.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => {
                                    setActionInvitation(invitation);
                                    setActionType('resend');
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending}
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setActionInvitation(invitation);
                                    setActionType('cancel');
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasMore}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resend Confirmation Dialog */}
      <AlertDialog
        open={actionType === 'resend' && actionInvitation !== null}
        onOpenChange={() => {
          setActionInvitation(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to resend the invitation to{' '}
              <strong>{actionInvitation?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionInvitation && handleResend(actionInvitation, false)
              }
              disabled={isPending}
            >
              {isPending ? 'Sending...' : 'Resend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={actionType === 'cancel' && actionInvitation !== null}
        onOpenChange={() => {
          setActionInvitation(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{actionInvitation?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionInvitation && handleCancel(actionInvitation)}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Cancelling...' : 'Yes, Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
