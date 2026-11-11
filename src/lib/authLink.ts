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

let linkError: string | null = params.get("error_code")
  ? params.get("error_description") ?? "This link is invalid or has expired."
  : null;

/** The expired/used-link error, if any. Returns it only once per page load. */
export function consumeAuthLinkError(): string | null {
  const error = linkError;
  linkError = null;
  return error;
}
