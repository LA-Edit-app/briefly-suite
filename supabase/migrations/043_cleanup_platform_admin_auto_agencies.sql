-- Migration 043: remove auto-created agencies that belong to platform admins
--
-- When platform admin accounts were created via SQL, the handle_new_user /
-- handle_new_agency trigger chain ran automatically and created one agency per
-- account. These are placeholder agencies with no real data. This migration
-- removes them and clears the agency_id on the platform admin profiles.
--
-- Safety: only agencies are deleted if they satisfy ALL of the following:
--   · their owner is a platform admin
--   · they have no members who are NOT platform admins
--   · they have no campaigns

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id AS agency_id
    FROM public.agencies a
    JOIN public.profiles owner ON owner.id = a.owner_id
    WHERE owner.is_platform_admin = true
      -- no non-platform-admin members
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_members am
        JOIN public.profiles mp ON mp.id = am.user_id
        WHERE am.agency_id = a.id
          AND mp.is_platform_admin = false
      )
      -- no campaigns
      AND NOT EXISTS (
        SELECT 1 FROM public.campaigns c WHERE c.agency_id = a.id
      )
  LOOP
    -- Remove related records first (FK order)
    DELETE FROM public.agency_members WHERE agency_id = r.agency_id;
    DELETE FROM public.agency_column_schemas WHERE agency_id = r.agency_id;
    DELETE FROM public.agency_invitations WHERE agency_id = r.agency_id;
    DELETE FROM public.agencies WHERE id = r.agency_id;
  END LOOP;

  -- Clear agency_id on platform admin profiles
  UPDATE public.profiles
  SET agency_id = NULL
  WHERE is_platform_admin = true
    AND agency_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.agencies a WHERE a.id = profiles.agency_id
    );
END;
$$;
