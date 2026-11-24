/**
 * Agency roles (#52):
 *   admin          runs the agency; an agency can have several
 *   talent_manager manages creators and campaigns
 *   creator        the talent; sees only their own campaigns
 */
export const AGENCY_ROLES = ["admin", "talent_manager", "creator"] as const;
export type AgencyRole = (typeof AGENCY_ROLES)[number];

export const ROLE_LABELS: Record<AgencyRole, string> = {
  admin: "Admin",
  talent_manager: "Talent Manager",
  creator: "Creator",
};

export const ROLE_OPTIONS = AGENCY_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

/** Label for any stored role, including pre-#52 values. */
export function roleLabel(role: string | null | undefined): string {
  if (role === "owner") return ROLE_LABELS.admin;
  if (role === "member") return ROLE_LABELS.talent_manager;
  return ROLE_LABELS[role as AgencyRole] ?? role ?? "";
}

export const isAgencyRole = (value: string): value is AgencyRole =>
  (AGENCY_ROLES as readonly string[]).includes(value);

/**
 * Who sees "View all campaigns" in the Campaign Tracker (#51). Admins only
 * for now; this is the one place to change if it becomes an agency setting.
 */
export const canViewAllCampaigns = (role: string | null | undefined): boolean => role === "admin";
