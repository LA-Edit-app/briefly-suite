-- 1. Create agency_invitations table to track pending invites
CREATE TABLE IF NOT EXISTS public.agency_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agency_invitations_email ON public.agency_invitations(LOWER(email));

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins of the agency can view invitations
CREATE POLICY "Admins can view invitations" ON public.agency_invitations
  FOR SELECT USING (agency_id = public.current_agency_id() AND public.is_agency_admin());

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON public.agency_invitations
  FOR INSERT WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

-- 2. Update handle_new_profile_agency to check for a pending invitation
--    so invited users join the invited agency instead of creating a new one.
CREATE OR REPLACE FUNCTION public.handle_new_profile_agency()
RETURNS TRIGGER AS $$
DECLARE
  new_agency_id    UUID;
  pending_invite   RECORD;
BEGIN
  -- Check for a pending invitation matching this email
  IF NEW.email IS NOT NULL THEN
    SELECT *
    INTO   pending_invite
    FROM   public.agency_invitations
    WHERE  LOWER(email) = LOWER(NEW.email)
      AND  accepted_at IS NULL
    ORDER BY created_at DESC
    LIMIT  1;
  END IF;

  IF pending_invite.id IS NOT NULL THEN
    -- Invited user: join the invited agency
    NEW.agency_id := pending_invite.agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (pending_invite.agency_id, NEW.id, pending_invite.role)
    ON CONFLICT (agency_id, user_id) DO NOTHING;

    -- Mark the invitation as accepted
    UPDATE public.agency_invitations
    SET    accepted_at = NOW()
    WHERE  id = pending_invite.id;

  ELSIF NEW.agency_id IS NULL THEN
    -- New user with no invitation: create their own agency
    INSERT INTO public.agencies (name, owner_id)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.agency_name), ''), 'My Agency'),
      NEW.id
    )
    RETURNING id INTO new_agency_id;

    NEW.agency_id := new_agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (new_agency_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
