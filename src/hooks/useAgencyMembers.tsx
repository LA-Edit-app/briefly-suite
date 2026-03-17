import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AgencyMemberRow = Database['public']['Tables']['agency_members']['Row'];
type AgencyRow = Database['public']['Tables']['agencies']['Row'];

export type AgencyMemberWithProfile = AgencyMemberRow & {
  profiles: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Current user's own profile row
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Current user's role within their agency
export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ['agency-role'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('current_user_agency_role');
      if (error) throw error;
      return data as string | null;
    },
  });
};

// Boolean: is the current user an owner or admin?
export const useIsAgencyAdmin = () => {
  return useQuery({
    queryKey: ['is-agency-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_agency_admin');
      if (error) throw error;
      return data as boolean;
    },
  });
};

// List all members of the current user's agency
export const useAgencyMembers = () => {
  return useQuery({
    queryKey: ['agency-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_members')
        .select('*, profiles(id, email, first_name, last_name, avatar_url)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AgencyMemberWithProfile[];
    },
  });
};

// Get the current user's agency details
export const useCurrentAgency = () => {
  return useQuery({
    queryKey: ['current-agency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.agency_id) return null;

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', profile.agency_id)
        .single();

      if (error) throw error;
      return data as AgencyRow;
    },
  });
};

// Update agency name
export const useUpdateAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('agencies')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-agency'] });
    },
  });
};

// Update a member's role
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      userId,
      role,
    }: {
      agencyId: string;
      userId: string;
      role: 'admin' | 'member';
    }) => {
      const { data, error } = await supabase
        .from('agency_members')
        .update({ role })
        .eq('agency_id', agencyId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-members'] });
    },
  });
};

// Remove a member from the agency
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      userId,
    }: {
      agencyId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('agency_members')
        .delete()
        .eq('agency_id', agencyId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-members'] });
    },
  });
};

// Invite a member by email — looks up their profile, then inserts into agency_members
export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      email,
      role = 'member',
    }: {
      agencyId: string;
      email: string;
      role?: 'admin' | 'member';
    }) => {
      const { data, error } = await supabase.functions.invoke('invite-member', {
        body: { agencyId, email, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { status: 'added' | 'invited' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-members'] });
    },
  });
};
