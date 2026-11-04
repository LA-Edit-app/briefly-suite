-- Migration 044: platform admin edit/remove agency members
--
-- Done via SECURITY DEFINER RPCs rather than table policies because both
-- operations must also touch public.profiles (name edits, and clearing
-- profiles.agency_id on removal — current_agency_id() reads it, so a removed
-- member would otherwise keep access to the agency's data).

CREATE OR REPLACE FUNCTION public.platform_admin_update_member(
  p_agency_id  uuid,
  p_user_id    uuid,
  p_role       text,
  p_first_name text,
  p_last_name  text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can edit members';
  END IF;

  SELECT role INTO v_current_role
  FROM public.agency_members
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this agency';
  END IF;

  IF v_current_role = 'owner' THEN
    IF p_role <> 'owner' THEN
      RAISE EXCEPTION 'The agency owner''s role cannot be changed';
    END IF;
  ELSIF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Role must be admin or member';
  END IF;

  UPDATE public.agency_members
  SET role = p_role
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  UPDATE public.profiles
  SET first_name = NULLIF(trim(p_first_name), ''),
      last_name  = NULLIF(trim(p_last_name), '')
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_remove_member(
  p_agency_id uuid,
  p_user_id   uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can remove members';
  END IF;

  SELECT role INTO v_current_role
  FROM public.agency_members
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this agency';
  END IF;

  IF v_current_role = 'owner' THEN
    RAISE EXCEPTION 'The agency owner cannot be removed';
  END IF;

  DELETE FROM public.agency_members
  WHERE agency_id = p_agency_id AND user_id = p_user_id;

  UPDATE public.profiles
  SET agency_id = NULL
  WHERE id = p_user_id AND agency_id = p_agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_admin_update_member(uuid, uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.platform_admin_remove_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_admin_update_member(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_remove_member(uuid, uuid) TO authenticated;
