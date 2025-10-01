import { getUserOrRedirect } from '@/lib/stack-auth';
import { getActivitiesForPage, getActivityStats } from '@/lib/services/activities-service';
import { ActivitiesPageClient } from '@/components/okr/activities-page-client';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let activities = [];
  let stats = {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    todayDue: 0,
    inProgress: 0
  };

  try {
    // Fetch real data from database
    [activities, stats] = await Promise.all([
      getActivitiesForPage(user.id),
      getActivityStats(user.id),
    ]);
  } catch (error) {
    console.error('Error loading activities:', error);
    // Use empty state on error
  }

  return <ActivitiesPageClient activities={activities} stats={stats} />;
}