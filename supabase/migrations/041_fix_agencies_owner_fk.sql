-- Migration 041: fix agencies.owner_id FK to reference profiles (issue #22)
-- The original FK pointed to auth.users, which prevents PostgREST from resolving
-- the embedded select `owner:profiles!agencies_owner_id_fkey` in useAllAgencies.
-- All existing owner_id values have corresponding profile records (verified).

ALTER TABLE public.agencies
  DROP CONSTRAINT agencies_owner_id_fkey,
  ADD CONSTRAINT agencies_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
