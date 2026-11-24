-- Every user belongs to an agency (#52). Taking someone out of an agency now
-- means deleting their account (admin-delete-user), so nothing may delete a
-- membership on its own and leave an account with no agency.
-- Account and agency deletions still remove memberships by cascade.
DROP POLICY IF EXISTS "Admins can remove members" ON public.agency_members;
DROP POLICY IF EXISTS "Platform admins can remove members" ON public.agency_members;
DROP FUNCTION IF EXISTS public.platform_admin_remove_member(uuid, uuid);
