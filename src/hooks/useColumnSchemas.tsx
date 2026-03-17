import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyId } from './useDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'boolean';
export type ColumnWidth = 'compact' | 'normal' | 'wide';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  order: number;
  active: boolean;
  required?: boolean;
  width?: ColumnWidth;
  options?: SelectOption[]; // for type=select
}

export interface ColumnSchema {
  id: string;
  agency_id: string;
  version: number;
  columns: ColumnDefinition[];
  is_published: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

// System-managed keys that always exist in the DB as real columns.
// Custom keys (not in this set) are stored in campaigns.custom_fields jsonb.
export const SYSTEM_COLUMN_KEYS = new Set([
  'brand', 'launchDate', 'activity', 'liveDate',
  'agPrice', 'creatorFee', 'shot', 'complete', 'detailStatus',
  'invoiceNo', 'paid', 'includesVat', 'currency', 'brandPOs', 'paymentTerms',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseColumns = (raw: unknown): ColumnDefinition[] => {
  if (!Array.isArray(raw)) return [];
  return raw as ColumnDefinition[];
};

const rowToSchema = (row: Record<string, unknown>): ColumnSchema => ({
  id: row.id as string,
  agency_id: row.agency_id as string,
  version: row.version as number,
  columns: parseColumns(row.columns),
  is_published: row.is_published as boolean,
  published_at: row.published_at as string | null,
  published_by: row.published_by as string | null,
  created_by: row.created_by as string | null,
  created_at: row.created_at as string,
  notes: row.notes as string | null,
});

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All schema versions for an agency (for the admin UI). */
export const useAgencySchemas = () => {
  const { data: agencyId } = useAgencyId();
  return useQuery({
    queryKey: ['column-schemas', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_column_schemas')
        .select('*')
        .eq('agency_id', agencyId!)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(rowToSchema);
    },
  });
};

/** The published schema columns — used by the campaign tracker grid. */
export const usePublishedSchema = () => {
  const { data: agencyId } = useAgencyId();
  return useQuery({
    queryKey: ['column-schema-published', agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_column_schemas')
        .select('*')
        .eq('agency_id', agencyId!)
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return rowToSchema(data as Record<string, unknown>);
    },
  });
};

/** Create a new draft version (copies columns from base if provided). */
export const useCreateSchema = () => {
  const { data: agencyId } = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      columns,
      notes,
    }: {
      columns: ColumnDefinition[];
      notes?: string;
    }) => {
      if (!agencyId) throw new Error('No agency');

      // Determine next version number
      const { data: existing, error: fetchErr } = await supabase
        .from('agency_column_schemas')
        .select('version')
        .eq('agency_id', agencyId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const nextVersion = existing ? (existing.version as number) + 1 : 1;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('agency_column_schemas')
        .insert({
          agency_id: agencyId,
          version: nextVersion,
          columns: columns as unknown as import('@/integrations/supabase/types').Json,
          is_published: false,
          created_by: user?.id ?? null,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToSchema(data as Record<string, unknown>);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['column-schemas', agencyId] });
    },
  });
};

/** Update the columns/notes of a draft schema. */
export const useUpdateSchema = () => {
  const { data: agencyId } = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      columns,
      notes,
    }: {
      id: string;
      columns: ColumnDefinition[];
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('agency_column_schemas')
        .update({
          columns: columns as unknown as import('@/integrations/supabase/types').Json,
          notes: notes ?? null,
        })
        .eq('id', id)
        .eq('is_published', false); // only drafts
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['column-schemas', agencyId] });
    },
  });
};

/** Publish a schema version (unpublishes all others for the same agency). */
export const usePublishSchema = () => {
  const { data: agencyId } = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schemaId: string) => {
      if (!agencyId) throw new Error('No agency');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Unpublish all other versions first
      const { error: unpubErr } = await supabase
        .from('agency_column_schemas')
        .update({ is_published: false })
        .eq('agency_id', agencyId)
        .neq('id', schemaId);
      if (unpubErr) throw unpubErr;

      // Publish the target
      const { error } = await supabase
        .from('agency_column_schemas')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          published_by: user?.id ?? null,
        })
        .eq('id', schemaId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['column-schemas', agencyId] });
      void queryClient.invalidateQueries({ queryKey: ['column-schema-published', agencyId] });
    },
  });
};

/** Delete a draft schema version. */
export const useDeleteSchema = () => {
  const { data: agencyId } = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schemaId: string) => {
      const { error } = await supabase
        .from('agency_column_schemas')
        .delete()
        .eq('id', schemaId)
        .eq('is_published', false);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['column-schemas', agencyId] });
    },
  });
};
