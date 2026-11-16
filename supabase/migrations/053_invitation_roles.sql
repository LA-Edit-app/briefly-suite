-- Agency Settings lets admins invite as Admin, Talent Manager, Creator or
-- Member, and agency_members accepts all of them. agency_invitations only
-- allowed admin/member, so inviting a new email as Talent Manager or Creator
-- failed. Allow the same invitable roles as the UI (owner is never invited).
ALTER TABLE public.agency_invitations
  DROP CONSTRAINT agency_invitations_role_check,
  ADD CONSTRAINT agency_invitations_role_check
    CHECK (role = ANY (ARRAY['admin', 'talent_manager', 'creator', 'member']));
