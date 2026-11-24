import { errorMessage } from "@/lib/errors";

export const AGENCY_NAME_TAKEN = "An agency with this name already exists. Please choose a different name.";

/** Friendly text for a failed create/rename of an agency (names are unique, #52). */
export function agencyNameError(error: unknown): string {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  const message = errorMessage(error);
  if (code === "23505" || message.includes("agencies_name_unique")) return AGENCY_NAME_TAKEN;
  return message || "Could not save the agency name";
}
