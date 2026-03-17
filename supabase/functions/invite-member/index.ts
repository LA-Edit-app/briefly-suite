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

    // User-scoped client to verify the caller and their admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("is_agency_admin");
    if (!isAdmin) throw new Error("Only admins can invite members");

    const { agencyId, email, role = "member" } = await req.json();
    if (!agencyId || !email) throw new Error("Missing agencyId or email");

    const normalizedEmail = email.toLowerCase().trim();

    // Service-role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a profile already exists for this email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      // User already has an account — add them directly
      const { error: memberError } = await adminClient
        .from("agency_members")
        .insert({ agency_id: agencyId, user_id: profile.id, role });

      if (memberError) {
        if (memberError.code === "23505") {
          throw new Error("This user is already a member of your agency.");
        }
        throw memberError;
      }

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
      data: { invited_to_agency: agencyId, invited_role: role },
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
