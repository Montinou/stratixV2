import { stackServerApp } from '@/stack/server';
import db from '@/db';
import { eq } from 'drizzle-orm';
import { InvitationForm } from './InvitationForm';
import { InvitationsTable } from './InvitationsTable';
import { InvitationStats } from './InvitationStats';

export default async function InvitationController() {
  // Get current user
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // Get user's profile to know their organization
  const profile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.id, user.id),
    with: {
      company: true,
    },
  });

  if (!profile || !profile.companyId || !profile.company) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Error</p>
        <p className="text-sm">User profile not found. Please complete your onboarding.</p>
      </div>
    );
  }

  // Check if user has permission to manage invitations
  const canManageInvitations = ['corporativo', 'gerente'].includes(profile.role);

  if (!canManageInvitations) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        <p className="font-semibold">Access Restricted</p>
        <p className="text-sm">
          Only Corporate Administrators and Managers can manage invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Dashboard */}
      <InvitationStats organizationId={profile.companyId} />

      {/* Invitation Form */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
          Invite Team Members
        </h2>
        <InvitationForm
          organizationId={profile.companyId}
          organizationName={profile.company.name}
        />
      </div>

      {/* Invitations Table */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
          Manage Invitations
        </h2>
        <InvitationsTable organizationId={profile.companyId} />
      </div>
    </div>
  );
}
