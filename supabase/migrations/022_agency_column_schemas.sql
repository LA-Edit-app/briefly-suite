-- ============================================================
-- Migration 022: Dynamic agency column schemas for campaign tracker
-- ============================================================

-- 1. Add custom_fields to campaigns (for user-defined columns)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create agency_column_schemas table
CREATE TABLE agency_column_schemas (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id    uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  version      integer     NOT NULL,
  columns      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean     NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid        REFERENCES auth.users(id),
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  notes        text,
  UNIQUE (agency_id, version)
);

-- 3. Row-level security
ALTER TABLE agency_column_schemas ENABLE ROW LEVEL SECURITY;

-- Agency members can read their agency's schemas
CREATE POLICY "agency members can read column schemas"
  ON agency_column_schemas FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Agency admins/owners can insert new schemas
CREATE POLICY "agency admins can insert column schemas"
  ON agency_column_schemas FOR INSERT
  WITH CHECK (
    agency_id = public.current_agency_id() AND public.is_agency_admin()
  );

-- Agency admins/owners can update schemas
CREATE POLICY "agency admins can update column schemas"
  ON agency_column_schemas FOR UPDATE
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

-- Agency admins/owners can delete draft schemas
CREATE POLICY "agency admins can delete draft column schemas"
  ON agency_column_schemas FOR DELETE
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin() AND is_published = false);

-- 4. Default column set (mirrors the current hardcoded columns)
CREATE OR REPLACE FUNCTION default_campaign_columns()
RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT '[
  {"key":"brand",        "label":"Brand",          "type":"text",     "order":1,  "active":true, "required":true,  "width":"normal"},
  {"key":"launchDate",   "label":"Launch Date",     "type":"date",     "order":2,  "active":true, "required":false, "width":"compact"},
  {"key":"activity",     "label":"Activity",        "type":"text",     "order":3,  "active":true, "required":false, "width":"wide"},
  {"key":"liveDate",     "label":"Live Date",       "type":"date",     "order":4,  "active":true, "required":false, "width":"compact"},
  {"key":"agPrice",      "label":"AG Price",        "type":"currency", "order":5,  "active":true, "required":false, "width":"compact"},
  {"key":"creatorFee",   "label":"Creator Fee",     "type":"currency", "order":6,  "active":true, "required":false, "width":"compact"},
  {"key":"shot",         "label":"Shot",            "type":"text",     "order":7,  "active":true, "required":false, "width":"normal"},
  {"key":"complete",     "label":"Status",          "type":"select",   "order":8,  "active":true, "required":false, "width":"compact",
   "options":[{"value":"Pending","label":"Pending"},{"value":"Active","label":"Active"},{"value":"Completed","label":"Completed"}]},
  {"key":"detailStatus", "label":"Detail Status",   "type":"select",   "order":9,  "active":true, "required":false, "width":"normal",
   "options":[{"value":"","label":"None"},{"value":"Awaiting details","label":"Awaiting details"}]},
  {"key":"invoiceNo",    "label":"Invoice No",      "type":"text",     "order":10, "active":true, "required":false, "width":"normal"},
  {"key":"paid",         "label":"Paid",            "type":"select",   "order":11, "active":true, "required":false, "width":"compact",
   "options":[{"value":"CHASED","label":"CHASED"},{"value":"17 Oct","label":"17 Oct"},{"value":"OCT","label":"OCT"},{"value":"NOV","label":"NOV"},{"value":"DEC","label":"DEC"}]},
  {"key":"includesVat",  "label":"Includes VAT",    "type":"select",   "order":12, "active":true, "required":false, "width":"compact",
   "options":[{"value":"VAT","label":"VAT"},{"value":"NO VAT","label":"NO VAT"}]},
  {"key":"currency",     "label":"Currency",        "type":"select",   "order":13, "active":true, "required":false, "width":"compact",
   "options":[{"value":"GBP","label":"GBP"},{"value":"EUR","label":"EUR"}]},
  {"key":"brandPOs",     "label":"Brand POs",       "type":"text",     "order":14, "active":true, "required":false, "width":"normal"},
  {"key":"paymentTerms", "label":"Payment Terms",   "type":"text",     "order":15, "active":true, "required":false, "width":"normal"}
]'::jsonb;
$$;

-- 5. Seed v1 for a given agency (idempotent)
CREATE OR REPLACE FUNCTION seed_default_column_schema(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agency_column_schemas WHERE agency_id = p_agency_id
  ) THEN
    INSERT INTO agency_column_schemas (agency_id, version, columns, is_published, published_at)
    VALUES (p_agency_id, 1, default_campaign_columns(), true, now());
  END IF;
END;
$$;

-- 6. Auto-seed v1 when a new agency is created
CREATE OR REPLACE FUNCTION handle_new_agency_column_schema()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_default_column_schema(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_agency_seed_columns ON agencies;
CREATE TRIGGER on_new_agency_seed_columns
  AFTER INSERT ON agencies
  FOR EACH ROW EXECUTE FUNCTION handle_new_agency_column_schema();

-- 7. Backfill existing agencies that have no schema yet
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM agencies LOOP
    PERFORM seed_default_column_schema(r.id);
  END LOOP;
END;
$$;

-- 8. Helper: get published schema columns for an agency
CREATE OR REPLACE FUNCTION get_published_column_schema(p_agency_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (
      SELECT columns
      FROM agency_column_schemas
      WHERE agency_id = p_agency_id
        AND is_published = true
      ORDER BY version DESC
      LIMIT 1
    ),
    default_campaign_columns()
  );
$$;
