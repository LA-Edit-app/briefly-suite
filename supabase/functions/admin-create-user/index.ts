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

    // Verify caller is a platform admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isPlatformAdmin } = await userClient.rpc("is_platform_admin");
    if (!isPlatformAdmin) throw new Error("Only platform admins can create users");

    const { agencyId, email, firstName, lastName, role: requestedRole } = await req.json();
    const role = LEGACY_ROLES[requestedRole] ?? requestedRole;
    // No user without an agency and a role (#52).
    if (!agencyId || !email) throw new Error("Choose an agency and enter an email");
    if (!["admin", "talent_manager", "creator"].includes(role)) {
      throw new Error("Choose a role: Admin, Talent Manager or Creator");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // One email = one account = one agency (#52).
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, agency_members(agency_id, agencies(name))")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      const memberships = (existingProfile.agency_members ?? []) as {
        agency_id: string;
        agencies: { name: string } | { name: string }[] | null;
      }[];
      if (memberships.some((m) => m.agency_id === agencyId)) {
        throw new Error("This person is already a member of this agency.");
      }
      if (memberships.length > 0) {
        const other = memberships[0].agencies;
        const name = (Array.isArray(other) ? other[0]?.name : other?.name) ?? "another agency";
        throw new Error(`${normalizedEmail} already belongs to ${name}. Each email can only be in one agency, so use a different email.`);
      }

      // An account with no agency (removed earlier): add it to this agency.
      const { error: memberError } = await adminClient
        .from("agency_members")
        .insert({ agency_id: agencyId, user_id: existingProfile.id, role });
      if (memberError) throw memberError;
      await adminClient.from("profiles").update({ agency_id: agencyId }).eq("id", existingProfile.id);

      return new Response(
        JSON.stringify({ status: "added" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // New user — create an invitation record so handle_new_profile_agency
    // assigns them to this agency when they complete sign-up
    const { error: inviteError } = await adminClient
      .from("agency_invitations")
      .insert({
        agency_id: agencyId,
        email: normalizedEmail,
        role,
        invited_by: user.id,
      });

    if (inviteError) throw inviteError;

    const { data: agency } = await adminClient
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .maybeSingle();

    const appUrl = Deno.env.get("APP_URL") ?? supabaseUrl;

    const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${appUrl}/auth`,
        data: {
          invited_to_agency: agencyId,
          agency_name: agency?.name ?? "",
          invited_role: role,
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          // The invite link signs them in with a random password; the app
          // asks them to create their own first.
          needs_password: true,
        },
      },
    );

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
