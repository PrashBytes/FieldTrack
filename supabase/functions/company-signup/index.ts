import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { company_name, full_name, email, password } = body;

    if (!company_name || !full_name || !email || !password) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message.includes("already") || authError.message.includes("exists")) {
        return new Response(JSON.stringify({ error: "An account with this email already exists" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Generate a unique slug from company name
    const baseSlug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org";
    const slug = `${baseSlug}-${userId.slice(0, 8)}`;

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: company_name, slug, is_active: true })
      .select("id")
      .single();

    if (orgError) {
      // Clean up the auth user if org creation fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create organization" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the profile as company_admin
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        organization_id: org.id,
        email,
        full_name,
        role: "company_admin",
        is_active: true,
      });

    if (profileError) {
      // Clean up
      await supabase.from("organizations").delete().eq("id", org.id);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a default shift
    const { data: shift } = await supabase
      .from("shifts")
      .insert({
        organization_id: org.id,
        name: "Standard Day Shift",
        start_time: "09:00",
        end_time: "17:00",
        grace_minutes: 15,
        is_active: true,
      })
      .select("id")
      .single();

    if (shift) {
      await supabase
        .from("organizations")
        .update({ default_shift_id: shift.id })
        .eq("id", org.id);
    }

    return new Response(JSON.stringify({
      success: true,
      organization_id: org.id,
      user_id: userId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
