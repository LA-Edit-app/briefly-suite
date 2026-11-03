-- Migration 040: platform admin role (issue #16)
-- Allows Briefly staff to view and manage all agencies (tenants)
-- without impersonating individual users.

-- 1. Flag on profiles — set manually per Briefly staff member
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Status flag on agencies — platform admins can suspend tenants
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Security-definer helper (avoids repeated profile lookups in policies)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 4. RLS: platform admins can read and update ALL agencies
DROP POLICY IF EXISTS "Platform admins can read all agencies" ON public.agencies;
CREATE POLICY "Platform admins can read all agencies" ON public.agencies
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update all agencies" ON public.agencies;
CREATE POLICY "Platform admins can update all agencies" ON public.agencies
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 5. RLS: platform admins can read ALL agency_members
DROP POLICY IF EXISTS "Platform admins can read all agency members" ON public.agency_members;
CREATE POLICY "Platform admins can read all agency members" ON public.agency_members
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 6. RLS: platform admins can read ALL campaigns
DROP POLICY IF EXISTS "Platform admins can read all campaigns" ON public.campaigns;
CREATE POLICY "Platform admins can read all campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 7. RLS: platform admins can read ALL profiles (to display owner info)
DROP POLICY IF EXISTS "Platform admins can read all profiles" ON public.profiles;
CREATE POLICY "Platform admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Note: enforcing is_active (blocking suspended agency members from logging in)
-- is intentionally deferred. The flag is stored here so the UI can show status;
-- access enforcement will be added in a follow-up migration once the suspension
-- flow is fully designed.
