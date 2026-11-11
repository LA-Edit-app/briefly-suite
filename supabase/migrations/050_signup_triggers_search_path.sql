-- Supabase Auth runs the new-user triggers with search_path = auth, so the
-- unqualified call to seed_default_column_schema() in
-- handle_new_agency_column_schema() failed ("function does not exist") for
-- every new user who gets their own agency. Pin search_path on all three
-- functions in the signup chain.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_new_profile_agency() SET search_path = public;
ALTER FUNCTION public.handle_new_agency_column_schema() SET search_path = public;
