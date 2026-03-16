-- ============================================================
-- Migration 016: Agency members table + role management
-- Introduces per-agency roles: 'owner' | 'admin' | 'member'
-- ============================================================

-- 1. Create agency_members junction table
CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id   UUID  REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id     UUID  REFERENCES auth.users(id)      ON DELETE CASCADE,
  role        TEXT  NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON public.agency_members(user_id);

ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- 2. Helper: return current user's role within their agency
--    (defined BEFORE policies that call it)
CREATE OR REPLACE FUNCTION public.current_user_agency_role()
RETURNS TEXT AS $$
  SELECT role
  FROM   public.agency_members
  WHERE  agency_id = public.current_agency_id()
  AND    user_id   = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Helper: true if current user is owner or admin of their agency
--    (defined BEFORE policies that call it)
CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('owner', 'admin')
     FROM   public.agency_members
     WHERE  agency_id = public.current_agency_id()
     AND    user_id   = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. RLS policies (now that helper functions exist)

-- Members can see other members of their own agency
CREATE POLICY "Members can view agency roster" ON public.agency_members
  FOR SELECT USING (agency_id = public.current_agency_id());

-- Only owners/admins can insert (invite) new members
CREATE POLICY "Admins can add members" ON public.agency_members
  FOR INSERT WITH CHECK (
    agency_id = public.current_agency_id()
    AND public.is_agency_admin()
  );

-- Only owners/admins can update roles
CREATE POLICY "Admins can update roles" ON public.agency_members
  FOR UPDATE USING (
    agency_id = public.current_agency_id()
    AND public.is_agency_admin()
  );

-- Only owners/admins can remove members (owners cannot be removed this way)
CREATE POLICY "Admins can remove members" ON public.agency_members
  FOR DELETE USING (
    agency_id = public.current_agency_id()
    AND public.is_agency_admin()
    AND role <> 'owner'
  );

-- 5. Allow admins/owners to update the agency name
DROP POLICY IF EXISTS "Owner can update own agency" ON public.agencies;
CREATE POLICY "Admins can update agency" ON public.agencies
  FOR UPDATE
  USING     (id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (id = public.current_agency_id() AND public.is_agency_admin());

-- 6. Backfill: create agency_members rows for every existing profile
--    using the agencies.owner_id as the 'owner' role.
INSERT INTO public.agency_members (agency_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM   public.agencies
WHERE  owner_id IS NOT NULL
ON CONFLICT (agency_id, user_id) DO NOTHING;

-- 7. Update the profile trigger so new signups also get an owner row in agency_members
CREATE OR REPLACE FUNCTION public.handle_new_profile_agency()
RETURNS TRIGGER AS $$
DECLARE
  new_agency_id UUID;
BEGIN
  IF NEW.agency_id IS NULL THEN
    INSERT INTO public.agencies (name, owner_id)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.agency_name), ''), 'My Agency'),
      NEW.id
    )
    RETURNING id INTO new_agency_id;

    NEW.agency_id := new_agency_id;

    -- Register as owner in agency_members
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (new_agency_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
