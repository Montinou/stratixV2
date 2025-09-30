-- Migration: Add onboarding sessions and organization invitations
-- Purpose: Enable multi-tenant onboarding with invitation system
-- Date: 2025-09-30

-- ========================================
-- 1. Organization Invitations Table
-- ========================================
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'empleado',
  organization_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by text NOT NULL REFERENCES neon_auth.users_sync(id),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  expires_at timestamp NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_invitations_email_idx ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS org_invitations_token_idx ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS org_invitations_org_idx ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS org_invitations_status_idx ON organization_invitations(status);

-- ========================================
-- 2. Onboarding Sessions Table
-- ========================================
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  current_step text NOT NULL, -- 'create_org', 'accept_invite', 'complete_profile'
  partial_data jsonb DEFAULT '{}',
  invitation_token text,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  last_activity timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_user_idx ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS onboarding_status_idx ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS onboarding_token_idx ON onboarding_sessions(invitation_token);
CREATE INDEX IF NOT EXISTS onboarding_last_activity_idx ON onboarding_sessions(last_activity);

-- ========================================
-- 3. Trigger to update updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_org_invitations_updated_at BEFORE UPDATE ON organization_invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. Cleanup function for expired invitations
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. Cleanup function for abandoned sessions
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS void AS $$
BEGIN
  UPDATE onboarding_sessions
  SET status = 'abandoned'
  WHERE status = 'in_progress'
  AND last_activity < (now() - interval '7 days');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE organization_invitations IS 'Tracks tenant-specific invitations for users to join organizations';
COMMENT ON TABLE onboarding_sessions IS 'Tracks user onboarding progress to allow resumption after interruption';
COMMENT ON COLUMN organization_invitations.token IS 'Unique token used in invitation URL';
COMMENT ON COLUMN organization_invitations.role IS 'Role user will have in organization upon acceptance';
COMMENT ON COLUMN onboarding_sessions.partial_data IS 'JSON blob storing form draft data';
COMMENT ON COLUMN onboarding_sessions.current_step IS 'Last step user was on before interruption';
