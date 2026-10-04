import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AGENCY_LOGO_BUCKET, buildLogoPath, logoPathFromUrl } from '@/lib/agencyLogo';

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

// For creator-role users: the creator profile they are linked to
export const useLinkedCreatorId = () => {
  return useQuery({
    queryKey: ['linked-creator-id'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('current_user_linked_creator_id');
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

// Upload a new agency logo, point the agency at it, then clean up the old file
export const useUploadAgencyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agency, file }: { agency: AgencyRow; file: File }) => {
      const bucket = supabase.storage.from(AGENCY_LOGO_BUCKET);
      const path = buildLogoPath(agency.id, file);

      const { error: uploadError } = await bucket.upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = bucket.getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: publicUrl })
        .eq('id', agency.id)
        .select()
        .single();

      if (updateError) {
        // Don't leave an orphaned file behind if the agency wasn't updated
        await bucket.remove([path]);
        throw updateError;
      }

      // Best-effort: the new logo is already live, so a failed cleanup is harmless
      const oldPath = logoPathFromUrl(agency.logo_url);
      if (oldPath) await bucket.remove([oldPath]);

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-agency'] });
    },
  });
};

// Remove the agency logo, reverting to the default Briefly logo
export const useRemoveAgencyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agency }: { agency: AgencyRow }) => {
      const { error } = await supabase
        .from('agencies')
        .update({ logo_url: null })
        .eq('id', agency.id)
        .select()
        .single();

      if (error) throw error;

      // Best-effort cleanup, as above
      const path = logoPathFromUrl(agency.logo_url);
      if (path) await supabase.storage.from(AGENCY_LOGO_BUCKET).remove([path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-agency'] });
    },
  });
};

// Update a member's role (and optionally link to a creator profile)
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      userId,
      role,
      linkedCreatorId,
    }: {
      agencyId: string;
      userId: string;
      role: 'owner' | 'admin' | 'talent_manager' | 'creator' | 'member';
      linkedCreatorId?: string | null;
    }) => {
      const update: Record<string, unknown> = { role };
      if (linkedCreatorId !== undefined) update.linked_creator_id = linkedCreatorId;

      const { data, error } = await supabase
        .from('agency_members')
        .update(update)
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
