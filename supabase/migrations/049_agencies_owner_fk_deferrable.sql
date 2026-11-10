-- Migration 041 pointed agencies.owner_id at profiles(id), but
-- handle_new_profile_agency() (a BEFORE INSERT trigger on profiles) creates the
-- user's agency before their profile row exists. The immediate FK check then
-- fails, so every new user without a pending invitation (self sign-up,
-- invite links made without an agency_invitations row) could not be created.
-- Same fix as 019: check the FK at the end of the transaction instead.
ALTER TABLE public.agencies
  DROP CONSTRAINT agencies_owner_id_fkey,
  ADD CONSTRAINT agencies_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
