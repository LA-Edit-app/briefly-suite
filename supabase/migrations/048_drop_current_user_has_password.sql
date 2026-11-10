-- 047 turned out not to work: GoTrue gives invited users a random password,
-- so encrypted_password is never empty. The app uses a needs_password flag in
-- the invite metadata instead.
DROP FUNCTION IF EXISTS public.current_user_has_password();
