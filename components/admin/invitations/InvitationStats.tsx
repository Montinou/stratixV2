'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface InvitationStatsProps {
  companyId: string;
}

interface Stats {
  overall: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    acceptanceRate: number;
  };
  recent: {
    last7Days: number;
    pendingLast7Days: number;
    acceptedLast7Days: number;
  };
  alerts: {
    expiringSoon: number;
  };
}

export function InvitationStats({ companyId }: InvitationStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch(`/api/invitations/stats?companyId=${companyId}`);
        const data = await response.json();

        if (response.ok) {
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Invitations',
      value: stats.overall.total,
      icon: Mail,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Pending',
      value: stats.overall.pending,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: 'Accepted',
      value: stats.overall.accepted,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Acceptance Rate',
      value: `${stats.overall.acceptanceRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Alert for expiring invitations */}
      {stats.alerts.expiringSoon > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                {stats.alerts.expiringSoon} invitation{stats.alerts.expiringSoon !== 1 ? 's' : ''}{' '}
                expiring soon
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                These invitations will expire in the next 3 days. Consider sending a reminder.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === 'Total Invitations' && stats.recent.last7Days > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{stats.recent.last7Days} in last 7 days
                </p>
              )}
              {stat.title === 'Accepted' && stats.recent.acceptedLast7Days > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{stats.recent.acceptedLast7Days} in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional stats */}
      {(stats.overall.expired > 0 || stats.overall.revoked > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.overall.expired > 0 && (
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                  <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold">{stats.overall.expired} Expired</p>
                  <p className="text-sm text-muted-foreground">
                    Invitations that were not accepted in time
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.overall.revoked > 0 && (
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                  <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold">{stats.overall.revoked} Cancelled</p>
                  <p className="text-sm text-muted-foreground">
                    Invitations that were manually cancelled
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
