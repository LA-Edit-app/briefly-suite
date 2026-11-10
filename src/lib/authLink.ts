// Supabase email links (invite, password reset) land with their details in the
// URL hash, which the Supabase client clears once it has read the session.
// Read it here, at startup, before that happens. Import this module before
// anything that creates the Supabase client.
function readHash() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

const params = readHash();

/** "invite", "recovery", etc. when the page was opened from an email link. */
export const initialAuthLinkType: string | null = params.get("type");

/** Set when the email link was expired or already used. */
export const initialAuthLinkError: string | null = params.get("error_code")
  ? params.get("error_description")?.replace(/\+/g, " ") ?? "This link is invalid or has expired."
  : null;
