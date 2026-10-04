-- ============================================================
-- Migration 035: Agency logos (issue #8)
-- Each agency can upload a logo shown in the app sidebar.
-- NULL logo_url = show the default Briefly logo.
-- ============================================================

-- 1. Logo link on the agency (public URL of the file in the agency-logos bucket)
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Public bucket for logos: 5 MB max, raster images only.
--    SVG is deliberately excluded — it can carry script.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-logos',
  'agency-logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Only owners/admins may manage files, and only inside their own
--    agency's folder: agency-logos/<agency_id>/...
--    Public viewing goes through the bucket's public URL, so no wider SELECT is needed.
DROP POLICY IF EXISTS "Agency admins can read own logos" ON storage.objects;
CREATE POLICY "Agency admins can read own logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
    AND public.is_agency_admin()
  );

DROP POLICY IF EXISTS "Agency admins can upload own logos" ON storage.objects;
CREATE POLICY "Agency admins can upload own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
    AND public.is_agency_admin()
  );

DROP POLICY IF EXISTS "Agency admins can update own logos" ON storage.objects;
CREATE POLICY "Agency admins can update own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
    AND public.is_agency_admin()
  )
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
    AND public.is_agency_admin()
  );

DROP POLICY IF EXISTS "Agency admins can delete own logos" ON storage.objects;
CREATE POLICY "Agency admins can delete own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
    AND public.is_agency_admin()
  );

-- Note: updating agencies.logo_url is already covered by the
-- "Admins can update agency" policy from migration 016.
