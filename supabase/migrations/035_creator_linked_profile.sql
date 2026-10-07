-- Migration 035: Link creator users to a creator profile + read-only RLS
-- A user with role='creator' in agency_members can be linked to a specific
-- creator row so they see only that creator's campaigns (read-only).

-- 1. Add linked_creator_id to agency_members
ALTER TABLE public.agency_members
  ADD COLUMN IF NOT EXISTS linked_creator_id UUID
    REFERENCES public.creators(id) ON DELETE SET NULL;

-- 2. Helper: return the creator_id linked to the current user (NULL if not a creator)
CREATE OR REPLACE FUNCTION public.current_user_linked_creator_id()
RETURNS UUID AS $$
  SELECT linked_creator_id
  FROM   public.agency_members
  WHERE  agency_id = public.current_agency_id()
  AND    user_id   = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Split the single FOR-ALL campaigns policy into separate SELECT / write policies
--    so creator users get scoped read-only access.

DROP POLICY IF EXISTS "Agency isolation on campaigns" ON public.campaigns;

-- SELECT: talent managers and above see all agency campaigns;
--         creator users see only campaigns for their linked creator.
CREATE POLICY "Campaigns select" ON public.campaigns
  FOR SELECT USING (
    agency_id = public.current_agency_id()
    AND (
      public.current_user_agency_role() != 'creator'
      OR creator_id = public.current_user_linked_creator_id()
    )
  );

-- INSERT / UPDATE / DELETE: creators are read-only at the DB level.
CREATE POLICY "Campaigns insert" ON public.campaigns
  FOR INSERT WITH CHECK (
    agency_id = public.current_agency_id()
    AND public.current_user_agency_role() != 'creator'
  );

CREATE POLICY "Campaigns update" ON public.campaigns
  FOR UPDATE
  USING (
    agency_id = public.current_agency_id()
    AND public.current_user_agency_role() != 'creator'
  )
  WITH CHECK (agency_id = public.current_agency_id());

CREATE POLICY "Campaigns delete" ON public.campaigns
  FOR DELETE USING (
    agency_id = public.current_agency_id()
    AND public.current_user_agency_role() != 'creator'
  );
