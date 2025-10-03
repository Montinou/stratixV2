import { getUserOrRedirect } from '@/lib/stack-auth';
import { getInitiativesForPage, getInitiativeStats } from '@/lib/services/initiatives-service';
import { InitiativesPageClient } from '@/components/okr/initiatives-page-client';

export const dynamic = 'force-dynamic';

export default async function InitiativesPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let initiatives = [];
  let stats = {
    total: 0,
    active: 0,
    averageProgress: 0
  };

  try {
    // Fetch data using the safe user object
    [initiatives, stats] = await Promise.all([
      getInitiativesForPage(user.id),
      getInitiativeStats(user.id),
    ]);
  } catch (error) {
    console.error('Error loading initiatives data:', error);
    // Use empty state on error
    initiatives = [];
    stats = {
      total: 0,
      active: 0,
      averageProgress: 0
    };
  }

  return <InitiativesPageClient initiatives={initiatives} stats={stats} />;
}