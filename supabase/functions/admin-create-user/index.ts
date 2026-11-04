import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { agencyId, email, firstName, lastName, role = "member" } = await req.json();
    if (!agencyId || !email) throw new Error("agencyId and email are required");

    const normalizedEmail = email.toLowerCase().trim();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a profile already exists for this email
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // User already has an account — add them directly to this agency
      const { error: memberError } = await adminClient
        .from("agency_members")
        .insert({ agency_id: agencyId, user_id: existingProfile.id, role });

      if (memberError) {
        if (memberError.code === "23505") {
          throw new Error("This user is already a member of this agency.");
        }
        throw memberError;
      }

      // Update their profile's agency_id if they don't have one
      await adminClient
        .from("profiles")
        .update({ agency_id: agencyId })
        .eq("id", existingProfile.id)
        .is("agency_id", null);

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
