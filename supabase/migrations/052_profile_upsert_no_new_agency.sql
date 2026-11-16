-- Issue #42: saving profile settings created a new agency for the user.
-- The app saved the profile with an upsert (INSERT ... ON CONFLICT DO UPDATE).
-- Postgres fires BEFORE INSERT triggers before it detects the conflict, so
-- handle_new_profile_agency() ran for an existing profile. The user's invite
-- was already accepted, so it fell through to "create their own agency".
--
-- Fix: the trigger now does nothing when the profile already exists.

CREATE OR REPLACE FUNCTION public.handle_new_profile_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_agency_id    UUID;
  pending_invite   RECORD;
BEGIN
  -- An upsert of an existing profile still fires this trigger. Skip it.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

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
$$;

-- Remove the agencies the bug already created: owned by a user whose profile
-- belongs to a different agency, and holding no data. Their seeded column
-- schema and owner membership are removed by ON DELETE CASCADE.
DELETE FROM public.agencies a
USING public.profiles p
WHERE p.id = a.owner_id
  AND p.agency_id IS NOT NULL
  AND p.agency_id <> a.id
  AND NOT EXISTS (SELECT 1 FROM public.profiles x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.campaigns x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.content_items x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.creators x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.tasks x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.custom_events x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.notifications x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.xero_connections x WHERE x.agency_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.agency_invitations x WHERE x.agency_id = a.id);
