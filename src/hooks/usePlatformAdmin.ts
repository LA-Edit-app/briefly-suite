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

export type AgencyMemberRow = {
  user_id: string;
  role: string;
  created_at: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
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

export function useAgencyMembers(agencyId: string | null) {
  return useQuery({
    queryKey: ["platform-admin", "agency-members", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_members")
        .select(`
          user_id, role, created_at,
          profile:profiles!agency_members_user_id_fkey (
            first_name, last_name, email, avatar_url
          )
        `)
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : (m.profile ?? null),
      })) as AgencyMemberRow[];
    },
  });
}

export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { data, error } = await supabase
        .from("agencies")
        .insert({ name: name.trim() })
        .select("id, name, is_active, created_at, owner_id, logo_url")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "agencies"] });
    },
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("agencies")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "agencies"] });
    },
  });
}

export function useAdminCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      email,
      firstName,
      lastName,
      role,
    }: {
      agencyId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: "admin" | "member";
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { agencyId, email, firstName, lastName, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ...(data as { status: "added" | "invited" }), agencyId };
    },
    onSuccess: ({ agencyId }) => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "agency-members", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "agencies"] });
    },
  });
}
