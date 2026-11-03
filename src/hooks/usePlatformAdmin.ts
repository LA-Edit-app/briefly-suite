import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useDatabase";

export type AgencyRow = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string | null;
  owner_id: string | null;
  logo_url: string | null;
  owner: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  member_count: number;
  campaign_count: number;
};

export function useIsPlatformAdmin() {
  const { data: profile } = useProfile();
  return profile?.is_platform_admin ?? false;
}

export function useAllAgencies() {
  return useQuery({
    queryKey: ["platform-admin", "agencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select(`
          id, name, is_active, created_at, owner_id, logo_url,
          owner:profiles!agencies_owner_id_fkey (id, first_name, last_name, email),
          agency_members (user_id),
          campaigns (id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        is_active: a.is_active,
        created_at: a.created_at,
        owner_id: a.owner_id,
        logo_url: a.logo_url,
        owner: Array.isArray(a.owner) ? (a.owner[0] ?? null) : (a.owner ?? null),
        member_count: Array.isArray(a.agency_members) ? a.agency_members.length : 0,
        campaign_count: Array.isArray(a.campaigns) ? a.campaigns.length : 0,
      })) as AgencyRow[];
    },
  });
}

export function useToggleAgencyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("agencies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "agencies"] });
    },
  });
}
