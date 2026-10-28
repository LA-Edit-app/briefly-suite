-- Migration 038: campaign file attachments (issue #13)
-- Attachments are stored as a JSONB array on the campaign row.
-- Each element: { id, fileName, storagePath, mimeType, sizeBytes,
--                 comment?, contentType?, uploadedById, uploadedByName, uploadedAt }
-- storagePath is the path WITHIN the bucket (no full URL) so we can swap
-- storage providers without touching data.

-- 1. New column on campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS campaign_attachments JSONB NOT NULL DEFAULT '[]';

-- 2. Private bucket for campaign files: 10 MB max.
--    Accepted: PDF, Word, PNG, JPEG, WEBP.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-attachments',
  'campaign-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: any agency member can read/upload/delete within their agency folder.
--    Path structure: campaign-attachments/<agency_id>/<campaign_id>/<uuid>.<ext>
--    current_agency_id() returns NULL for non-members, so the folder check is also
--    an implicit membership gate.

DROP POLICY IF EXISTS "Agency members can read campaign attachments" ON storage.objects;
CREATE POLICY "Agency members can read campaign attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'campaign-attachments'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
  );

DROP POLICY IF EXISTS "Agency members can upload campaign attachments" ON storage.objects;
CREATE POLICY "Agency members can upload campaign attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-attachments'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
  );

DROP POLICY IF EXISTS "Agency members can delete campaign attachments" ON storage.objects;
CREATE POLICY "Agency members can delete campaign attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-attachments'
    AND (storage.foldername(name))[1] = public.current_agency_id()::text
  );
