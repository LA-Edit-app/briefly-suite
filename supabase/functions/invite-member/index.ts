import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Older app versions send the pre-#52 role names.
const LEGACY_ROLES: Record<string, string> = { owner: "admin", member: "talent_manager" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client to verify the caller and their admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("is_agency_admin");
    if (!isAdmin) throw new Error("Only admins can invite members");

    const { agencyId, email, role: requestedRole } = await req.json();
    const role = LEGACY_ROLES[requestedRole] ?? requestedRole ?? "talent_manager";
    if (!agencyId || !email) throw new Error("Missing agencyId or email");
    if (!["admin", "talent_manager", "creator"].includes(role)) {
      throw new Error("Choose a role: Admin, Talent Manager or Creator");
    }

    // is_agency_admin() only covers the caller's own agency, so the target
    // agency must be that same agency (#25).
    const { data: callerAgencyId, error: agencyError } = await userClient.rpc("current_agency_id");
    if (agencyError || !callerAgencyId || callerAgencyId !== agencyId) {
      throw new Error("You can only invite members to your own agency");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Service-role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // One email = one account = one agency (#52).
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, agency_members(agency_id)")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      const memberships = (profile.agency_members ?? []) as { agency_id: string }[];
      if (memberships.some((m) => m.agency_id === agencyId)) {
        throw new Error("This person is already a member of your agency.");
      }
      if (memberships.length > 0) {
        // Don't reveal which agency: it belongs to another customer.
        throw new Error("This email is already used by another Briefly agency. Please use a different email address.");
      }

      // An account with no agency (removed earlier): add it back here.
      const { error: memberError } = await adminClient
        .from("agency_members")
        .insert({ agency_id: agencyId, user_id: profile.id, role });
      if (memberError) throw memberError;
      await adminClient.from("profiles").update({ agency_id: agencyId }).eq("id", profile.id);

      return new Response(
        JSON.stringify({ status: "added" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // No account found — create an invitation record and send the invite email
    const { error: inviteInsertError } = await adminClient
      .from("agency_invitations")
      .insert({ agency_id: agencyId, email: normalizedEmail, role, invited_by: user.id });

    if (inviteInsertError) throw inviteInsertError;

    const appUrl = Deno.env.get("APP_URL") ?? supabaseUrl;

    const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${appUrl}/auth`,
      data: { invited_to_agency: agencyId, invited_role: role, needs_password: true },
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ status: "invited" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
