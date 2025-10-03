import { getUserOrRedirect } from '@/lib/stack-auth';
import { columns, UserForTable } from '@/components/admin/UserTable/UsersTableColumn';
import { UsersTable } from '@/components/admin/UserTable/UsersTable';
import { Toaster } from '@/components/ui/sonner';
import { profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';

export default async function UsersPage() {
  // Get current user's company
  const currentUser = await getUserOrRedirect();

  // Ejecutar queries con RLS context para seguridad adicional
  const { currentProfile, companyProfiles } = await withRLSContext(currentUser.id, async (db) => {
    const currentProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, currentUser.id),
    });

    if (!currentProfile?.companyId) {
      throw new Error('No company assigned to user');
    }

    // Get all users from current user's company
    // RLS garantiza que solo veremos perfiles de nuestra company
    const companyProfiles = await db.query.profiles.findMany({
      where: eq(profiles.companyId, currentProfile.companyId),
    });

    return { currentProfile, companyProfiles };
  });

  if (!currentProfile?.companyId) {
    return <div>No company assigned to user</div>;
  }

  // Get Stack users for these profiles
  const usersResult = await stackServerApp.listUsers({
    orderBy: 'signedUpAt',
    desc: true,
  });

  // Filter Stack users to only show those in the same company
  const companyProfileIds = new Set(companyProfiles.map(p => p.id));
  const filteredUsers = usersResult.filter(user => companyProfileIds.has(user.id));

  const plainUsers: UserForTable[] = await Promise.all(
    filteredUsers.map(async (user) => {
      const permissions: string[] = [];
      if (await user.hasPermission('admin')) {
        permissions.push('admin');
      } else if (await user.hasPermission('user')) {
        permissions.push('user');
      }

      return {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
        profileImageUrl: user.profileImageUrl,
        signedUpAt: user.signedUpAt.toISOString(),
        permissions: permissions,
        lastActiveAt: user.lastActiveAt?.toISOString() || null,
      };
    })
  );

  return (
    <>
      <UsersTable columns={columns} data={plainUsers} />
      <Toaster position="top-center" richColors />
    </>
  );
}

export const dynamic = 'force-dynamic';
