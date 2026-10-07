-- Migration 037: timestamped comments on campaigns (issue #7)
-- Stored as a JSONB array on the campaign row.
-- Each element: {id, text, author_name, author_id, created_at}

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS campaign_comments JSONB NOT NULL DEFAULT '[]';
