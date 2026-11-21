import { supabase as _supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// The backend currently has no tables, so the generated schema types are empty
// and every query would resolve to `never`. Keep one permissive client handle
// plus the row shapes the app actually reads, so the data layer typechecks
// against real field names instead of `never`.
export const db = _supabase as any;

export interface Campaign {
  id: string;
  agency_id: string | null;
  creator_id: string | null;
  created_by: string | null;
  brand: string;
  activity: string | null;
  launch_date: string | null;
  live_date: string | null;
  ag_price: number | null;
  creator_fee: number | null;
  shot: string | null;
  complete: string | null;
  invoice_no: string | null;
  paid: string | null;
  includes_vat: string | null;
  currency: string | null;
  brand_pos: string | null;
  payment_terms: string | null;
  campaign_status: string | null;
  completion_status: string | null;
  secondary_status: string | null;
  invoice_status: string | null;
  xero_invoice_id: string | null;
  notes: string | null;
  custom_fields: Json | null;
  campaign_comments: Json | null;
  campaign_attachments: Json | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: unknown;
}

export type CampaignInsert = Partial<Campaign>;
export type CampaignUpdate = Partial<Campaign>;

export interface ContentItem {
  id: string;
  campaign_id: string | null;
  agency_id: string | null;
  type: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  platform: string | null;
  status: string;
  due_date: string | null;
  notes: string | null;
  source: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

export type ContentItemInsert = Partial<ContentItem>;
export type ContentItemUpdate = Partial<ContentItem>;

export interface Creator {
  id: string;
  agency_id: string | null;
  created_by: string | null;
  name: string;
  handle: string | null;
  avatar: string | null;
  email: string | null;
  is_active: boolean | null;
  created_at: string | null;
  [key: string]: unknown;
}

export type CreatorInsert = Partial<Creator>;
export type CreatorUpdate = Partial<Creator>;

export interface Platform {
  id: string;
  name: string;
  icon: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

export type PlatformInsert = Partial<Platform>;

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  agency_id: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

export type ProfileUpdate = Partial<Profile>;

export interface Task {
  id: string;
  agency_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  sort_order: number | null;
  completed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: unknown;
}

export type TaskInsert = Partial<Task>;
export type TaskUpdate = Partial<Task>;

export interface Notification {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  type: string;
  title: string;
  message: string;
  data: Json | null;
  read: boolean | null;
  created_at: string | null;
  [key: string]: unknown;
}

export type NotificationInsert = Partial<Notification>;
export type NotificationUpdate = Partial<Notification>;

export interface AgencyMemberRow {
  agency_id: string;
  user_id: string;
  role: string;
  linked_creator_id: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

export interface AgencyRow {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string | null;
  [key: string]: unknown;
}
