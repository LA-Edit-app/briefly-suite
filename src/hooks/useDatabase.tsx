import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db as supabase } from '@/lib/db';
import type { Platform, PlatformInsert, Profile, ProfileUpdate } from '@/lib/db';

// Get all platforms
export const usePlatforms = () => {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Platform[];
    },
  });
};

// Get a single platform
export const usePlatform = (platformId: string | undefined) => {
  return useQuery({
    queryKey: ['platform', platformId],
    queryFn: async () => {
      if (!platformId) throw new Error('Platform ID is required');

      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('id', platformId)
        .single();

      if (error) throw error;
      return data as Platform;
    },
    enabled: !!platformId,
  });
};

// Create a new platform
export const useCreatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: PlatformInsert) => {
      const { data, error } = await supabase
        .from('platforms')
        .insert(platform)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });
};

// Get current user's agency_id (cached — same query key as profile)
export const useAgencyId = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    select: (profile) => profile?.agency_id ?? null,
  });
};

// Get current user's profile
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
  });
};

// Update current user's profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Plain update: the profile row is created at sign-up. An upsert would
      // fire the new-profile trigger and create a stray agency (#42).
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// Get profile by ID (for viewing other users)
export const useProfileById = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
};
