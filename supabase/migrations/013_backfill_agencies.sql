-- ============================================================
-- Migration 013: Backfill agencies for existing profiles
-- Users who signed up before migration 011 have profile rows
-- but no agency_id, which causes all their inserts to be
-- rejected by the new RLS policies.
-- ============================================================

-- For every profile that has no agency_id yet, create an agency
-- and link it back. Wraps everything in a single DO block so it
-- runs atomically.
DO $$
DECLARE
  rec           RECORD;
  new_agency_id UUID;
BEGIN
  FOR rec IN
    SELECT id, agency_name
    FROM   public.profiles
    WHERE  agency_id IS NULL
  LOOP
    INSERT INTO public.agencies (name, owner_id)
    VALUES (
      COALESCE(NULLIF(TRIM(rec.agency_name), ''), 'My Agency'),
      rec.id
    )
    RETURNING id INTO new_agency_id;

    UPDATE public.profiles
    SET    agency_id = new_agency_id
    WHERE  id = rec.id;
  END LOOP;
END;
$$;
