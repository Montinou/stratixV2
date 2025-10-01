import { getUserOrRedirect } from '@/lib/stack-auth';
import { getObjectivesForPage, getObjectiveStats } from '@/lib/services/objectives-service';
import { ObjectivesPageClient } from '@/components/okr/objectives-page-client';

export const dynamic = 'force-dynamic';

export default async function ObjectivesPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let objectives = [];
  let stats = {
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
    averageProgress: 0,
    highPriority: 0
  };

  try {
    // Fetch real data from database
    objectives = await getObjectivesForPage(user.id);
    stats = await getObjectiveStats(user.id);
  } catch (error) {
    console.error('Error loading objectives:', error);
    // Use empty state on error
    objectives = [];
  }

  return <ObjectivesPageClient objectives={objectives} stats={stats} />;
}