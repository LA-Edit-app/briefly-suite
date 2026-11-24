-- Issue #52: three agency roles, one agency per account, unique agency names.
--
--   admin          runs the agency (replaces "owner"; an agency can have several)
--   talent_manager manages creators and campaigns (replaces "member")
--   creator        the talent; sees only their own campaigns
--
-- Rules enforced here:
--   * every member has one of the three roles
--   * an account belongs to exactly one agency (one email = one agency)
--   * agency names are unique, ignoring case and surrounding spaces
--   * an agency that still has people in it always keeps at least one admin
--   * self sign-ups must name their agency

-- 1. One agency per account: drop the memberships that don't match the
--    agency the account actually uses (profiles.agency_id). The app only ever
--    showed that one, so these rows had no effect.
DELETE FROM public.agency_members m
USING public.profiles p
WHERE p.id = m.user_id
  AND p.agency_id IS NOT NULL
  AND m.agency_id <> p.agency_id;

-- 2. Map the old roles.
ALTER TABLE public.agency_members DROP CONSTRAINT agency_members_role_check;
ALTER TABLE public.agency_invitations DROP CONSTRAINT agency_invitations_role_check;

UPDATE public.agency_members SET role = 'admin' WHERE role = 'owner';
UPDATE public.agency_members SET role = 'talent_manager' WHERE role = 'member';
UPDATE public.agency_invitations SET role = 'admin' WHERE role = 'owner';
UPDATE public.agency_invitations SET role = 'talent_manager' WHERE role = 'member';

ALTER TABLE public.agency_members
  ALTER COLUMN role SET DEFAULT 'talent_manager',
  ADD CONSTRAINT agency_members_role_check
    CHECK (role IN ('admin', 'talent_manager', 'creator'));
ALTER TABLE public.agency_invitations
  ALTER COLUMN role SET DEFAULT 'talent_manager',
  ADD CONSTRAINT agency_invitations_role_check
    CHECK (role IN ('admin', 'talent_manager', 'creator'));

-- Older clients may still send "owner" or "member"; store them as the new
-- roles instead of rejecting the write.
CREATE OR REPLACE FUNCTION public.map_legacy_agency_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    NEW.role := 'admin';
  ELSIF NEW.role = 'member' THEN
    NEW.role := 'talent_manager';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agency_members_map_legacy_role
  BEFORE INSERT OR UPDATE OF role ON public.agency_members
  FOR EACH ROW EXECUTE FUNCTION public.map_legacy_agency_role();
CREATE TRIGGER agency_invitations_map_legacy_role
  BEFORE INSERT OR UPDATE OF role ON public.agency_invitations
  FOR EACH ROW EXECUTE FUNCTION public.map_legacy_agency_role();

-- 3. One agency per account.
DROP INDEX IF EXISTS public.idx_agency_members_user_id;
CREATE UNIQUE INDEX agency_members_one_agency_per_user ON public.agency_members (user_id);

-- 4. Unique agency names.
CREATE UNIQUE INDEX agencies_name_unique ON public.agencies (lower(btrim(name)));

-- For the sign-up form, before an account exists. Only answers yes/no.
CREATE OR REPLACE FUNCTION public.agency_name_available(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(btrim(p_name), '') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.agencies WHERE lower(btrim(name)) = lower(btrim(p_name)));
$$;
REVOKE EXECUTE ON FUNCTION public.agency_name_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_name_available(text) TO anon, authenticated;

-- 5. Keep at least one admin while an agency has people in it.
--    Allowed: removing everyone (an agency may have no users), deleting the
--    agency (cascade), and deleting the account itself.
CREATE OR REPLACE FUNCTION public.keep_one_agency_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role <> 'admin' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;
  -- Agency or account being deleted: nothing to protect.
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = OLD.agency_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF NOT EXISTS (
       SELECT 1 FROM public.agency_members
       WHERE agency_id = OLD.agency_id AND user_id <> OLD.user_id AND role = 'admin')
     AND EXISTS (
       SELECT 1 FROM public.agency_members
       WHERE agency_id = OLD.agency_id AND user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'An agency must keep at least one Admin. Make someone else Admin first.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER agency_members_keep_one_admin
  BEFORE UPDATE OF role OR DELETE ON public.agency_members
  FOR EACH ROW EXECUTE FUNCTION public.keep_one_agency_admin();

-- 6. Role helpers and Platform Admin RPCs.
CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin'
     FROM   public.agency_members
     WHERE  agency_id = public.current_agency_id()
     AND    user_id   = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_talent_manager_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'talent_manager')
     FROM   public.agency_members
     WHERE  agency_id = public.current_agency_id()
     AND    user_id   = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_update_member(
  p_agency_id uuid, p_user_id uuid, p_role text, p_first_name text, p_last_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can edit members';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agency_members WHERE agency_id = p_agency_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'User is not a member of this agency';
  END IF;
  IF p_role NOT IN ('admin', 'talent_manager', 'creator') THEN
    RAISE EXCEPTION 'Role must be Admin, Talent Manager or Creator';
  END IF;

  UPDATE public.agency_members
  SET role = p_role
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  UPDATE public.profiles
  SET first_name = NULLIF(trim(p_first_name), ''),
      last_name  = NULLIF(trim(p_last_name), '')
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_remove_member(p_agency_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can remove members';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agency_members WHERE agency_id = p_agency_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'User is not a member of this agency';
  END IF;

  DELETE FROM public.agency_members
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  UPDATE public.profiles
  SET agency_id = NULL
  WHERE id = p_user_id AND agency_id = p_agency_id;
END;
$$;

-- Agency admins can remove anyone in their agency except themselves
-- (the last-admin rule above still applies).
DROP POLICY "Admins can remove members" ON public.agency_members;
CREATE POLICY "Admins can remove members" ON public.agency_members
  FOR DELETE USING (agency_id = public.current_agency_id() AND public.is_agency_admin() AND user_id <> auth.uid());

-- 7. Sign-up: copy the agency name the person typed, and require one.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, agency_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NULLIF(btrim(NEW.raw_user_meta_data->>'agency_name'), ''), NOW(), NOW());
  RETURN NEW;
END;
$$;

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
  -- An upsert of an existing profile still fires this trigger. Skip it (#42).
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

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
    -- Invited: join that agency with the invited role.
    NEW.agency_id := pending_invite.agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (pending_invite.agency_id, NEW.id, pending_invite.role)
    ON CONFLICT (agency_id, user_id) DO NOTHING;

    UPDATE public.agency_invitations
    SET    accepted_at = NOW()
    WHERE  id = pending_invite.id;

  ELSIF NEW.agency_id IS NULL THEN
    -- Self sign-up: create the agency they named and make them its admin.
    IF NULLIF(btrim(NEW.agency_name), '') IS NULL THEN
      RAISE EXCEPTION 'An agency name is required to sign up';
    END IF;

    INSERT INTO public.agencies (name, owner_id)
    VALUES (btrim(NEW.agency_name), NEW.id)
    RETURNING id INTO new_agency_id;

    NEW.agency_id := new_agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (new_agency_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;
