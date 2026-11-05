import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GoTrue has no "forever" ban; 100 years is the conventional stand-in.
const SUSPEND_DURATION = "876000h";

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
    if (!isPlatformAdmin) throw new Error("Only platform admins can suspend accounts");

    const { userId, suspended } = await req.json();
    if (!userId || typeof suspended !== "boolean") {
      throw new Error("userId and suspended are required");
    }
    if (userId === caller.id) throw new Error("You cannot suspend your own account");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: target } = await adminClient
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", userId)
      .maybeSingle();

    if (target?.is_platform_admin) {
      throw new Error("Platform admin accounts cannot be suspended here");
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: suspended ? SUSPEND_DURATION : "none",
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({ status: suspended ? "suspended" : "active" }),
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
