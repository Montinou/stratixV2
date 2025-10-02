import { stackServerApp } from '@/stack/server';
import { columns, UserForTable } from '@/components/admin/UserTable/UsersTableColumn';
import { UsersTable } from '@/components/admin/UserTable/UsersTable';
import { Toaster } from '@/components/ui/sonner';
import db from '@/db';
import { profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

export default async function UsersPage() {
  // Get current user's company
  const currentUser = await stackServerApp.getUser({ or: 'throw' });
  const currentProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, currentUser.id),
  });

  if (!currentProfile?.companyId) {
    return <div>No company assigned to user</div>;
  }

  // Get all users from current user's company
  const companyProfiles = await db.query.profiles.findMany({
    where: eq(profiles.companyId, currentProfile.companyId),
  });

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
