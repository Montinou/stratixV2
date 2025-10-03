import { getUserOrRedirect } from '@/lib/stack-auth';
import { getOKRDashboardStats } from '@/lib/services/analytics-service';
import { OKRDashboardClient } from '@/components/okr/okr-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function OKRDashboard() {
  const user = await getUserOrRedirect();

  let stats = {
    totalObjectives: 0,
    completedObjectives: 0,
    activeInitiatives: 0,
    overallProgress: 0,
    riskObjectives: 0
  };

  try {
    stats = await getOKRDashboardStats(user.id);
  } catch (error) {
    console.error('Error loading OKR dashboard stats:', error);
  }

  return <OKRDashboardClient stats={stats} user={user} />;
}