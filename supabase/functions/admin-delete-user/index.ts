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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) throw new Error("Unauthorized");

    const { data: isPlatformAdmin } = await userClient.rpc("is_platform_admin");
    if (!isPlatformAdmin) throw new Error("Only platform admins can delete accounts");

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");
    if (userId === caller.id) throw new Error("You cannot delete your own account");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: target } = await adminClient
      .from("profiles")
      .select("id, email, is_platform_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!target) throw new Error("User not found");
    if (target.is_platform_admin) throw new Error("Platform admin accounts cannot be deleted here");

    const { data: ownedAgencies } = await adminClient
      .from("agencies")
      .select("name")
      .eq("owner_id", userId);

    if (ownedAgencies && ownedAgencies.length > 0) {
      const names = ownedAgencies.map((a) => a.name).join(", ");
      throw new Error(`This user owns ${names}. Agency owners cannot be deleted.`);
    }

    if (target.email) {
      await adminClient
        .from("agency_invitations")
        .delete()
        .eq("email", target.email.toLowerCase());
    }

    // Cascades to profiles → agency_members and notifications; authorship
    // columns elsewhere are ON DELETE SET NULL.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ status: "deleted" }),
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
