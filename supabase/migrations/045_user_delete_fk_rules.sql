-- Migration 045: let auth users be deleted
--
-- agency_column_schemas.published_by / created_by referenced auth.users with
-- no ON DELETE rule, so deleting any user who had ever published a column
-- schema failed. Keep the schema history, just drop the authorship link.

ALTER TABLE public.agency_column_schemas
  DROP CONSTRAINT IF EXISTS agency_column_schemas_published_by_fkey,
  ADD CONSTRAINT agency_column_schemas_published_by_fkey
    FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.agency_column_schemas
  DROP CONSTRAINT IF EXISTS agency_column_schemas_created_by_fkey,
  ADD CONSTRAINT agency_column_schemas_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
