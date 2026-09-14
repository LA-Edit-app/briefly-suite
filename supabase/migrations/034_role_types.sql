-- Migration 034: Add Talent Manager and Creator roles
-- New roles: 'talent_manager' (manages campaigns/creators, no agency settings)
--            'creator' (read-only, own campaigns only)
-- Existing roles 'owner' and 'admin' map to the "Admin" profile.

-- 1. Widen the role check constraint
ALTER TABLE public.agency_members
  DROP CONSTRAINT IF EXISTS agency_members_role_check;

ALTER TABLE public.agency_members
  ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'admin', 'talent_manager', 'creator', 'member'));

-- 2. Helper: is current user a talent manager or higher?
CREATE OR REPLACE FUNCTION public.is_talent_manager_or_above()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('owner', 'admin', 'talent_manager')
     FROM   public.agency_members
     WHERE  agency_id = public.current_agency_id()
     AND    user_id   = auth.uid()),
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Update tasks RLS so talent managers and admins can see all tasks
DROP POLICY IF EXISTS "Tasks select" ON public.tasks;
CREATE POLICY "Tasks select" ON public.tasks
  FOR SELECT USING (
    agency_id = public.current_agency_id()
    AND (
      public.is_talent_manager_or_above()
      OR assigned_to = auth.uid()
      OR created_by  = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tasks update" ON public.tasks;
CREATE POLICY "Tasks update" ON public.tasks
  FOR UPDATE
  USING (
    agency_id = public.current_agency_id()
    AND (
      public.is_talent_manager_or_above()
      OR assigned_to = auth.uid()
      OR created_by  = auth.uid()
    )
  )
  WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "Tasks delete" ON public.tasks;
CREATE POLICY "Tasks delete" ON public.tasks
  FOR DELETE USING (
    agency_id = public.current_agency_id()
    AND (
      public.is_talent_manager_or_above()
      OR assigned_to = auth.uid()
      OR created_by  = auth.uid()
    )
  );
