-- Migration 042: platform admin agency management + trigger chain fix
--
-- 1. Fix issue #21: seed_default_column_schema must be SECURITY DEFINER so it
--    runs as postgres (BYPASSRLS) when called from the AFTER INSERT trigger on
--    agencies. Without this, GoTrue user creation fails because RLS checks fire
--    against a null auth.uid() context.

CREATE OR REPLACE FUNCTION public.seed_default_column_schema(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_column_schemas WHERE agency_id = p_agency_id
  ) THEN
    INSERT INTO public.agency_column_schemas (agency_id, version, columns, is_published, published_at)
    VALUES (p_agency_id, 1, public.default_campaign_columns(), true, now());
  END IF;
END;
$$;

-- 2. Platform admins can create new agencies
DROP POLICY IF EXISTS "Platform admins can create agencies" ON public.agencies;
CREATE POLICY "Platform admins can create agencies" ON public.agencies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- 3. Platform admins can delete agencies (needed for future cleanup)
DROP POLICY IF EXISTS "Platform admins can delete agencies" ON public.agencies;
CREATE POLICY "Platform admins can delete agencies" ON public.agencies
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- 4. Platform admins can manage agency_members (read/write for any agency)
DROP POLICY IF EXISTS "Platform admins can read all column schemas" ON public.agency_column_schemas;
CREATE POLICY "Platform admins can read all column schemas" ON public.agency_column_schemas
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 5. Platform admins can read all agency invitations (to see pending invites)
DROP POLICY IF EXISTS "Platform admins can read all invitations" ON public.agency_invitations;
CREATE POLICY "Platform admins can read all invitations" ON public.agency_invitations
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 6. Platform admins can create invitations on behalf of any agency
DROP POLICY IF EXISTS "Platform admins can create invitations" ON public.agency_invitations;
CREATE POLICY "Platform admins can create invitations" ON public.agency_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- 7. Platform admins can insert agency_members (to add users directly)
DROP POLICY IF EXISTS "Platform admins can add members" ON public.agency_members;
CREATE POLICY "Platform admins can add members" ON public.agency_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- 8. Platform admins can remove agency_members
DROP POLICY IF EXISTS "Platform admins can remove members" ON public.agency_members;
CREATE POLICY "Platform admins can remove members" ON public.agency_members
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());
