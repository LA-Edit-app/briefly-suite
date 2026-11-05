-- Migration 046: platform admin user directory
--
-- Account status (suspended / invited) lives in auth.users, which the client
-- cannot read. This SECURITY DEFINER function exposes just the fields the
-- Users tab needs, to platform admins only.

CREATE OR REPLACE FUNCTION public.platform_admin_list_users()
RETURNS TABLE (
  id                uuid,
  email             text,
  first_name        text,
  last_name         text,
  is_platform_admin boolean,
  status            text,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  agencies          jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.first_name,
    p.last_name,
    COALESCE(p.is_platform_admin, false),
    CASE
      WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'suspended'
      WHEN u.email_confirmed_at IS NULL THEN 'invited'
      ELSE 'active'
    END,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'role', am.role) ORDER BY a.name)
       FROM public.agency_members am
       JOIN public.agencies a ON a.id = am.agency_id
       WHERE am.user_id = u.id),
      '[]'::jsonb
    )
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_admin_list_users() TO authenticated;
