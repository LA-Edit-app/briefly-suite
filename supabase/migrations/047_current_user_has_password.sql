-- Invited users are signed in by the invite link without ever choosing a
-- password (GoTrue stores an empty encrypted_password for them). The app uses
-- this to send them to the "Create your password" screen first.
CREATE OR REPLACE FUNCTION public.current_user_has_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(u.encrypted_password, '') <> ''
  FROM auth.users u
  WHERE u.id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_password() TO authenticated;
