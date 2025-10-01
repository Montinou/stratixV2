import { getUserOrRedirect } from '@/lib/stack-auth';
import { getAreasForPage, getAreaStats } from '@/lib/services/areas-service';
import { AreasPageClient } from '@/components/areas/areas-page-client';

export const dynamic = 'force-dynamic';

export default async function AreasPage() {
  // Get user safely - will redirect if not authenticated
  const user = await getUserOrRedirect();

  let areas = [];
  let stats = {
    total: 0,
    active: 0,
    inactive: 0,
    planning: 0,
    totalBudget: 0,
    totalHeadcount: 0
  };

  try {
    // Fetch data
    [areas, stats] = await Promise.all([
      getAreasForPage(user.id),
      getAreaStats(user.id),
    ]);
  } catch (error) {
    console.error('Error loading areas data:', error);
    // Use empty state on error
    areas = [];
  }

  return <AreasPageClient areas={areas} stats={stats} />;
}