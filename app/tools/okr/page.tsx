import { stackServerApp } from '@/stack/server';
import { getOKRDashboardStats } from '@/lib/services/analytics-service';
import { OKRDashboardClient } from '@/components/okr/okr-dashboard-client';

export default async function OKRDashboard() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  const stats = await getOKRDashboardStats(user.id);

  return <OKRDashboardClient stats={stats} user={user} />;
}